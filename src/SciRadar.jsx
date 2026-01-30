import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Settings, Download, RefreshCw, Type, Palette, Layout, FileText, Info } from 'lucide-react';

/**
 * SciRadar - A Scientific Radar Chart Generator
 * * Features:
 * - Paste data directly from Excel (TSV) or CSV.
 * - Automatic data transposition (Row-based models to Dimension-based axes).
 * - Full customization of fonts, colors, and layout.
 * - Export to PNG.
 */

// --- Default Data & Constants ---

const DEFAULT_INPUT = `Model\tMME\tPOPE\tMM-Vet\tVizWiz\tLLaVA-Bench
MemVR\t1896\t86.3\t56.7\t65.2\t70.5
LLaVA-1.5\t1500\t80.1\t40.5\t50.0\t60.2
OPERA\t1600\t82.5\t45.0\t55.1\t62.8`;

const DEFAULT_COLORS = [
  '#34a853', // Google Green (often used in the example)
  '#ea4335', // Red
  '#4285f4', // Blue
  '#fbbc05', // Yellow
  '#8e44ad', // Purple
  '#2c3e50', // Dark Blue
  '#e67e22', // Orange
];

const FONTS = [
  { name: 'Sans-Serif (Arial)', value: 'font-sans' },
  { name: 'Serif (Times New Roman)', value: 'font-serif' },
  { name: 'Monospace (Courier)', value: 'font-mono' },
];

// --- Helper Functions ---

const parseData = (text) => {
  // Determine delimiter (Tab for Excel paste, Comma for CSV)
  const firstLine = text.trim().split('\n')[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const rows = text.trim().split('\n').map(row => row.split(delimiter).map(cell => cell.trim()));

  if (rows.length < 2) return null;

  const headers = rows[0]; // ["Model", "MME", "POPE", ...]
  const dataRows = rows.slice(1);

  // We need to transpose:
  // From: [ModelName, Score1, Score2...]
  // To: [{ subject: "MME", ModelA: 100, ModelB: 90 }, { subject: "POPE", ... }]

  const dimensions = headers.slice(1); // ["MME", "POPE", ...]
  const models = dataRows.map(row => row[0]); // ["MemVR", "LLaVA-1.5", ...]

  const chartData = dimensions.map((dim, dimIndex) => {
    const dataPoint = { subject: dim };
    // Find max value for this dimension to normalize if needed (not doing normalization here to keep raw values visible)
    // But for radar charts with vastly different scales (e.g. MME=2000 vs POPE=100),
    // we ideally need normalization. For simplicity in this UI, we assume user might handle or we plot raw.
    // *Self-correction*: The example image likely normalizes or uses multiple axes.
    // Standard Recharts Radar uses one radius axis. If scales differ wildly, the small ones disappear.
    // We will map raw values for now.

    dataRows.forEach((row) => {
      const modelName = row[0];
      const val = parseFloat(row[dimIndex + 1]);
      dataPoint[modelName] = isNaN(val) ? 0 : val;
    });

    return dataPoint;
  });

  return { chartData, models };
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
  const [gridType, setGridType] = useState('polygon'); // polygon or circle

  const chartRef = useRef(null);

  // Effect: Parse data on input change
  useEffect(() => {
    try {
      const result = parseData(inputText);
      if (result) {
        setParsedData(result.chartData);
        setModels(result.models);

        // Initialize colors if new models appear
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

  const downloadChart = () => {
    // A simple way to trigger a print dialog or we could implement html2canvas.
    // For this environment, window.print() is safest or just let user screenshot.
    // We'll show a toast or info.
    alert("提示：请使用截图工具 (Win+Shift+S 或 Mac Cmd+Shift+4) 来获取最高清晰度的图像用于论文。\n\nTip: Please use your system's screenshot tool for the highest resolution image.");
  };

  return (
    <div className={`min-h-screen bg-gray-50 text-slate-800 flex flex-col ${selectedFont}`}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <RefreshCw size={20} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">SciRadar <span className="text-sm font-normal text-gray-500 ml-2">科研雷达图生成器</span></h1>
        </div>
        <button
          onClick={downloadChart}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
        >
          <Download size={16} />
          <span>导出/截图</span>
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Left Panel: Configuration & Data */}
        <div className="w-full lg:w-1/3 bg-white border-r border-gray-200 overflow-y-auto p-6 flex flex-col gap-8 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">

          {/* Data Input Section */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
              <FileText size={18} />
              <h2>数据输入 (Excel/CSV)</h2>
            </div>
            <p className="text-xs text-gray-500 mb-2">
              直接从 Excel 复制并粘贴。第一行应为指标名称，第一列为模型名称。
            </p >
            <textarea
              className="w-full h-48 p-3 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y bg-slate-50"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Model&#9;MME&#9;POPE&#10;MyModel&#9;1800&#9;85&#10;Baseline&#9;1600&#9;80"
            />
          </section>

          {/* Style Customization Section */}
          <section>
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
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
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
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
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
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-700">显示数据点</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                   <input
                    type="checkbox"
                    checked={gridType === 'circle'}
                    onChange={(e) => setGridType(e.target.checked ? 'circle' : 'polygon')}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-700">圆形网格</span>
                </label>
              </div>

            </div>
          </section>

          {/* Color Customization */}
          <section>
             <div className="flex items-center gap-2 mb-3 text-indigo-700 font-semibold">
              <Palette size={18} />
              <h2>系列配色</h2>
            </div>
            <div className="space-y-2">
              {models.map(model => (
                <div key={model} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate max-w-[120px]" title={model}>{model}</span>
                  <input
                    type="color"
                    value={customColors[model] || '#000000'}
                    onChange={(e) => handleColorChange(model, e.target.value)}
                    className="h-8 w-14 rounded cursor-pointer border-0 p-0"
                  />
                </div>
              ))}
            </div>
          </section>

          <div className="mt-auto bg-blue-50 p-3 rounded-lg text-xs text-blue-800 flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0" />
            <p>
              <strong>小贴士：</strong> 如果不同指标的数值差异巨大（例如 MME 2000分 vs POPE 100分），建议在 Excel 中先将数据归一化（Normalize）到 0-100 区间，否则小数值的指标会在图上缩成一点。
            </p >
          </div>

        </div>

        {/* Right Panel: Preview */}
        <div className="w-full lg:w-2/3 bg-slate-100 flex items-center justify-center p-8 overflow-auto">
          <div
            className="bg-white p-8 rounded-xl shadow-lg w-full max-w-3xl aspect-square flex flex-col"
            ref={chartRef}
          >
            {/* Chart Title */}
            {title && (
              <h2 className="text-center font-bold mb-4 text-slate-800" style={{ fontSize: `${fontSize + 6}px` }}>
                {title}
              </h2>
            )}

            {/* The Chart */}
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={parsedData}>
                  <PolarGrid gridType={gridType} />
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
                      stroke={customColors[model]}
                      strokeWidth={strokeWidth}
                      fill={customColors[model]}
                      fillOpacity={opacity}
                      dot={showDots ? { r: 3, fillOpacity: 1 } : false}
                      activeDot={{ r: 6 }}
                    />
                  ))}

                  <Legend
                    wrapperStyle={{ paddingTop: '20px', fontSize: `${fontSize}px` }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
