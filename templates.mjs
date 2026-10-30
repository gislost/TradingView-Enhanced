// ICT drawing templates for TradingView. Saves them to your TradingView account through the
// running desktop app (started by launch.mjs). Existing template names are never overwritten.
//   node templates.mjs           install missing templates
//   node templates.mjs --update  also overwrite templates defined here with their latest version
//   node templates.mjs --list    print what would be installed
//   node templates.mjs --remove  delete only the templates defined in this file

const BULL = [46, 230, 166], BEAR = [255, 79, 123], NEUTRAL = [179, 136, 255], GOLD = [255, 200, 87];
const BSL = [34, 211, 238], SSL = [244, 114, 182];
const TEXT = 'rgba(245, 245, 245, 1)';
const rgba = ([r, g, b], a = 1) => `rgba(${r}, ${g}, ${b}, ${a})`;
const SOLID = 0, DOTTED = 1, DASHED = 2;

function rect(text, col, { fill = 0.18, width = 1, style = SOLID, mid = false, extend = false, bold = false } = {}) {
  return {
    tool: 'LineToolRectangle', name: text,
    content: {
      color: rgba(col), fillBackground: true, backgroundColor: rgba(col, fill), linewidth: width, linestyle: style,
      transparency: 50, horzLabelsAlign: 'right', vertLabelsAlign: 'middle', textColor: TEXT, fontSize: 12,
      bold, italic: false, extendLeft: false, extendRight: extend,
      middleLine: { showLine: mid, lineWidth: 1, lineColor: rgba(col), lineStyle: DASHED },
      text,
    },
  };
}

function ray(name, text, col, { width = 1, style = SOLID } = {}) {
  return {
    tool: 'LineToolHorzRay', name,
    content: {
      linecolor: rgba(col), textcolor: rgba(col), linewidth: width, linestyle: style, showPrice: true,
      fontsize: 12, bold: false, italic: false, horzLabelsAlign: 'right', vertLabelsAlign: 'top', text,
    },
  };
}

// levels: [coeff, color, text?]. TradingView expects all 24 level slots.
function fib(name, levels, { fill = true } = {}) {
  const content = {
    showCoeffs: true, showPrices: true, fillBackground: fill, transparency: 88, extendLines: false,
    extendLinesLeft: false, horzLabelsAlign: 'left', vertLabelsAlign: 'middle', showText: true,
    horzTextAlign: 'right', vertTextAlign: 'middle', reverse: false, coeffsAsPercents: false,
    fibLevelsBasedOnLogScale: false, labelFontSize: 12,
    trendline: { visible: true, linewidth: 1, linestyle: DASHED, color: 'rgba(160, 160, 180, 0.8)' },
    levelsStyle: { linewidth: 1, linestyle: SOLID },
  };
  for (let i = 0; i < 24; i++) {
    const l = levels[i];
    content[`level${i + 1}`] = l
      ? { visible: true, coeff: l[0], color: rgba(l[1]), text: l[2] || '' }
      : { visible: false, coeff: 0, color: rgba(NEUTRAL), text: '' };
  }
  return { tool: 'LineToolFibRetracement', name, content };
}

function trend(name, col, { style = SOLID, extend = false } = {}) {
  return {
    tool: 'LineToolTrendLine', name,
    content: {
      linecolor: rgba(col), textcolor: rgba(col), linewidth: 2, linestyle: style, extendLeft: false,
      extendRight: extend, leftEnd: 0, rightEnd: 0, horzLabelsAlign: 'center', vertLabelsAlign: 'bottom',
      fontsize: 12, bold: false, italic: false, alwaysShowStats: false, showMiddlePoint: false,
      showPriceLabels: false, showPriceRange: false, showPercentPriceRange: false, showPipsPriceRange: false,
      showBarsRange: false, showDateTimeRange: false, showDistance: false, showAngle: false, statsPosition: 2, text: '',
    },
  };
}

const GREY = [160, 160, 180];
export const TEMPLATES = [
  // Fibonacci
  fib('OTE + Targets', [[1, GREY], [0.79, BEAR, 'OTE'], [0.705, GOLD, 'OTE'], [0.62, BULL, 'OTE'], [0.5, NEUTRAL, 'EQ'], [0, GREY],
    [-0.27, BSL, 'T1'], [-0.62, BSL, 'T2'], [-1, BSL, 'T3']]),
  fib('EQ (Premium/Discount)', [[1, BULL], [0.5, NEUTRAL, 'EQ'], [0, BEAR]]),
  fib('Quadrants', [[1, GREY], [0.75, BULL, 'Q'], [0.5, NEUTRAL, 'EQ'], [0.25, BEAR, 'Q'], [0, GREY]]),
  fib('Octants', [[1, GREY], [0.875, BULL], [0.75, BULL], [0.625, BULL], [0.5, NEUTRAL, 'EQ'], [0.375, BEAR], [0.25, BEAR], [0.125, BEAR], [0, GREY]]),
  fib('STDV Projections', [[1, GREY], [0, GREY], [-1, BSL, '-1'], [-1.5, NEUTRAL, '-1.5'], [-2, GOLD, '-2'], [-2.5, BEAR, '-2.5'], [-4, SSL, '-4']], { fill: false }),

  // PD arrays
  rect('Bullish OB', BULL, { mid: true }), rect('Bearish OB', BEAR, { mid: true }),
  rect('Bullish RB', BULL, { style: DASHED }), rect('Bearish RB', BEAR, { style: DASHED }),
  rect('Bullish BB', BULL, { width: 2, fill: 0.12 }), rect('Bearish BB', BEAR, { width: 2, fill: 0.12 }),
  rect('Bullish IFVG', BULL, { fill: 0.1, style: DOTTED, mid: true }), rect('Bearish IFVG', BEAR, { fill: 0.1, style: DOTTED, mid: true }),
  rect('BPR', NEUTRAL, { mid: true }),
  rect('NWOG', GOLD, { fill: 0.14, mid: true, extend: true }), rect('NDOG', GOLD, { fill: 0.07, style: DASHED, mid: true, extend: true }),

  // Bias zones
  rect('Bullish HTF', BULL, { width: 2, fill: 0.22, bold: true }), rect('Bearish HTF', BEAR, { width: 2, fill: 0.22, bold: true }),
  rect('Bullish LTF', BULL, { style: DASHED, fill: 0.1 }), rect('Bearish LTF', BEAR, { style: DASHED, fill: 0.1 }),

  // Liquidity
  ray('BSL Major', 'BSL', BSL, { width: 2 }), ray('BSL Minor', 'BSL', BSL, { style: DASHED }),
  ray('SSL Major', 'SSL', SSL, { width: 2 }), ray('SSL Minor', 'SSL', SSL, { style: DASHED }),

  // Key opens (New York time)
  ray('Midnight Open', 'MO 00:00', GOLD, { style: DOTTED }), ray('6:00 Open', '06:00', GOLD, { style: DOTTED }),
  ray('8:30 Open', '08:30', GOLD, { style: DOTTED }), ray('9:30 Open', '09:30', GOLD, { style: DOTTED }),
  ray('10:00 Open', '10:00', GOLD, { style: DOTTED }), ray('Weekly Open', 'Weekly Open', GOLD, { width: 2, style: DASHED }),
  ray('Monthly Open', 'Monthly Open', GOLD, { width: 2 }),

  // Lines
  trend('Trendline', NEUTRAL), trend('Trendline Extended', NEUTRAL, { style: DASHED, extend: true }),
  {
    tool: 'LineToolRegressionTrend', name: 'LR Channel',
    content: {
      inputs: { 'lower diviation': -2, source: 'close', 'upper diviation': 2, 'use lower diviation': true, 'use upper diviation': true },
      showLabelsOnPriceScale: true, linewidth: 1, linestyle: SOLID,
      styles: {
        upLine: { display: 4294967295, linestyle: SOLID, linewidth: 1, color: rgba(BEAR, 0.8) },
        downLine: { display: 4294967295, linestyle: SOLID, linewidth: 1, color: rgba(BULL, 0.8) },
        baseLine: { display: 4294967295, linestyle: DASHED, linewidth: 1, color: rgba(NEUTRAL, 0.9) },
        extendLines: false, showPearsons: true, transparency: 85,
      },
      precision: 'default',
    },
  },
];

// Runs inside the TradingView page, using its logged-in session.
async function pageInstall(templates, mode) {
  const existing = {};
  const list = async tool => (existing[tool] ||= await (await fetch(`/drawing-templates/${tool}/`, { credentials: 'same-origin' })).json());
  const out = [];
  for (const t of templates) {
    const have = (await list(t.tool)).includes(t.name);
    const body = new FormData();
    body.append('name', t.name);
    body.append('tool', t.tool);
    if (mode === 'remove') {
      if (!have) { out.push(`absent  ${t.name}`); continue; }
      const r = await fetch('/remove-drawing-template/', { method: 'POST', credentials: 'same-origin', body });
      out.push(`${r.ok ? 'removed' : 'FAILED ' + r.status} ${t.name}`);
      continue;
    }
    if (have && mode !== 'update') { out.push(`exists  ${t.name} (left alone)`); continue; }
    body.append('content', JSON.stringify(t.content));
    const r = await fetch('/save-drawing-template/', { method: 'POST', credentials: 'same-origin', body });
    out.push(`${r.ok ? (have ? 'updated' : 'saved  ') : 'FAILED ' + r.status} ${t.name}`);
  }
  return out;
}

if (process.argv[1]?.endsWith('templates.mjs')) {
  const mode = process.argv.includes('--remove') ? 'remove' : process.argv.includes('--update') ? 'update' : 'install';
  if (process.argv.includes('--list')) {
    for (const t of TEMPLATES) console.log(`${t.tool.replace('LineTool', '').padEnd(18)} ${t.name}`);
    process.exit(0);
  }
  let targets;
  try { targets = await (await fetch('http://127.0.0.1:9222/json/list')).json(); } catch {
    console.log('TradingView is not running with the skin launcher. Start it with "TradingView Skinned.cmd" first.');
    process.exit(1);
  }
  const page = targets.find(t => t.type === 'page' && /tradingview\.com/.test(t.url));
  if (!page) { console.log('No TradingView chart tab found.'); process.exit(1); }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onopen = () => ws.send(JSON.stringify({
    id: 1, method: 'Runtime.evaluate',
    params: { expression: `(${pageInstall})(${JSON.stringify(TEMPLATES)}, ${JSON.stringify(mode)})`, awaitPromise: true, returnByValue: true },
  }));
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id !== 1) return;
    const v = m.result?.result?.value;
    console.log(v ? v.join('\n') : JSON.stringify(m.result));
    ws.close();
  };
}
