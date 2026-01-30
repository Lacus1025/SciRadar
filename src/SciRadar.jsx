import React, { useState, useEffect, useRef } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import {
  Settings, Download, RefreshCw, Type, Palette, Layout, FileText, Info,
  Image, FileImage, FileType, Printer, Share2, Copy
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import domtoimage from 'dom-to-image';

/**
 * SciRadar - A Scientific Radar Chart Generator with Export Features
 */

// --- Default Data & Constants ---
const DEFAULT_INPUT = `Model\tMME\tPOPE\tMM-Vet\tVizWiz\tLLaVA-Bench
MemVR\t1896\t86.3\t56.7\t65.2\t70.5
LLaVA-1.5\t1500\t80.1\t40.5\t50.0\t60.2
OPERA\t1600\t82.5\t45.0\t55.1\t62.8`;

const DEFAULT_COLORS = [
  '#34a853', // Google Green
  '#ea4335', // Red
  '#4285f4', // Blue
  '#fbbc05', // Yellow
  '#8e44ad', // Purple
  '#2c3e50', // Dark Blue
  '#e67e22', // Orange
];

const FONTS = [
  { name: 'Sans-Serif (Arial)', value: 'font-sans', css: "'Segoe UI', Roboto, 'Helvetica Neue', Arial" },
  { name: 'Serif (Times New Roman)', value: 'font-serif', css: "'Times New Roman', Times, serif" },
  { name: 'Monospace (Courier)', value: 'font-mono', css: "'Courier New', Courier, monospace" },
];

// 添加导出格式选项
const EXPORT_FORMATS = [
  { id: 'png', name: 'PNG 图片', icon: Image, desc: '高质量位图，适合论文插入' },
  { id: 'svg', name: 'SVG 矢量图', icon: FileType, desc: '无限缩放不失真，适合演示文稿' },
  { id: 'pdf', name: 'PDF 文档', icon: FileImage, desc: '包含图表和数据的完整报告' },
  { id: 'clipboard', name: '复制到剪贴板', icon: Copy, desc: '快速粘贴到其他文档' }
];

// --- Helper Functions ---
const parseData = (text) => {
  const firstLine = text.trim().split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  const rows = text.trim().split('\n').map(row => row.split(delimiter).map(cell => cell.trim()));

  if (rows.length < 2) return null;

  const headers = rows[0];
  const dataRows = rows.slice(1);
  const dimensions = headers.slice(1);
  const models = dataRows.map(row => row[0]);

  const chartData = dimensions.map((dim, dimIndex) => {
    const dataPoint = { subject: dim };
    dataRows.forEach((row) => {
      const modelName = row[0];
      const val = parseFloat(row[dimIndex + 1]);
      dataPoint[modelName] = isNaN(val) ? 0 : val;
    });
    return dataPoint;
  });

  return { chartData, models, rawData: text };
};

// --- 导出功能工具函数 ---
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// --- Main Component ---
export default function SciRadar() {
  // State
  const [inputText, setInputText] = useState(DEFAULT_INPUT);
  const [parsedData, setParsedData] = useState(null);
  const [models, setModels] = useState([]);

  // Customization State
  const [title, setTitle] = useState('Model Performance Comparison');
  const [selectedFont, setSelectedFont] = useState('font-sans');
  const [fontSize, setFontSize] = useState(12);
  const [opacity, setOpacity] = useState(0.2);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showDots, setShowDots] = useState(true);
  const [customColors, setCustomColors] = useState({});
  const [gridType, setGridType] = useState('polygon');

  // 导出状态
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('png');
  const [exportQuality, setExportQuality] = useState('high'); // high, medium, low
  const [includeData, setIncludeData] = useState(true);
  const [exportSize, setExportSize] = useState('original'); // original, a4, slide

  const chartRef = useRef(null);
  const exportModalRef = useRef(null);

  // Effect: Parse data on input change
  useEffect(() => {
    try {
      const result = parseData(inputText);
      if (result) {
        setParsedData(result.chartData);
        setModels(result.models);

        const newColors = { ...customColors };
        result.models.forEach((m, i) => {
          if (!newColors[m]) {
            newColors[m] = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          }
        });
        setCustomColors(newColors);
      }
    } catch (e) {
      console.error("Parsing error", e);
    }
  }, [inputText]);

  // Handlers
  const handleColorChange = (model, color) => {
    setCustomColors(prev => ({ ...prev, [model]: color }));
  };

  // --- 导出功能函数 ---
  const exportChart = async () => {
    if (!chartRef.current || exporting) return;

    setExporting(true);

    try {
      const chartElement = chartRef.current;
      const options = {
        backgroundColor: '#ffffff',
        scale: getExportScale(),
        useCORS: true,
        logging: false,
      };

      switch (exportFormat) {
        case 'png':
          await exportAsPNG(chartElement, options);
          break;
        case 'svg':
          await exportAsSVG(chartElement);
          break;
        case 'pdf':
          await exportAsPDF(chartElement, options);
          break;
        case 'clipboard':
          await copyToClipboard(chartElement, options);
          break;
      }

      showToast(`图表已成功导出为 ${EXPORT_FORMATS.find(f => f.id === exportFormat)?.name}`);
    } catch (error) {
      console.error('导出失败:', error);
      showToast('导出失败，请重试', 'error');
    } finally {
      setExporting(false);
    }
  };

  const getExportScale = () => {
    const scales = {
      high: 3,
      medium: 2,
      low: 1
    };
    return scales[exportQuality] || 2;
  };

  const getExportDimensions = () => {
    const sizes = {
      original: { width: 800, height: 600 },
      a4: { width: 1240, height: 1754 },
      slide: { width: 1920, height: 1080 }
    };
    return sizes[exportSize] || sizes.original;
  };

  const exportAsPNG = async (element, options) => {
    const canvas = await html2canvas(element, options);
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, `SciRadar_${Date.now()}.png`);
      }
    }, 'image/png');
  };

  const exportAsSVG = async (element) => {
    const svgData = await domtoimage.toSvg(element, {
      quality: getExportScale() * 0.8,
      style: {
        transform: 'scale(' + getExportScale() + ')',
        transformOrigin: 'top left'
      }
    });

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, `SciRadar_${Date.now()}.svg`);
  };

  const exportAsPDF = async (element, options) => {
    // 先导出为 PNG
    const canvas = await html2canvas(element, options);

    // 创建 PDF
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: exportSize === 'a4' ? 'a4' : 'letter'
    });

    // 添加图表
    const imgData = canvas.toDataURL('image/png');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight - 20);

    // 添加标题和元数据
    pdf.setFontSize(20);
    pdf.text(title, pdfWidth / 2, 15, { align: 'center' });

    pdf.setFontSize(10);
    pdf.text(`Generated by SciRadar - ${new Date().toLocaleString()}`, 10, pdfHeight + 10);

    // 如果包含数据，添加数据表格
    if (includeData && parsedData) {
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('原始数据', 20, 20);

      pdf.setFontSize(10);
      const lines = inputText.split('\n');
      lines.forEach((line, index) => {
        pdf.text(line, 20, 30 + (index * 6));
      });
    }

    pdf.save(`SciRadar_${Date.now()}.pdf`);
  };

  const copyToClipboard = async (element, options) => {
    const canvas = await html2canvas(element, options);
    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob
            })
          ]);
          showToast('图表已复制到剪贴板', 'success');
        } catch (err) {
          // 降级方案：使用 data URL
          canvas.toBlob((blob) => {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]);
          });
        }
      }
    }, 'image/png');
  };

  const showToast = (message, type = 'success') => {
    // 创建并显示 toast 通知
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  const openExportModal = () => {
    exportModalRef.current?.showModal();
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-slate-800 flex flex-col ${selectedFont}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2 rounded-xl">
            <RefreshCw size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">SciRadar <span className="text-sm font-normal text-gray-500 ml-2">科研雷达图生成器</span></h1>
            <p className="text-xs text-gray-400">支持 Excel/CSV 数据导入，一键导出高质量图表</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openExportModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Download size={16} />
            <span>导出图表</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel: Configuration & Data */}
        <div className="w-full lg:w-1/3 bg-white border-r border-gray-200 overflow-y-auto p-6 flex flex-col gap-8 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">

          {/* Data Input Section */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
              <FileText size={18} />
              <h2>数据输入 (Excel/CSV)</h2>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              直接从 Excel 复制并粘贴。第一行应为指标名称，第一列为模型名称。
            </p>
            <textarea
              className="w-full h-48 p-3 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y bg-white/50 backdrop-blur-sm"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Model&#9;MME&#9;POPE&#10;MyModel&#9;1800&#9;85&#10;Baseline&#9;1600&#9;80"
            />
          </section>

          {/* Style Customization Section */}
          <section className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-indigo-700 font-semibold">
              <Settings size={18} />
              <h2>图表设置</h2>
            </div>

            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">图表标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Font Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Type size={12} /> 字体风格
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {FONTS.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                </select>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">字号 ({fontSize}px)</label>
                  <input
                    type="range" min="8" max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">填充透明度 ({Math.round(opacity * 100)}%)</label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">线条粗细 ({strokeWidth}px)</label>
                  <input
                    type="range" min="1" max="5"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showDots}
                    onChange={(e) => setShowDots(e.target.checked)}
                    className="rounded accent-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-700">显示数据点</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gridType === 'circle'}
                    onChange={(e) => setGridType(e.target.checked ? 'circle' : 'polygon')}
                    className="rounded accent-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-700">圆形网格</span>
                </label>
              </div>
            </div>
          </section>

          {/* Color Customization */}
          <section className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center gap-2 mb-3 text-purple-700 font-semibold">
              <Palette size={18} />
              <h2>系列配色</h2>
            </div>
            <div className="space-y-2">
              {models.map(model => (
                <div key={model} className="flex items-center justify-between bg-white/50 p-2 rounded-lg">
                  <span className="text-sm text-gray-600 truncate max-w-[120px]" title={model}>{model}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: customColors[model] || DEFAULT_COLORS[0] }}
                    />
                    <input
                      type="color"
                      value={customColors[model] || DEFAULT_COLORS[0]}
                      onChange={(e) => handleColorChange(model, e.target.value)}
                      className="h-8 w-14 rounded cursor-pointer border-0 p-0"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-auto bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-start gap-2">
              <Info size={18} className="text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">导出提示</p>
                <p className="text-xs text-blue-600">
                  • PNG: 适合论文和报告<br/>
                  • SVG: 无限缩放不失真<br/>
                  • PDF: 包含完整数据和图表<br/>
                  • 高质量模式适合打印
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="w-full lg:w-2/3 bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center p-8 overflow-auto">
          <div
            className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-5xl aspect-square flex flex-col border border-gray-200"
            ref={chartRef}
          >
            {/* Chart Title */}
            {title && (
              <h2 className="text-center font-bold mb-6 text-slate-800" style={{ fontSize: `${fontSize + 6}px` }}>
                {title}
              </h2>
            )}

            {/* The Chart */}
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={parsedData}>
                  <PolarGrid gridType={gridType} stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#475569', fontSize: fontSize, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fontSize: fontSize - 2 }} />

                  {models.map((model) => (
                    <Radar
                      key={model}
                      name={model}
                      dataKey={model}
                      stroke={customColors[model] || DEFAULT_COLORS[0]}
                      strokeWidth={strokeWidth}
                      fill={customColors[model] || DEFAULT_COLORS[0]}
                      fillOpacity={opacity}
                      dot={showDots ? { r: 3, fillOpacity: 1 } : false}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  ))}

                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: `${fontSize}px` }}
                    iconSize={fontSize + 4}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)'
                    }}
                    formatter={(value) => [value.toFixed(2), '得分']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Footer */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
              <span>SciRadar • {new Date().toLocaleDateString()}</span>
              <span>{models.length} 个模型 • {parsedData?.length || 0} 个维度</span>
            </div>
          </div>
        </div>
      </main>

      {/* 导出模态框 */}
      <dialog ref={exportModalRef} className="rounded-xl shadow-2xl backdrop:bg-black/30 backdrop:backdrop-blur-sm border border-gray-200 p-0 w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">导出图表</h3>
            <button
              onClick={() => exportModalRef.current?.close()}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* 导出格式选择 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_FORMATS.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setExportFormat(format.id)}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      exportFormat === format.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs font-medium mt-1">{format.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 导出选项 */}
          <div className="space-y-4">
            {/* 质量选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">导出质量</label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map((quality) => (
                  <button
                    key={quality}
                    onClick={() => setExportQuality(quality)}
                    className={`flex-1 py-2 text-sm rounded-md ${
                      exportQuality === quality
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {quality === 'low' ? '普通' : quality === 'medium' ? '中等' : '高质量'}
                  </button>
                ))}
              </div>
            </div>

            {/* 尺寸选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">导出尺寸</label>
              <select
                value={exportSize}
                onChange={(e) => setExportSize(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              >
                <option value="original">原始尺寸</option>
                <option value="a4">A4 纸张</option>
                <option value="slide">演示文稿 (16:9)</option>
              </select>
            </div>

            {/* 额外选项 */}
            {exportFormat === 'pdf' && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeData}
                  onChange={(e) => setIncludeData(e.target.checked)}
                  className="rounded accent-indigo-600"
                />
                <span className="text-sm text-gray-700">包含原始数据表格</span>
              </label>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={() => exportModalRef.current?.close()}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => {
                exportChart();
                exportModalRef.current?.close();
              }}
              disabled={exporting}
              className="flex-1 py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  导出中...
                </>
              ) : (
                <>
                  <Download size={16} />
                  立即导出
                </>
              )}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
