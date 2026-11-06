// Injected into the TradingView chart page. "Ask Claude" about a selected range of bars, with ICT framing.
// This is only the UI: the API key and the Claude API calls live in claude.mjs (Node), reached through the
// window.__tvClaude binding that launch.mjs adds. Replies come back through window.__tvAI.receive().
//
// Read-only: this script reads bars and the selection from the chart and shows text. It never calls any
// order, trading or broker API, and Claude's answers are rendered as escaped text, never run.
//
// Use: select a range on the chart (TradingView's range selection), click the "Ask Claude" chip.
// Alt+Shift+Q opens it for the current selection, or for the visible range if nothing is selected.
(() => {
  window.__tvAI?.dispose?.();

  const ACTIONS = [
    { id: 'explain', label: 'Explain the move' },
    { id: 'events', label: 'News behind it' },
    { id: 'levels', label: 'PD arrays & liquidity' },
    { id: 'bias', label: 'Narrative & bias' },
  ];
  const LOOKBACK = 150, AFTER = 40, MAX_ROWS = 600;

  // ── NY time ─────────────────────────────────────────────────────────────
  const NYF = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
  });
  function ny(t) {
    const p = {};
    for (const x of NYF.formatToParts(new Date(t * 1000))) p[x.type] = x.value;
    return { date: `${p.year}-${p.month}-${p.day}`, wd: p.weekday, h: +p.hour, m: +p.minute, hm: `${p.hour}:${p.minute}` };
  }
  const nyText = t => { const n = ny(t); return `${n.date} ${n.wd} ${n.hm}`; };
  // CME-style trading day: starts 18:00 NY the evening before.
  const tradingDay = t => ny(t + 6 * 3600).date;
  const px = v => (v == null || !isFinite(v) ? '' : String(+(+v).toFixed(6)));

  // ── Chart access (read-only) ────────────────────────────────────────────
  const chart = () => { try { return window.TradingViewApi.activeChart(); } catch { return null; } };
  const model = () => { try { return chart().chartModel(); } catch { return null; } };

  function allBars() {
    const s = model()?.mainSeries()?.bars();
    if (!s) return [];
    const out = [];
    for (let i = s.firstIndex(); i <= s.lastIndex(); i++) {
      const v = s.valueAt(i);
      if (v && isFinite(v[0])) out.push({ t: v[0], o: v[1], h: v[2], l: v[3], c: v[4], v: v[5] });
    }
    return out;
  }

  // TradingView's own range selection, if one is on the chart.
  function selectedRange() {
    const m = model();
    if (!m) return null;
    let sources = [];
    try { sources = m.selection().allSources(); } catch { return null; }
    for (const src of sources) {
      if (src?._id !== 'chart-range-selection') continue;
      const r = src._owner?._range;
      if (r && isFinite(r.from) && isFinite(r.to) && r.to > r.from) return { from: r.from, to: r.to, src };
      try {
        const b = src._owner.band().range, bars = m.mainSeries().bars();
        const a = bars.valueAt(b.start)?.[0], z = bars.valueAt(b.end)?.[0];
        if (a && z) return { from: Math.min(a, z), to: Math.max(a, z), src };
      } catch {}
    }
    // A selected drawing spanning time (rectangle, trend line, ...) also counts.
    const c = chart();
    for (const src of sources) {
      try {
        const id = typeof src.id === 'function' ? src.id() : src._id;
        const pts = c.getShapeById(id).getPoints().map(p => p.time).filter(isFinite);
        if (pts.length >= 2 && Math.max(...pts) > Math.min(...pts)) return { from: Math.min(...pts), to: Math.max(...pts), src: null };
      } catch {}
    }
    return null;
  }

  function visibleRange() {
    try { const r = chart().getVisibleRange(); if (r.to > r.from) return { from: r.from, to: r.to, src: null }; } catch {}
    return null;
  }

  function timeframeText(res) {
    if (/^\d+$/.test(res)) { const n = +res; return n % 60 === 0 ? `${n / 60}h` : `${n}m`; }
    if (/^\d+S$/i.test(res)) return `${parseInt(res)}s`;
    return res; // D, W, M, 2D, ...
  }

  // ── Context for Claude: bars in NY time + ICT reference levels ──────────
  function hiLo(list) {
    if (!list.length) return null;
    let hi = list[0], lo = list[0];
    for (const b of list) { if (b.h > hi.h) hi = b; if (b.l < lo.l) lo = b; }
    return { hi: hi.h, hiT: hi.t, lo: lo.l, loT: lo.t };
  }
  const hlText = r => (r ? `high ${px(r.hi)} (${nyText(r.hiT)}), low ${px(r.lo)} (${nyText(r.loT)})` : 'n/a');

  function buildContext(range) {
    const c = chart(), bars = allBars();
    if (!c || !bars.length) return { error: 'No chart data loaded yet.' };
    let first = bars.findIndex(b => b.t >= range.from);
    let last = -1;
    for (let i = bars.length - 1; i >= 0; i--) if (bars[i].t <= range.to) { last = i; break; }
    if (first < 0 || last < first) return { error: 'The selected range has no loaded bars. Scroll so the bars are loaded and try again.' };

    const sym = (() => { try { return c.symbolExt() || {}; } catch { return {}; } })();
    const res = (() => { try { return c.resolution(); } catch { return '?'; } })();
    const intraday = /^\d+[S]?$/i.test(res);
    const sel = bars.slice(first, last + 1);
    const lines = [];

    lines.push(`Symbol: ${sym.full_name || sym.symbol || c.symbol?.() || '?'}${sym.description ? ` (${sym.description})` : ''}${sym.type ? `, ${sym.type}` : ''}`);
    lines.push(`Timeframe: ${timeframeText(res)}`);
    lines.push(`Selected range (NY): ${nyText(sel[0].t)} to ${nyText(sel.at(-1).t)}, ${sel.length} bars`);
    lines.push(`Loaded bars (NY): ${nyText(bars[0].t)} to ${nyText(bars.at(-1).t)} (levels before that are unknown)`);

    const r = hiLo(sel), o = sel[0].o, cl = sel.at(-1).c;
    const vol = sel.reduce((s, b) => s + (isFinite(b.v) ? b.v : 0), 0);
    const eq = (r.hi + r.lo) / 2, span = r.hi - r.lo;
    lines.push('', 'Selected range stats:');
    lines.push(`- open ${px(o)}, close ${px(cl)}, change ${px(cl - o)} (${(((cl - o) / o) * 100).toFixed(3)}%)`);
    lines.push(`- ${hlText(r)}`);
    lines.push(`- equilibrium (50%) ${px(eq)}; OTE band of the range 62-79%: from high ${px(r.hi - span * 0.62)}-${px(r.hi - span * 0.79)}, from low ${px(r.lo + span * 0.62)}-${px(r.lo + span * 0.79)}`);
    if (vol) lines.push(`- volume ${px(vol)}`);

    if (intraday) {
      // Session levels for the trading day the selection ends in, from loaded bars.
      const day = tradingDay(sel.at(-1).t);
      const byDay = new Map();
      for (const b of bars) {
        const d = tradingDay(b.t);
        if (!byDay.has(d)) byDay.set(d, []);
        byDay.get(d).push(b);
      }
      const days = [...byDay.keys()];
      const prev = days[days.indexOf(day) - 1];
      const today = byDay.get(day) || [];
      const inHours = (list, a, z) => list.filter(b => { const h = ny(b.t).h; return h >= a && h < z; });
      const openAt = (list, h, m) => list.find(b => { const n = ny(b.t); return n.h === h && n.m >= m; });
      lines.push('', `ICT reference levels for trading day ${day} (computed from loaded bars, NY time):`);
      if (prev) lines.push(`- previous day (${prev}): ${hlText(hiLo(byDay.get(prev)))}`);
      lines.push(`- Asia 20:00-00:00: ${hlText(hiLo(inHours(today, 20, 24)))}`);
      lines.push(`- London 02:00-05:00: ${hlText(hiLo(inHours(today, 2, 5)))}`);
      lines.push(`- NY AM 07:00-10:00: ${hlText(hiLo(inHours(today, 7, 10)))}`);
      const mo = openAt(today, 0, 0), ro = openAt(today, 9, 30), eo = openAt(today, 8, 30);
      if (mo) lines.push(`- NY midnight open ${px(mo.o)}`);
      if (eo) lines.push(`- 08:30 open ${px(eo.o)}`);
      if (ro) lines.push(`- 09:30 open ${px(ro.o)}`);
    }

    // Bars: lookback + selection + a few after, aggregated if too many rows.
    const a = Math.max(0, first - LOOKBACK), z = Math.min(bars.length - 1, last + AFTER);
    let rows = bars.slice(a, z + 1).map((b, k) => ({ ...b, seg: a + k < first ? 'pre' : a + k > last ? 'post' : 'in' }));
    let note = '';
    if (rows.length > MAX_ROWS) {
      const k = Math.ceil(rows.length / MAX_ROWS), grouped = [];
      for (let i = 0; i < rows.length; i += k) {
        const g = rows.slice(i, i + k), hl = hiLo(g);
        grouped.push({ t: g[0].t, o: g[0].o, h: hl.hi, l: hl.lo, c: g.at(-1).c, v: g.reduce((s, b) => s + (isFinite(b.v) ? b.v : 0), 0), seg: g.some(b => b.seg === 'in') ? 'in' : g[0].seg });
      }
      rows = grouped;
      note = ` (aggregated: each row is ${k} ${timeframeText(res)} bars)`;
    }
    lines.push('', `Bars${note}. seg: pre = before the selection, in = selected, post = after it.`);
    lines.push('time_ny,open,high,low,close,volume,seg');
    for (const b of rows) lines.push(`${nyText(b.t)},${px(b.o)},${px(b.h)},${px(b.l)},${px(b.c)},${px(b.v)},${b.seg}`);

    return {
      text: lines.join('\n'),
      label: `${sym.symbol || sym.full_name || ''} ${timeframeText(res)} · ${nyText(sel[0].t)} → ${ny(sel.at(-1).t).hm} NY · ${sel.length} bars`,
    };
  }

  // ── Safe markdown (escape first; only https links) ──────────────────────
  const esc = s => s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  function markdown(src) {
    const out = [];
    let list = null;
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    for (const raw of src.split('\n')) {
      const line = raw.trimEnd();
      let m;
      if ((m = /^#{1,4}\s+(.*)/.exec(line))) { close(); out.push(`<div class="tvai-h">${inline(m[1])}</div>`); }
      else if ((m = /^\s*[-*•]\s+(.*)/.exec(line))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); }
      else if ((m = /^\s*\d+[.)]\s+(.*)/.exec(line))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); }
      else if (!line.trim()) close();
      else { close(); out.push(`<p>${inline(line)}</p>`); }
    }
    close();
    return out.join('');
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  const css = document.createElement('style');
  css.textContent = `
  .tvai-chip{position:fixed;z-index:9999;padding:4px 10px;border-radius:14px;border:1px solid rgba(217,119,87,.6);background:rgba(20,16,24,.92);color:#f0d6cb;font:600 12px/1.4 -apple-system,Segoe UI,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)}
  .tvai-chip:hover{background:rgba(217,119,87,.25)}
  .tvai{position:fixed;z-index:10000;width:400px;max-height:72vh;display:flex;flex-direction:column;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(15,16,24,.97);color:#d6d8e0;font:13px/1.5 -apple-system,Segoe UI,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.55);overflow:hidden}
  .tvai-top{display:flex;align-items:center;gap:6px;padding:9px 10px 7px 12px;cursor:move;border-bottom:1px solid rgba(255,255,255,.07)}
  .tvai-title{font-weight:700;color:#f0d6cb;flex:1}
  .tvai-top button{background:none;border:0;color:#9aa0ae;cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px}
  .tvai-top button:hover{background:rgba(255,255,255,.08);color:#fff}
  .tvai-range{padding:0 12px 8px;color:#8b90a0;font-size:11.5px;border-bottom:1px solid rgba(255,255,255,.07)}
  .tvai-body{flex:1;overflow:auto;padding:10px 12px}
  .tvai-acts{display:flex;flex-wrap:wrap;gap:6px}
  .tvai-acts button{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#e3e5ec;border-radius:16px;padding:5px 11px;cursor:pointer;font:inherit;font-size:12.5px}
  .tvai-acts button:hover{border-color:rgba(217,119,87,.7);background:rgba(217,119,87,.14)}
  .tvai-q{margin:12px 0 4px;color:#f0d6cb;font-weight:600}
  .tvai-a p{margin:0 0 7px}.tvai-a ul,.tvai-a ol{margin:0 0 7px;padding-left:18px}.tvai-a li{margin:2px 0}
  .tvai-a .tvai-h{font-weight:700;color:#fff;margin:9px 0 4px}
  .tvai-a code{background:rgba(255,255,255,.08);padding:0 4px;border-radius:4px}
  .tvai a{color:#7fb6ff}
  .tvai-status{color:#8b90a0;font-style:italic;font-size:12px;margin:4px 0}
  .tvai-err{color:#ff8a8a;margin:6px 0}
  .tvai-src{font-size:11.5px;color:#8b90a0;margin:4px 0 8px}.tvai-src a{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tvai-foot{display:flex;gap:6px;padding:9px 10px;border-top:1px solid rgba(255,255,255,.07)}
  .tvai-foot input,.tvai-key input{flex:1;min-width:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#fff;padding:7px 9px;font:inherit;outline:none}
  .tvai-foot input:focus,.tvai-key input:focus{border-color:rgba(217,119,87,.7)}
  .tvai-foot button,.tvai-key button{background:#d97757;border:0;color:#fff;border-radius:8px;padding:0 12px;cursor:pointer;font:inherit;font-weight:600}
  .tvai-foot button:disabled{opacity:.45;cursor:default}
  .tvai-key{display:flex;flex-direction:column;gap:8px}.tvai-key div{display:flex;gap:6px}.tvai-key small{color:#8b90a0}
  .tvai-note{color:#6f7484;font-size:11px;margin-top:10px}`;
  document.head.appendChild(css);

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // Bridge to claude.mjs
  let seq = 0;
  const handlers = new Map();
  const bridge = () => typeof window.__tvClaude === 'function';
  function request(obj, onMsg) {
    const id = `r${++seq}`;
    if (onMsg) handlers.set(id, onMsg);
    window.__tvClaude(JSON.stringify({ ...obj, id }));
    return id;
  }
  function receive(msg) {
    const h = handlers.get(msg?.id);
    if (!h) return;
    if (msg.type === 'done' || msg.type === 'error' || msg.type === 'status-reply') handlers.delete(msg.id);
    h(msg);
  }

  // Popup state
  let panel = null, convId = null, range = null, ctx = null, busy = false, asked = false;

  function chartRect() {
    const t = document.querySelector('.chart-markup-table') || document.querySelector('.chart-container');
    return t ? t.getBoundingClientRect() : { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth };
  }

  function close() {
    if (convId && bridge()) request({ type: 'reset', convId });
    panel?.remove();
    panel = null; convId = null; ctx = null; busy = false; asked = false;
  }

  function open(r) {
    r = r || selectedRange() || visibleRange();
    if (!r) return;
    close();
    range = r;
    convId = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    panel = el('div', 'tvai');
    const top = el('div', 'tvai-top');
    top.append(el('span', 'tvai-title', '✦ Ask Claude · ICT'));
    const keyBtn = el('button', '', 'key'); keyBtn.title = 'Change the Claude API key';
    const newBtn = el('button', '', 'new'); newBtn.title = 'Start over on this range';
    const xBtn = el('button', '', '✕'); xBtn.title = 'Close (Esc)';
    top.append(keyBtn, newBtn, xBtn);
    const rangeLine = el('div', 'tvai-range', 'Reading bars…');
    const body = el('div', 'tvai-body');
    const foot = el('div', 'tvai-foot');
    const input = el('input'); input.placeholder = 'Ask about this range…';
    const send = el('button', '', 'Ask');
    foot.append(input, send);
    panel.append(top, rangeLine, body, foot);
    document.body.appendChild(panel);

    const cr = chartRect();
    panel.style.left = `${Math.max(8, Math.min(cr.right - 412, innerWidth - 412))}px`;
    panel.style.top = `${Math.max(8, cr.top + 44)}px`;

    // Keep TradingView's hotkeys from firing while typing here.
    for (const ev of ['keydown', 'keyup', 'keypress']) panel.addEventListener(ev, e => {
      e.stopPropagation();
      if (ev === 'keydown' && e.key === 'Escape') close();
    });
    xBtn.onclick = close;
    newBtn.onclick = () => open(range);
    keyBtn.onclick = () => showKeyForm(body, () => open(range));
    drag(top, panel);

    const setBusy = b => { busy = b; send.disabled = b; input.disabled = b; };
    const scroll = () => { body.scrollTop = body.scrollHeight; };

    function ask(action, question) {
      if (busy) return;
      if (!asked) { body.textContent = ''; asked = true; }
      body.append(el('div', 'tvai-q', action === 'custom' ? question : ACTIONS.find(a => a.id === action).label));
      const ans = el('div', 'tvai-a'), status = el('div', 'tvai-status', 'Thinking…');
      body.append(status, ans);
      scroll();
      setBusy(true);
      let text = '', raf = 0;
      const render = () => { raf = 0; ans.innerHTML = markdown(text); scroll(); };
      request({ type: 'ask', convId, action, question, context: ctx.text }, msg => {
        if (!panel) return;
        if (msg.type === 'text') { text += msg.text; status.textContent = ''; if (!raf) raf = requestAnimationFrame(render); }
        else if (msg.type === 'status') status.textContent = msg.text;
        else if (msg.type === 'error') { status.remove(); body.append(el('div', 'tvai-err', msg.text)); setBusy(false); scroll(); }
        else if (msg.type === 'done') {
          status.remove(); render();
          if (msg.sources?.length) {
            const s = el('div', 'tvai-src', 'Sources');
            for (const { url, title } of msg.sources) {
              if (!/^https:\/\//.test(url)) continue;
              const a = el('a', '', title || url); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
              s.append(a);
            }
            body.append(s);
          }
          setBusy(false); scroll(); input.focus();
        }
      });
    }

    const submit = () => { const q = input.value.trim(); if (q && ctx && !busy) { input.value = ''; ask('custom', q); } };
    send.onclick = submit;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

    if (!bridge()) {
      setBusy(true);
      body.append(el('div', 'tvai-err', 'Ask Claude is not connected. Close TradingView fully and start it again with the TradingView Enhanced launcher.'));
      return;
    }
    ctx = buildContext(range);
    if (ctx.error) { rangeLine.textContent = ''; setBusy(true); body.append(el('div', 'tvai-err', ctx.error)); return; }
    rangeLine.textContent = ctx.label;

    const showActions = () => {
      body.textContent = '';
      const acts = el('div', 'tvai-acts');
      for (const a of ACTIONS) { const b = el('button', '', a.label); b.onclick = () => ask(a.id); acts.append(b); }
      body.append(acts, el('div', 'tvai-note', 'Read-only: Claude can read these bars and search the web. It cannot place orders, touch your broker, or change the chart.'));
      input.focus();
    };
    setBusy(true);
    request({ type: 'status' }, msg => {
      if (!panel) return;
      setBusy(false);
      if (msg.type === 'status-reply' && msg.hasKey) showActions();
      else { setBusy(true); showKeyForm(body, () => { setBusy(false); showActions(); }); }
    });
  }

  function showKeyForm(body, done) {
    body.textContent = '';
    const box = el('div', 'tvai-key');
    box.append(el('div', '', 'Paste your Claude API key (from console.anthropic.com).'));
    const row = el('div'), inp = el('input'), save = el('button', '', 'Save');
    inp.type = 'password'; inp.placeholder = 'sk-ant-…'; inp.autocomplete = 'off';
    row.append(inp, save);
    const err = el('div', 'tvai-err');
    box.append(row, err, el('small', '', 'Saved only on this PC (claude-key.txt next to the launcher). The key stays in the launcher process and is never put into the TradingView page.'));
    body.append(box);
    inp.focus();
    const go = () => {
      const key = inp.value.trim();
      if (!key) return;
      save.disabled = true;
      request({ type: 'saveKey', key }, msg => {
        save.disabled = false;
        if (msg.type === 'status-reply' && msg.hasKey) { inp.value = ''; done(); }
        else err.textContent = msg.text || 'Could not save the key.';
      });
    };
    save.onclick = go;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  function drag(handle, box) {
    handle.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return;
      const r = box.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
      const move = ev => { box.style.left = `${Math.max(0, Math.min(innerWidth - 60, ev.clientX - dx))}px`; box.style.top = `${Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy))}px`; };
      const up = () => { removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
      addEventListener('mousemove', move); addEventListener('mouseup', up);
      e.preventDefault();
    });
  }

  // "Ask Claude" chip that follows TradingView's range selection.
  const chip = el('button', 'tvai-chip', '✦ Ask Claude');
  chip.style.display = 'none';
  chip.onclick = () => { const r = selectedRange(); if (r) open(r); };
  document.body.appendChild(chip);
  function poll() {
    let r = null;
    try { r = selectedRange(); } catch {}
    if (!r?.src) { chip.style.display = 'none'; return; }
    const cr = chartRect();
    // Sit right under TradingView's own range menu when it's showing; otherwise beside the selection.
    const tvBox = [...document.querySelectorAll('[placeholder^="Ask about this range"]')].find(i => !i.closest('.tvai'));
    const ir = (tvBox?.closest('[class*="miniWindow-"]') || tvBox)?.getBoundingClientRect();
    let x = cr.left + 8, y = cr.top + cr.height * 0.45;
    if (ir?.width) { x = ir.left; y = ir.bottom + 6; }
    else try { const h = r.src.timeAxisHighlight(); if (h && isFinite(h.right)) x = cr.left + h.right + 8; } catch {}
    chip.style.left = `${Math.max(cr.left + 4, Math.min(x, cr.right - 120))}px`;
    chip.style.top = `${Math.min(y, cr.bottom - 60)}px`;
    chip.style.display = '';
  }
  const timer = setInterval(poll, 500);

  const onKey = e => {
    if (e.altKey && e.shiftKey && e.code === 'KeyQ') { e.preventDefault(); e.stopPropagation(); open(); }
  };
  addEventListener('keydown', onKey, true);

  window.__tvAI = {
    receive, open, close, context: r => buildContext(r || selectedRange() || visibleRange()),
    dispose() { clearInterval(timer); removeEventListener('keydown', onKey, true); close(); chip.remove(); css.remove(); },
  };
})();
