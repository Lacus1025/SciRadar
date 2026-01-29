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
  const [gridType, setGridType] = useState('polygon');

  const chartRef = useRef(null);

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

  const handleColorChange = (model, color) => {
    setCustomColors(prev => ({ ...prev, [model]: color }));
  };

  const downloadChart = () => {
    alert("提示：请使用截图工具 (Win+Shift+S 或 Mac Cmd+Shift+4) 来获取最高清晰度的图像用于论文。\n\nTip: Please use your system's screenshot tool for the highest resolution image.");
  };

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://d3js.org/d3.v7.min.js';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="header">
      <div className="header-left">
        <div className="header-icon">
          <i className="fas fa-sync-alt"></i>
        </div>
        <div>
          <span className="header-title">SciRadar</span>
          <span className="header-subtitle">科研雷达图生成器</span>
        </div>
      </div>
      <button className="download-btn" id="downloadBtn">
        <i className="fas fa-download"></i>
        <span>导出/截图</span>
      </button>
    </div>
  );
}
                <!-- 数据输入 -->
                <section>
                    <div class="section-title">
                        <i class="fas fa-file-alt"></i>
                        <h2>数据输入 (Excel/CSV)</h2>
                    </div>
                    <p class="section-note">
                        直接从 Excel 复制并粘贴。第一行应为指标名称，第一列为模型名称。
                    </p>
                    <textarea class="data-textarea" id="dataInput" rows="8">
    Model	MME	POPE	MM-Vet	VizWiz	LLaVA-Bench
    MemVR	1896	86.3	56.7	65.2	70.5
    LLaVA-1.5	1500	80.1	40.5	50.0	60.2
    OPERA	1600	82.5	45.0	55.1	62.8
                    </textarea>
                </section>


                <section>
                    <div class="section-title">
                        <i class="fas fa-ruler-combined"></i>
                        <h2>维度设置</h2>
                    </div>
                    <div class="control-group">
                        <label class="control-label">每个维度的最小值和最大值 (勾选"反向"可使内环值大于外环值)</label>
                        <div class="dimension-controls" id="dimensionControls">
                            <!-- 动态生成维度控制项 -->
                        </div>
                    </div>
                    <div class="control-group">
                        <div class="checkbox-group">
                            <input type="checkbox" id="autoScale" checked>
                            <label class="checkbox-label" for="autoScale">自动计算最小值和最大值 (勾选后将忽略上方设置)</label>
                        </div>
                    </div>
                </section>
                <section>
                    <div class="section-title">
                        <i class="fas fa-cog"></i>
                        <h2>图表设置</h2>
                    </div>
                    <div class="control-group">
                        <label class="control-label">图表标题</label>
                        <input type="text" class="control-input" id="chartTitle" value="Model Performance Comparison">
                    </div>
                    <div class="control-group">
                        <label class="control-label">字体风格</label>
                        <select class="control-input" id="fontSelect">
                            <option value="font-sans">Sans-Serif (Arial)</option>
                            <option value="font-serif">Serif (Times New Roman)</option>
                            <option value="font-mono">Monospace (Courier)</option>
                        </select>
                    </div>
                    <div class="control-group">
                        <div class="slider-group">
                            <span class="slider-label">字号: <span id="fontSizeValue">12</span>px</span>
                            <input type="range" min="8" max="24" value="12" class="slider" id="fontSizeSlider">
                        </div>
                    </div>
                    <div class="control-group">
                        <div class="slider-group">
                            <span class="slider-label">刻度数字: <span id="tickFontSizeValue">10</span>px</span>
                            <input type="range" min="6" max="18" value="10" class="slider" id="tickFontSizeSlider">
                        </div>
                    </div>
                    <div class="control-group">
                        <div class="slider-group">
                            <span class="slider-label">填充透明度: <span id="opacityValue">20</span>%</span>
                            <input type="range" min="0" max="1" step="0.1" value="0.2" class="slider" id="opacitySlider">
                        </div>
                    </div>
                    <div class="control-group">
                        <div class="slider-group">
                            <span class="slider-label">线条粗细: <span id="strokeWidthValue">2</span>px</span>
                            <input type="range" min="1" max="5" value="2" class="slider" id="strokeWidthSlider">
                        </div>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="showDots" checked>
                        <label class="checkbox-label" for="showDots">显示数据点</label>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="circularGrid">
                        <label class="checkbox-label" for="circularGrid">圆形网格</label>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="showAxisNumbers" checked>
                        <label class="checkbox-label" for="showAxisNumbers">显示坐标轴数字</label>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="integerTicks" checked>
                        <label class="checkbox-label" for="integerTicks">整数刻度值</label>
                    </div>
                </section>
                <section>
                    <div class="section-title">
                        <i class="fas fa-palette"></i>
                        <h2>系列配色</h2>
                    </div>
                    <div class="color-pickers" id="colorPickers">
                    </div>
                </section>
                <div class="tip-box">
                    <i class="fas fa-info-circle tip-icon"></i>
                    <p>
                        <strong>小贴士：</strong> 如果不同指标的数值差异巨大（例如 MME 2000分 vs POPE 100分），建议在 Excel 中先将数据归一化（Normalize）到 0-100 区间，否则小数值的指标会在图上缩成一点。
                    </p>
                </div>
            </div>

            <!-- 右侧图表面板 -->
            <div class="chart-panel">
                <div class="chart-container" id="chartContainer">
                    <h2 class="chart-title" id="chartTitleDisplay">Model Performance Comparison</h2>
                    <div class="chart-svg-container">
                        <svg id="radarChart" width="100%" height="100%"></svg>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // 默认颜色
            const DEFAULT_COLORS = [
                '#34a853', '#ea4335', '#4285f4', '#fbbc05', '#8e44ad', '#2c3e50', '#e67e22'
            ];

            // 全局状态
            let chartData = [];
            let models = [];
            let dimensions = [];
            let colors = {};
            let dimensionConfig = {}; // 存储每个维度的配置 {subject: {min, max, unit, reverse}}

            let config = {
                title: 'Model Performance Comparison',
                fontFamily: 'font-sans',
                fontSize: 12,
                tickFontSize: 10,
                opacity: 0.2,
                strokeWidth: 2,
                showDots: true,
                circularGrid: false,
                autoScale: true,
                showAxisNumbers: true,
                integerTicks: true
            };

            // 解析数据
            function parseData(text) {
                const firstLine = text.trim().split('\n')[0];
                const delimiter = firstLine.includes('\t') ? '\t' : ',';
                const rows = text.trim().split('\n').map(row => row.split(delimiter).map(cell => cell.trim()));

                if (rows.length < 2) return null;

                const headers = rows[0];
                const dataRows = rows.slice(1);
                dimensions = headers.slice(1);
                const modelNames = dataRows.map(row => row[0]);

                const result = dimensions.map((dim, dimIndex) => {
                    const dataPoint = { subject: dim };
                    dataRows.forEach(row => {
                        const model = row[0];
                        const val = parseFloat(row[dimIndex + 1]);
                        dataPoint[model] = isNaN(val) ? 0 : val;
                    });
                    return dataPoint;
                });

                return { chartData: result, models: modelNames, dimensions: dimensions };
            }

            // 初始化维度配置
            function initDimensionConfig(dimensionList) {
                dimensionList.forEach(dim => {
                    if (!dimensionConfig[dim]) {
                        // 计算该维度的最小值和最大值
                        const values = chartData
                            .filter(d => d.subject === dim)
                            .flatMap(d => models.map(model => d[model]))
                            .filter(v => !isNaN(v));

                        const minValue = Math.min(...values);
                        const maxValue = Math.max(...values);

                        let roundedMin, roundedMax;

                        if (config.integerTicks) {
                            // 使用整数刻度，向下取整到最近的10的倍数
                            roundedMin = Math.floor(minValue * 0.9 / 10) * 10;
                            // 向上取整到最近的10的倍数
                            roundedMax = Math.ceil(maxValue * 1.1 / 10) * 10;

                            // 确保最小值不为负数（除非数据有负值）
                            if (roundedMin < 0 && minValue >= 0) {
                                roundedMin = 0;
                            }
                        } else {
                            // 保留小数
                            roundedMin = Math.floor(minValue * 0.9);
                            roundedMax = Math.ceil(maxValue * 1.1);
                        }

                        dimensionConfig[dim] = {
                            min: roundedMin,
                            max: roundedMax,
                            unit: '', // 默认单位为空
                            reverse: false // 默认不反向
                        };
                    }
                });
            }

            // 更新维度控制界面
            function updateDimensionControls() {
                const container = document.getElementById('dimensionControls');
                container.innerHTML = '';

                dimensions.forEach(dim => {
                    const controlDiv = document.createElement('div');
                    controlDiv.className = 'dimension-control';

                    controlDiv.innerHTML = `
                        <div class="dimension-control-row">
                            <span class="dimension-name" title="${dim}">${dim}</span>
                            <div class="dimension-input-group">
                                <input type="number"
                                       class="dimension-min-input"
                                       value="${dimensionConfig[dim].min}"
                                       data-dimension="${dim}"
                                       data-type="min"
                                       step="${config.integerTicks ? '1' : '0.1'}"
                                       ${config.autoScale ? 'disabled' : ''}>
                                <span class="dimension-separator">-</span>
                                <input type="number"
                                       class="dimension-max-input"
                                       value="${dimensionConfig[dim].max}"
                                       data-dimension="${dim}"
                                       data-type="max"
                                       step="${config.integerTicks ? '1' : '0.1'}"
                                       ${config.autoScale ? 'disabled' : ''}>
                                <input type="text"
                                       class="dimension-unit-input"
                                       value="${dimensionConfig[dim].unit}"
                                       placeholder="单位"
                                       data-dimension="${dim}"
                                       ${config.autoScale ? 'disabled' : ''}>
                            </div>
                        </div>
                        <div class="dimension-reverse-checkbox">
                            <input type="checkbox"
                                   id="reverse-${dim}"
                                   class="dimension-reverse"
                                   data-dimension="${dim}"
                                   ${dimensionConfig[dim].reverse ? 'checked' : ''}
                                   ${config.autoScale ? 'disabled' : ''}>
                            <label for="reverse-${dim}">反向刻度 (内环值 > 外环值)</label>
                        </div>
                    `;

                    container.appendChild(controlDiv);
                });

                // 绑定最小值/最大值更改事件
                container.querySelectorAll('.dimension-min-input, .dimension-max-input').forEach(input => {
                    input.addEventListener('change', (e) => {
                        const dim = e.target.dataset.dimension;
                        const type = e.target.dataset.type;
                        let value = parseFloat(e.target.value);

                        if (!isNaN(value)) {
                            if (config.integerTicks) {
                                value = Math.round(value);
                            }

                            // 确保最小值小于最大值
                            if (type === 'min') {
                                if (value >= dimensionConfig[dim].max) {
                                    value = dimensionConfig[dim].max - (config.integerTicks ? 1 : 0.1);
                                    e.target.value = value;
                                }
                                dimensionConfig[dim].min = value;
                            } else if (type === 'max') {
                                if (value <= dimensionConfig[dim].min) {
                                    value = dimensionConfig[dim].min + (config.integerTicks ? 1 : 0.1);
                                    e.target.value = value;
                                }
                                dimensionConfig[dim].max = value;
                            }

                            drawChart();
                        }
                    });
                });

                // 绑定单位更改事件
                container.querySelectorAll('.dimension-unit-input').forEach(input => {
                    input.addEventListener('input', (e) => {
                        const dim = e.target.dataset.dimension;
                        dimensionConfig[dim].unit = e.target.value;
                        drawChart();
                    });
                });

                // 绑定反向刻度更改事件
                container.querySelectorAll('.dimension-reverse').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const dim = e.target.dataset.dimension;
                        dimensionConfig[dim].reverse = e.target.checked;
                        drawChart();
                    });
                });
            }

            // 初始化颜色
            function initColors(modelList) {
                modelList.forEach((model, i) => {
                    if (!colors[model]) {
                        colors[model] = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
                    }
                });
            }

            // 更新颜色选择器
            function updateColorPickers() {
                const container = document.getElementById('colorPickers');
                container.innerHTML = '';
                models.forEach(model => {
                    const row = document.createElement('div');
                    row.className = 'color-row';
                    row.innerHTML = `
                        <span class="color-label" title="${model}">${model}</span>
                        <input type="color" class="color-input" value="${colors[model]}" data-model="${model}">
                    `;
                    container.appendChild(row);
                });

                // 绑定颜色更改事件
                container.querySelectorAll('.color-input').forEach(input => {
                    input.addEventListener('input', (e) => {
                        colors[e.target.dataset.model] = e.target.value;
                        drawChart();
                    });
                });
            }

            // 格式化刻度值
            function formatTickValue(value) {
                if (config.integerTicks) {
                    return Math.round(value).toString();
                } else {
                    // 根据值的大小决定小数位数
                    if (Math.abs(value) < 1) {
                        return value.toFixed(2);
                    } else if (Math.abs(value) < 10) {
                        return value.toFixed(1);
                    } else {
                        return Math.round(value).toString();
                    }
                }
            }

            // 绘制雷达图
            function drawChart() {
                const svg = d3.select('#radarChart');
                svg.selectAll('*').remove();

                if (chartData.length === 0 || models.length === 0) return;

                const width = svg.node().getBoundingClientRect().width;
                const height = svg.node().getBoundingClientRect().height;
                const margin = { top: 40, right: 100, bottom: 40, left: 80 };
                const radius = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom) / 2;
                const centerX = width / 2;
                const centerY = height / 2;

                // 创建缩放容器
                const g = svg.append('g')
                    .attr('transform', `translate(${centerX},${centerY})`);

                // 计算角度
                const angleSlice = (Math.PI * 2) / chartData.length;

                // 计算每个维度的最小值和最大值
                const dimensionRanges = dimensions.map(dim => {
                    if (config.autoScale) {
                        // 自动计算最小值和最大值
                        const values = chartData
                            .filter(d => d.subject === dim)
                            .flatMap(d => models.map(model => d[model]))
                            .filter(v => !isNaN(v));

                        let minValue = Math.min(...values);
                        let maxValue = Math.max(...values);

                        if (config.integerTicks) {
                            // 使用整数刻度
                            minValue = Math.floor(minValue * 0.9 / 10) * 10;
                            maxValue = Math.ceil(maxValue * 1.1 / 10) * 10;

                            if (minValue < 0 && Math.min(...values) >= 0) {
                                minValue = 0;
                            }
                        } else {
                            minValue = Math.floor(minValue * 0.9);
                            maxValue = Math.ceil(maxValue * 1.1);
                        }

                        return {
                            min: minValue,
                            max: maxValue,
                            reverse: dimensionConfig[dim]?.reverse || false
                        };
                    } else {
                        // 使用用户设置的最小值和最大值
                        return {
                            min: dimensionConfig[dim].min || 0,
                            max: dimensionConfig[dim].max || 1,
                            reverse: dimensionConfig[dim].reverse || false
                        };
                    }
                });

                // 网格
                const levels = 5;
                const gridRadius = radius * 0.8;

                if (config.circularGrid) {
                    // 圆形网格
                    for (let level = 0; level <= levels; level++) {
                        const r = (gridRadius / levels) * level;
                        g.append('circle')
                            .attr('cx', 0)
                            .attr('cy', 0)
                            .attr('r', r)
                            .attr('fill', 'none')
                            .attr('stroke', level === 0 ? '#94a3b8' : '#e2e8f0')
                            .attr('stroke-width', level === 0 ? 1.5 : 1)
                            .attr('stroke-dasharray', level === 0 ? 'none' : '3,3');
                    }
                } else {
                    // 多边形网格
                    for (let level = 0; level <= levels; level++) {
                        const r = (gridRadius / levels) * level;
                        const points = chartData.map((d, i) => {
                            const angle = i * angleSlice - Math.PI / 2;
                            return [
                                r * Math.cos(angle),
                                r * Math.sin(angle)
                            ];
                        });

                        g.append('polygon')
                            .attr('points', points.map(p => p.join(',')).join(' '))
                            .attr('fill', 'none')
                            .attr('stroke', level === 0 ? '#94a3b8' : '#e2e8f0')
                            .attr('stroke-width', level === 0 ? 1.5 : 1)
                            .attr('stroke-dasharray', level === 0 ? 'none' : '3,3');
                    }
                }

                // 轴线和标签
                chartData.forEach((d, i) => {
                    const dim = d.subject;
                    const range = dimensionRanges[i];
                    const angle = i * angleSlice - Math.PI / 2;
                    const x = gridRadius * Math.cos(angle);
                    const y = gridRadius * Math.sin(angle);

                    // 轴线
                    g.append('line')
                        .attr('x1', 0)
                        .attr('y1', 0)
                        .attr('x2', x)
                        .attr('y2', y)
                        .attr('stroke', '#cbd5e1')
                        .attr('stroke-width', 1);

                    // 标签（包含单位和反向提示）
                    const unit = dimensionConfig[dim]?.unit || '';
                    let labelText = dim;
                    if (unit) {
                        labelText += ` (${unit})`;
                    }
                    // if (range.reverse) {
                    //     labelText += ' ↺'; // 添加反向标记
                    // }

                    const labelX = (gridRadius + 25) * Math.cos(angle);
                    const labelY = (gridRadius + 25) * Math.sin(angle);

                    g.append('text')
                        .attr('x', labelX)
                        .attr('y', labelY)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', config.fontSize)
                        // .attr('fill', range.reverse ? '#dc2626' : '#475569') // 反向维度用红色
                        .attr('font-weight', 500)
                        .text(labelText);

                    // 坐标轴刻度数字
                    if (config.showAxisNumbers) {
                        // 为每个刻度层级添加数字标签
                        for (let level = 0; level <= levels; level++) {
                            let value;
                            if (range.reverse) {
                                // 反向刻度：内环是最大值，外环是最小值
                                value = range.max - (range.max - range.min) * (level / levels);
                            } else {
                                // 正常刻度：内环是最小值，外环是最大值
                                value = range.min + (range.max - range.min) * (level / levels);
                            }

                            const r = (gridRadius / levels) * level;

                            // 计算刻度位置
                            const tickX = r * Math.cos(angle);
                            const tickY = r * Math.sin(angle);

                            // 计算文本位置（稍微偏移，避免与轴线重叠）
                            const textOffset = 8;
                            const textAngle = angle + Math.PI / 2; // 垂直方向
                            const textX = tickX + textOffset * Math.cos(textAngle);
                            const textY = tickY + textOffset * Math.sin(textAngle);

                            // 绘制刻度数字
                            g.append('text')
                                .attr('x', textX)
                                .attr('y', textY)
                                .attr('text-anchor', 'middle')
                                .attr('dominant-baseline', 'middle')
                                .attr('font-size', config.tickFontSize)
                                .attr('fill', '#94a3b8')
                                .attr('opacity', 0.8)
                                .text(formatTickValue(value));
                        }
                    }
                });

                // 绘制每个模型的数据
                models.forEach(model => {
                    const points = chartData.map((d, i) => {
                        const dim = d.subject;
                        const value = d[model] || 0;
                        const range = dimensionRanges[i];

                        // 将值映射到0-1的范围
                        let ratio = 0;
                        if (range.max > range.min) {
                            if (range.reverse) {
                                // 反向刻度：值越大，比例越小（更靠近中心）
                                ratio = (range.max - value) / (range.max - range.min);
                            } else {
                                // 正常刻度：值越大，比例越大（更靠近外环）
                                ratio = (value - range.min) / (range.max - range.min);
                            }
                            ratio = Math.max(0, Math.min(1, ratio)); // 限制在0-1之间
                        }

                        const angle = i * angleSlice - Math.PI / 2;
                        return {
                            x: gridRadius * ratio * Math.cos(angle),
                            y: gridRadius * ratio * Math.sin(angle),
                            value: value,
                            dim: dim,
                            reverse: range.reverse
                        };
                    });

                    // 填充区域
                    g.append('polygon')
                        .attr('points', points.map(p => `${p.x},${p.y}`).join(' '))
                        .attr('fill', colors[model])
                        .attr('fill-opacity', config.opacity)
                        .attr('stroke', colors[model])
                        .attr('stroke-width', config.strokeWidth);

                    // 数据点
                    if (config.showDots) {
                        points.forEach(p => {
                            g.append('circle')
                                .attr('cx', p.x)
                                .attr('cy', p.y)
                                .attr('r', 3)
                                .attr('fill', colors[model])
                                .attr('fill-opacity', 1);

                            // 数据点标签（悬停显示）
                            g.append('text')
                                .attr('x', p.x + 6)
                                .attr('y', p.y - 6)
                                .attr('font-size', config.fontSize - 2)
                                .attr('fill', p.reverse ? '#dc2626' : '#64748b')
                                .attr('opacity', 0)
                                .attr('class', 'data-label')
                                .text(formatTickValue(p.value));
                        });
                    }
                });

                // 添加悬停效果显示数据点标签
                g.selectAll('polygon')
                    .on('mouseover', function(event, d) {
                        svg.selectAll('.data-label')
                            .attr('opacity', 0.8);
                    })
                    .on('mouseout', function(event, d) {
                        svg.selectAll('.data-label')
                            .attr('opacity', 0);
                    });

                // 图例
                const legend = svg.append('g')
                    .attr('transform', `translate(${centerX + radius + 30}, ${centerY - models.length * 12})`);

                models.forEach((model, i) => {
                    const legendRow = legend.append('g')
                        .attr('transform', `translate(0, ${i * 24})`);

                    legendRow.append('rect')
                        .attr('x', 0)
                        .attr('y', -8)
                        .attr('width', 16)
                        .attr('height', 16)
                        .attr('fill', colors[model])
                        .attr('fill-opacity', config.opacity)
                        .attr('stroke', colors[model])
                        .attr('stroke-width', 2);

                    legendRow.append('text')
                        .attr('x', 24)
                        .attr('y', 0)
                        .attr('dominant-baseline', 'middle')
                        .attr('font-size', config.fontSize)
                        .attr('fill', '#374151')
                        .text(model);
                });

                // 添加反向刻度说明
                // const hasReverse = dimensionRanges.some(r => r.reverse);
                // if (hasReverse) {
                //     const legendY = centerY + models.length * 12 + 20;
                //     const reverseLegend = svg.append('g')
                //         .attr('transform', `translate(${centerX + radius + 30}, ${legendY})`);

                //     // reverseLegend.append('text')
                //     //     .attr('x', 0)
                //     //     .attr('y', 0)
                //     //     .attr('font-size', config.tickFontSize)
                //     //     .attr('fill', '#dc2626')
                //     //     .attr('font-weight', 'bold')
                //     //     .text('↺ 表示反向刻度');

                //     reverseLegend.append('text')
                //         .attr('x', 0)
                //         .attr('y', 16)
                //         .attr('font-size', config.tickFontSize - 1)
                //         .attr('fill', '#6b7280')
                //         .text('(内环值 > 外环值)');
                // }
            }

            // 更新图表
            function updateChart() {
                const result = parseData(document.getElementById('dataInput').value);
                if (result) {
                    chartData = result.chartData;
                    models = result.models;
                    dimensions = result.dimensions;

                    initDimensionConfig(dimensions);
                    initColors(models);

                    updateDimensionControls();
                    updateColorPickers();
                    drawChart();
                }
            }

            // 更新配置
            function updateConfig() {
                config.title = document.getElementById('chartTitle').value;
                config.fontFamily = document.getElementById('fontSelect').value;
                config.fontSize = parseInt(document.getElementById('fontSizeSlider').value);
                config.tickFontSize = parseInt(document.getElementById('tickFontSizeSlider').value);
                config.opacity = parseFloat(document.getElementById('opacitySlider').value);
                config.strokeWidth = parseInt(document.getElementById('strokeWidthSlider').value);
                config.showDots = document.getElementById('showDots').checked;
                config.circularGrid = document.getElementById('circularGrid').checked;
                config.autoScale = document.getElementById('autoScale').checked;
                config.showAxisNumbers = document.getElementById('showAxisNumbers').checked;
                config.integerTicks = document.getElementById('integerTicks').checked;

                // 应用字体
                document.body.className = config.fontFamily;

                // 更新显示值
                document.getElementById('fontSizeValue').textContent = config.fontSize;
                document.getElementById('tickFontSizeValue').textContent = config.tickFontSize;
                document.getElementById('opacityValue').textContent = Math.round(config.opacity * 100);
                document.getElementById('strokeWidthValue').textContent = config.strokeWidth;
                document.getElementById('chartTitleDisplay').textContent = config.title;
                document.getElementById('chartTitleDisplay').style.fontSize = `${config.fontSize + 6}px`;

                // 更新维度控制项的禁用状态和步长
                const dimensionInputs = document.querySelectorAll('.dimension-min-input, .dimension-max-input, .dimension-unit-input, .dimension-reverse');
                dimensionInputs.forEach(input => {
                    input.disabled = config.autoScale;
                    if (input.classList.contains('dimension-min-input') || input.classList.contains('dimension-max-input')) {
                        input.step = config.integerTicks ? '1' : '0.1';
                    }
                });

                // 如果启用了自动缩放，重新计算维度最小值和最大值
                if (config.autoScale) {
                    initDimensionConfig(dimensions);
                    updateDimensionControls();
                }

                drawChart();
            }

            // 导出图表
            document.getElementById('downloadBtn').addEventListener('click', () => {
                alert("提示：请使用截图工具 (Win+Shift+S 或 Mac Cmd+Shift+4) 来获取最高清晰度的图像用于论文。\n\nTip: Please use your system's screenshot tool for the highest resolution image.");
            });

            // 初始化事件监听
            document.getElementById('dataInput').addEventListener('input', updateChart);
            document.getElementById('chartTitle').addEventListener('input', updateConfig);
            document.getElementById('fontSelect').addEventListener('change', updateConfig);
            document.getElementById('fontSizeSlider').addEventListener('input', updateConfig);
            document.getElementById('tickFontSizeSlider').addEventListener('input', updateConfig);
            document.getElementById('opacitySlider').addEventListener('input', updateConfig);
            document.getElementById('strokeWidthSlider').addEventListener('input', updateConfig);
            document.getElementById('showDots').addEventListener('change', updateConfig);
            document.getElementById('circularGrid').addEventListener('change', updateConfig);
            document.getElementById('autoScale').addEventListener('change', updateConfig);
            document.getElementById('showAxisNumbers').addEventListener('change', updateConfig);
            document.getElementById('integerTicks').addEventListener('change', updateConfig);

            // 初始渲染
            updateChart();
            updateConfig();

            // 窗口大小变化时重绘
            window.addEventListener('resize', drawChart);
        </script>
  );
}
