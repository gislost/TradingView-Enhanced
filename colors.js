// Injected into the TradingView chart page. Chart color themes and readable drawing text; the UI is in panel.js.
// Themes: built-in presets matching the skins, plus every theme from chartthemes.com
// (launch.mjs fetches that list and sets window.__tvChartThemes), plus pasted hex colors.
(() => {
  window.__tvColors?.dispose?.();

  const PRESETS = [
    { name: 'Synthwave', bull: '#2EE6A6', bear: '#FF4F7B', bg: '#0A0214', text: '#C9B8E8' },
    { name: 'Aurora', bull: '#19FFB0', bear: '#FF5D8F', bg: '#020611', text: '#A7C4D4' },
    { name: 'Matrix', bull: '#39FF7A', bear: '#0D3D1F', bearBorder: '#39FF7A', bearWick: '#39FF7A', bg: '#020A04', text: '#7DFFA8' },
  ];

  // chartthemes.com JSON -> our shape
  const fromChartThemes = t => ({
    name: t.name, source: 'chartthemes.com',
    bull: t.bullish_color, bullWick: t.bullish_wick_color, bullBorder: t.bullish_border_color,
    bear: t.bearish_color, bearWick: t.bearish_wick_color, bearBorder: t.bearish_border_color,
    bg: t.background_color, text: t.text_color,
  });

  // Remote theme data is untrusted: only well-formed hex colors and escaped names reach the DOM.
  const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v);
  const valid = t => ['bull', 'bear', 'bg', 'text', 'bullWick', 'bullBorder', 'bearWick', 'bearBorder'].every(k => t[k] === undefined || isHex(t[k]));

  const withAlpha = (hex, a) => {
    const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
    return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  };

  function overridesFor(t) {
    const up = t.bull, down = t.bear;
    const o = {
      'paneProperties.backgroundType': 'solid',
      'paneProperties.background': t.bg,
      'paneProperties.vertGridProperties.color': withAlpha(t.text, 0.06),
      'paneProperties.horzGridProperties.color': withAlpha(t.text, 0.06),
      'scalesProperties.textColor': t.text,
      'scalesProperties.lineColor': withAlpha(t.text, 0.15),
      'mainSeriesProperties.barStyle.upColor': up,
      'mainSeriesProperties.barStyle.downColor': down,
    };
    for (const style of ['candleStyle', 'hollowCandleStyle', 'haStyle']) {
      Object.assign(o, {
        [`mainSeriesProperties.${style}.upColor`]: up,
        [`mainSeriesProperties.${style}.downColor`]: down,
        [`mainSeriesProperties.${style}.borderUpColor`]: t.bullBorder || up,
        [`mainSeriesProperties.${style}.borderDownColor`]: t.bearBorder || down,
        [`mainSeriesProperties.${style}.wickUpColor`]: t.bullWick || up,
        [`mainSeriesProperties.${style}.wickDownColor`]: t.bearWick || down,
        [`mainSeriesProperties.${style}.drawWick`]: true,
        [`mainSeriesProperties.${style}.drawBorder`]: true,
      });
    }
    return o;
  }

  // Applies to every chart in the layout.
  function apply(t) {
    const api = window.TradingViewApi;
    const n = api.chartsCount ? api.chartsCount() : 1;
    for (let i = 0; i < n; i++) api.chart(i).applyOverrides(overridesFor(t));
    try { localStorage.tvColorTheme = t.name; } catch {}
  }

  // Accepts chartthemes.com hex values pasted in page order
  // (bear body, bear wick, bear border, bull body, bull wick, bull border, background, foreground, text),
  // or just "bull bear background text".
  function parsePasted(s) {
    const hex = s.match(/#[0-9a-f]{6}\b/gi) || [];
    if (hex.length >= 9) return { name: 'Pasted', bear: hex[0], bearWick: hex[1], bearBorder: hex[2], bull: hex[3], bullWick: hex[4], bullBorder: hex[5], bg: hex[6], text: hex[8] };
    if (hex.length >= 4) return { name: 'Pasted', bull: hex[0], bear: hex[1], bg: hex[2], text: hex[3] };
    return null;
  }

  // ── Readable drawing text ────────────────────────────────────────────────
  // Every few seconds, any drawing text that's hard to read against what's actually behind the chart
  // (the skin, or the chart background) is nudged darker or lighter, keeping its hue. The original
  // color is remembered per drawing, so changing skin/theme recomputes from it, not from the nudged one.
  const parseColor = s => {
    let m = /^#([0-9a-f]{6})/i.exec(s);
    if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; }
    m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?/i.exec(s);
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  };
  const lum = ([r, g, b]) => {
    const f = v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const MIN_CONTRAST = 4.5;
  function readable(col, bg) {
    if (contrast(col, bg) >= MIN_CONTRAST) return null;
    const to = lum(bg) > 0.4 ? 0 : 255;
    for (let k = 0.1; k <= 1.001; k += 0.1) {
      const c = col.slice(0, 3).map(v => Math.round(v + (to - v) * k));
      if (contrast(c, bg) >= MIN_CONTRAST) return c;
    }
    return [to, to, to];
  }

  const ORIG_KEY = 'tvTextOrig'; // { "<shapeId>|<prop>": { orig, written } }
  let origs = {};
  try { origs = JSON.parse(localStorage[ORIG_KEY] || '{}'); } catch {}
  const autoFix = () => { try { return localStorage.tvTextFix !== 'off'; } catch { return true; } };

  function backdrop(chart) {
    const skin = window.__tvSkin?.backdrop?.();
    if (skin) return parseColor(skin);
    try { return parseColor(chart.chartModel().backgroundColor().value()); } catch { return null; }
  }

  function fixText() {
    const api = window.TradingViewApi;
    if (!api?.chart) return;
    let changed = false;
    const n = api.chartsCount ? api.chartsCount() : 1;
    for (let i = 0; i < n; i++) {
      const chart = api.chart(i), bg = backdrop(chart);
      if (!bg) continue;
      for (const { id } of chart.getAllShapes()) {
        let shape, props;
        try { shape = chart.getShapeById(id); props = shape.getProperties(); } catch { continue; }
        for (const key of Object.keys(props)) {
          if (!/^text_?color$/i.test(key) || typeof props[key] !== 'string') continue;
          const k = `${id}|${key}`, cur = props[key], rec = origs[k];
          // If the user recolored it since we last touched it, their color is the new original.
          const orig = rec && rec.written === cur ? rec.orig : cur;
          const col = parseColor(orig);
          if (!col) continue;
          const fixed = autoFix() ? readable(col, bg) : null;
          const want = fixed ? `rgba(${fixed.join(', ')}, ${col[3]})` : orig;
          if (want !== cur) { shape.setProperties({ [key]: want }); changed = true; }
          if (want !== orig) origs[k] = { orig, written: want };
          else if (rec) { delete origs[k]; changed = true; }
        }
      }
    }
    if (changed) try { localStorage[ORIG_KEY] = JSON.stringify(origs); } catch {}
  }
  const fixTimer = setInterval(() => { try { fixText(); } catch (e) { console.warn('[tv-colors]', e); } }, 2000);

  const themes = () => [...PRESETS.map(p => ({ ...p, source: 'built-in' })), ...(window.__tvChartThemes || []).map(fromChartThemes)].filter(valid);
  const current = () => { try { return localStorage.tvColorTheme || null; } catch { return null; } };
  const setAutoFix = on => { try { localStorage.tvTextFix = on ? 'on' : 'off'; } catch {} fixText(); };

  window.__tvColors = { apply, themes, current, parsePasted, autoFix, setAutoFix, fixText, presets: PRESETS, dispose: () => clearInterval(fixTimer) };
})();
