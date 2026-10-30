// Injected into the TradingView chart page. One panel for everything, opened from a button in
// TradingView's top toolbar (or a hotkey, Alt+Shift+C by default): Backgrounds, Colors, Templates and Settings tabs.
// Uses window.__tvSkin (skin.js), window.__tvColors (colors.js) and window.__tvTemplates (launch.mjs).
(() => {
  window.__tvPanel?.dispose?.();

  const TABS = [['backgrounds', 'Backgrounds'], ['colors', 'Colors'], ['templates', 'Templates'], ['settings', 'Settings']];
  let tab = 'backgrounds';
  try { if (TABS.some(([id]) => id === localStorage.tvePanelTab)) tab = localStorage.tvePanelTab; } catch {}

  // Close to TradingView's own dark and light dialog colors; picked from the page's theme class when opened.
  const THEME = {
    dark: '--bg:#1e1e1e;--surface:#2a2a2a;--hover:#333;--border:#3a3a3a;--text:#dbdbdb;--muted:#8c8c8c;--input:#141414',
    light: '--bg:#fff;--surface:#f2f2f2;--hover:#ebebeb;--border:#e0e0e0;--text:#131722;--muted:#6a6d78;--input:#fff',
  };
  const CSS = `
    .tve-panel{position:fixed;z-index:99999;width:400px;height:min(560px,80vh);display:flex;flex-direction:column;
      background:var(--bg);color:var(--text);border:1px solid var(--border);border-radius:6px;
      box-shadow:0 2px 4px rgba(0,0,0,.2),0 8px 24px rgba(0,0,0,.4);font:14px -apple-system,BlinkMacSystemFont,"Trebuchet MS",Roboto,Ubuntu,sans-serif;--accent:#2962ff}
    .tve-head{display:flex;align-items:center;gap:8px;padding:16px 16px 8px 20px}
    .tve-title{flex:1;font-size:16px;font-weight:600}
    .tve-ver{color:var(--muted);font-size:12px}
    .tve-x{width:28px;height:28px;border:0;border-radius:4px;background:none;color:var(--muted);cursor:pointer;font-size:16px}
    .tve-x:hover{background:var(--hover);color:var(--text)}
    .tve-tabs{display:flex;gap:4px;padding:0 16px;border-bottom:1px solid var(--border)}
    .tve-tab{padding:10px 8px;border:0;background:none;color:var(--muted);cursor:pointer;font:inherit;border-bottom:2px solid transparent;margin-bottom:-1px}
    .tve-tab:hover{color:var(--text)}
    .tve-tab[aria-selected=true]{color:var(--text);border-bottom-color:var(--accent)}
    .tve-body{flex:1;overflow:auto;padding:16px 20px}
    .tve-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .tve-tile{border:2px solid transparent;border-radius:6px;padding:0;background:none;color:inherit;cursor:pointer;text-align:left;font:inherit}
    .tve-tile canvas,.tve-tile .tve-none{display:block;width:100%;height:92px;border-radius:4px;background:var(--surface)}
    .tve-tile .tve-none{display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px}
    .tve-tile span{display:block;padding:6px 4px}
    .tve-tile:hover canvas,.tve-tile:hover .tve-none{outline:1px solid var(--border)}
    .tve-tile[aria-pressed=true]{border-color:var(--accent)}
    .tve-note{color:var(--muted);font-size:12px;line-height:1.5;margin:12px 0 0}
    .tve-input{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--border);border-radius:6px;background:var(--input);color:var(--text);font:inherit}
    .tve-input:focus{outline:none;border-color:var(--accent)}
    .tve-row{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:4px;cursor:pointer}
    .tve-row:hover{background:var(--hover)}
    .tve-row .tve-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .tve-row .tve-src,.tve-row .tve-on{color:var(--muted);font-size:11px}
    .tve-row .tve-on{color:var(--accent);font-size:14px}
    .tve-sw{display:flex;align-items:flex-end;gap:3px;width:52px;height:22px;padding:0 6px;box-sizing:border-box;border-radius:3px;border:1px solid var(--border)}
    .tve-sw i{width:7px}
    .tve-btns{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
    .tve-btn{padding:7px 14px;border-radius:6px;border:1px solid var(--border);background:none;color:var(--text);cursor:pointer;font:inherit}
    .tve-btn:hover{background:var(--hover)}
    .tve-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
    .tve-btn.primary:hover{background:#1e53e5}
    .tve-btn.danger{color:#f23645}
    .tve-btn:disabled{opacity:.5;cursor:default}
    .tve-chips{display:flex;flex-wrap:wrap;gap:6px}
    .tve-chip{padding:3px 8px;border-radius:4px;background:var(--surface);font-size:12px;color:var(--muted)}
    .tve-chip.on{color:var(--text)}
    .tve-log{white-space:pre-wrap;font:12px monospace;color:var(--muted);margin-top:10px}
    .tve-switch{display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer}
    .tve-switch input{display:none}
    .tve-switch b{position:relative;flex:none;width:34px;height:18px;border-radius:9px;background:var(--border);transition:.15s}
    .tve-switch b:after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:.15s}
    .tve-switch input:checked+b{background:var(--accent)}
    .tve-switch input:checked+b:after{left:18px}
    .tve-h{font-weight:600;margin:18px 0 8px}
    .tve-h:first-child{margin-top:0}
    .tve-keys td{padding:4px 12px 4px 0;color:var(--muted)}
    .tve-keys kbd,.tve-kbd{font:12px inherit;padding:2px 6px;border-radius:4px;background:var(--surface);color:var(--text)}
    .tve-kbd{border:1px solid var(--border);cursor:pointer;min-width:80px;text-align:left}
    .tve-kbd:hover{border-color:var(--muted)}
    .tve-kbd.rec{border-color:var(--accent);color:var(--accent)}
    .tve-link{border:0;background:none;padding:0;color:var(--accent);cursor:pointer;font:12px inherit}
    details.tve-paste{margin-top:12px}
    details.tve-paste summary{cursor:pointer;color:var(--muted);font-size:13px}
    details.tve-paste textarea{height:54px;margin-top:8px;font:12px monospace;resize:vertical}`;

  const el = (tag, props = {}, ...kids) => {
    const e = Object.assign(document.createElement(tag), props);
    for (const k of kids) if (k != null) e.append(k);
    return e;
  };

  let style = null, panel = null, button = null;

  function close() {
    panel?.remove(); panel = null;
    button?.setAttribute('aria-pressed', 'false');
  }

  function open(which) {
    if (which) tab = which;
    if (panel) return render();
    style ||= document.head.appendChild(el('style', { textContent: CSS }));
    const dark = document.documentElement.classList.contains('theme-dark');
    panel = el('div', { className: 'tve-panel' });
    panel.style.cssText = THEME[dark ? 'dark' : 'light'];
    const r = button?.isConnected ? button.getBoundingClientRect() : null;
    panel.style.top = `${r ? r.bottom + 6 : 48}px`;
    panel.style.right = `${r ? Math.max(8, innerWidth - r.right) : 16}px`;
    // Keep TradingView's own hotkeys from firing while typing in the panel.
    panel.addEventListener('keydown', e => { if (e.key !== 'Escape') e.stopPropagation(); });
    document.body.append(panel);
    button?.setAttribute('aria-pressed', 'true');
    render();
  }

  function render() {
    try { localStorage.tvePanelTab = tab; } catch {}
    const tabs = el('div', { className: 'tve-tabs', role: 'tablist' }, ...TABS.map(([id, label]) =>
      el('button', { className: 'tve-tab', role: 'tab', ariaSelected: String(id === tab), textContent: label, onclick: () => { tab = id; render(); } })));
    const body = el('div', { className: 'tve-body' });
    ({ backgrounds, colors, templates, settings })[tab](body);
    panel.replaceChildren(
      el('div', { className: 'tve-head' },
        el('div', { className: 'tve-title', textContent: 'TradingView Enhanced' }),
        el('span', { className: 'tve-ver', textContent: window.__tvVersion ? `v${window.__tvVersion}` : '' }),
        el('button', { className: 'tve-x', textContent: '✕', title: 'Close', onclick: close })),
      tabs, body);
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────
  function backgrounds(body) {
    const skin = window.__tvSkin;
    if (!skin) return body.append(el('p', { className: 'tve-note', textContent: 'Backgrounds aren’t loaded.' }));
    const grid = el('div', { className: 'tve-grid' });
    for (const { id, label } of skin.list()) {
      // skin.js animates any canvas.tv-skin-preview with its data-skin.
      const preview = id === 'off'
        ? el('div', { className: 'tve-none', textContent: 'Plain chart' })
        : el('canvas', { className: 'tv-skin-preview' });
      if (id !== 'off') preview.dataset.skin = id;
      grid.append(el('button', {
        className: 'tve-tile', ariaPressed: String(skin.get() === id),
        onclick: () => { skin.set(id, true); render(); },
      }, preview, el('span', { textContent: label })));
    }
    body.append(grid, el('p', { className: 'tve-note', textContent: 'Tip: with a background on, pick a dark theme in Colors so the price scale and legend match.' }));
  }

  function colors(body) {
    const c = window.__tvColors;
    if (!c) return body.append(el('p', { className: 'tve-note', textContent: 'Colors aren’t loaded.' }));
    const all = c.themes();
    const search = el('input', { className: 'tve-input', placeholder: `Search ${all.length} themes…` });
    const list = el('div', { style: 'margin-top:8px' });
    const msg = el('p', { className: 'tve-note' });
    const draw = () => {
      const q = search.value.toLowerCase(), cur = c.current();
      list.replaceChildren(...all.filter(t => t.name.toLowerCase().includes(q)).map(t => {
        // Theme colors are validated hex in colors.js; names only ever go in as text.
        const sw = el('span', { className: 'tve-sw' },
          el('i', { style: `height:12px;background:${t.bull}` }), el('i', { style: `height:8px;background:${t.bear}` }), el('i', { style: `height:15px;background:${t.bull}` }));
        sw.style.background = t.bg;
        return el('div', { className: 'tve-row', onclick: () => { c.apply(t); draw(); } },
          sw, el('span', { className: 'tve-name', textContent: t.name }),
          t.name === cur ? el('span', { className: 'tve-on', textContent: '✓' }) : el('span', { className: 'tve-src', textContent: t.source }));
      }));
    };
    search.oninput = draw;
    draw();
    const paste = el('textarea', { className: 'tve-input', placeholder: 'Hex colors from chartthemes.com, or: bull bear background text' });
    const details = el('details', { className: 'tve-paste' }, el('summary', { textContent: 'Paste your own colors' }), paste,
      el('div', { className: 'tve-btns' }, el('button', {
        className: 'tve-btn primary', textContent: 'Apply',
        onclick: () => { const t = c.parsePasted(paste.value); msg.textContent = t ? (c.apply(t), 'Applied your colors.') : 'Need at least 4 hex colors like #1A2B3C.'; draw(); },
      })));
    if (!window.__tvChartThemes?.length) msg.textContent = 'Couldn’t load the chartthemes.com list, so only the built-in themes are shown.';
    body.append(search, list, details, msg);
    setTimeout(() => search.focus());
  }

  function templates(body) {
    const T = window.__tvTemplates;
    if (!T) return body.append(el('p', { className: 'tve-note', textContent: 'Templates aren’t loaded.' }));
    const chips = el('div', { className: 'tve-chips' });
    const log = el('div', { className: 'tve-log' });
    const btns = el('div', { className: 'tve-btns' });
    const refresh = async () => {
      const have = {};
      for (const tool of new Set(T.list.map(t => t.tool))) {
        try { have[tool] = await (await fetch(`/drawing-templates/${tool}/`, { credentials: 'same-origin' })).json(); } catch { have[tool] = []; }
      }
      const added = T.list.filter(t => have[t.tool].includes(t.name)).length;
      count.textContent = `${added} of ${T.list.length} added to your TradingView account.`;
      chips.replaceChildren(...T.list.map(t => el('span', { className: `tve-chip${have[t.tool].includes(t.name) ? ' on' : ''}`, textContent: t.name.replace(/^\[TVE\] /, '') })));
    };
    const run = mode => async () => {
      for (const b of btns.children) b.disabled = true;
      log.textContent = 'Working…';
      // TradingView loads each tool's template menu once and keeps it until restart, so a menu
      // that was already opened won't show the change yet.
      try {
        log.textContent = [...await T.install(T.list, mode), '', 'If a drawing tool’s Template menu doesn’t show the change, restart TradingView.'].join('\n');
      } catch (e) { log.textContent = `Failed: ${e.message}`; }
      for (const b of btns.children) b.disabled = false;
      refresh();
    };
    let armed = false;
    const remove = el('button', { className: 'tve-btn danger', textContent: 'Remove all' });
    remove.onclick = () => {
      if (!armed) { armed = true; remove.textContent = 'Click again to remove'; return; }
      armed = false; remove.textContent = 'Remove all'; run('remove')();
    };
    btns.append(
      el('button', { className: 'tve-btn primary', textContent: 'Add to my account', onclick: run('install') }),
      el('button', { className: 'tve-btn', textContent: 'Update', onclick: run('update') }),
      remove);
    const count = el('p', { className: 'tve-note', style: 'margin:0 0 12px' });
    body.append(
      el('p', { style: 'margin:0 0 6px', textContent: 'ICT drawing templates. They show up in each drawing tool’s template menu, starting with [TVE].' }),
      count, chips, btns,
      el('p', { className: 'tve-note', style: 'margin:0', textContent: 'Your own templates are never changed. Update replaces the [TVE] ones with the latest version.' }),
      log);
    refresh();
  }

  function settings(body) {
    const c = window.__tvColors;
    const sw = (label, checked, onchange) => el('label', { className: 'tve-switch' },
      el('input', { type: 'checkbox', checked, onchange: e => onchange(e.target.checked) }), el('b'), el('span', { textContent: label }));
    const K = window.__tvKeys;
    const keys = el('table', { className: 'tve-keys' });
    const keyNote = el('p', { className: 'tve-note', style: 'margin:6px 0 0', textContent: 'Click a hotkey, then press the new keys. Esc cancels.' });
    for (const [name, what] of [['panel', 'Open or close this panel'], ['skin', 'Next background']]) {
      const btn = el('button', { className: 'tve-kbd', textContent: K.label(K.get(name)), title: 'Click to change' });
      btn.onclick = () => record(name, btn);
      const reset = K.get(name) !== K.defaults[name]
        ? el('button', { className: 'tve-link', textContent: 'Reset', onclick: () => { K.set(name, null); render(); } }) : null;
      keys.append(el('tr', {}, el('td', {}, btn), el('td', { textContent: what }), el('td', {}, reset)));
    }
    keys.append(el('tr', {}, el('td', {}, el('kbd', { textContent: 'Esc' })), el('td', { textContent: 'Close this panel' })));

    // Waits for the next key combo. Needs Ctrl, Alt or Win (or an F-key) so it can't steal normal typing.
    function record(name, btn) {
      K.recording = true;
      btn.textContent = 'Press keys…';
      btn.classList.add('rec');
      const done = msg => {
        K.recording = false;
        window.removeEventListener('keydown', onRec, true);
        render();
        if (msg) panel?.querySelector('.tve-keys + .tve-note')?.replaceChildren(msg);
      };
      const onRec = e => {
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Escape') return done();
        const c = K.combo(e);
        if (!(e.ctrlKey || e.altKey || e.metaKey) && !/^F\d+$/.test(e.code)) return done(`${K.label(c)} needs Ctrl, Alt or Win with it (F-keys work alone).`);
        const other = Object.keys(K.defaults).find(n => n !== name && K.get(n) === c);
        if (other) return done(`${K.label(c)} is already used for ${other === 'panel' ? 'opening the panel' : 'next background'}.`);
        K.set(name, c);
        done();
      };
      window.addEventListener('keydown', onRec, true);
    }
    body.append(
      el('div', { className: 'tve-h', textContent: 'Drawings' }),
      c ? sw('Keep drawing text readable', c.autoFix(), on => c.setAutoFix(on)) : null,
      el('p', { className: 'tve-note', style: 'margin:0', textContent: 'Text that’s hard to read on the current background is made lighter or darker, keeping its color. Your original colors come back on backgrounds they read well on.' }),
      el('div', { className: 'tve-h', textContent: 'Hotkeys' }), keys, keyNote,
      el('div', { className: 'tve-h', textContent: 'Updates' }),
      el('p', { className: 'tve-note', style: 'margin:0', textContent: `Version ${window.__tvVersion ?? '?'}. Updates install by themselves when you start TradingView with the TradingView Enhanced shortcut.` }));
  }

  // ── Toolbar button ───────────────────────────────────────────────────────
  // Copies the look of TradingView's own "Quick search" button and sits just before it.
  const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" d="M14 5a9 9 0 0 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 24 11.9C24 8 19.5 5 14 5zm0 1c5.1 0 9 2.7 9 5.9 0 2-1.6 3.6-3.6 3.6H17a3 3 0 0 0-3 3c0 .7.3 1.4.7 1.9.2.2.3.4.3.6 0 .5-.4 1-1 1A8 8 0 0 1 14 6z"/><circle fill="currentColor" cx="9.5" cy="13" r="1.5"/><circle fill="currentColor" cx="12" cy="9.5" r="1.5"/><circle fill="currentColor" cx="16.5" cy="9.5" r="1.5"/><circle fill="currentColor" cx="19.5" cy="12.5" r="1.5"/></svg>';
  function mountButton() {
    const shown = b => b?.isConnected && b.checkVisibility({ visibilityProperty: true });
    if (shown(button)) return;
    const ref = [...document.querySelectorAll('[aria-label="Quick search"], [aria-label="Fullscreen mode"]')].find(shown);
    const group = ref?.parentElement;
    if (!group) return;
    button?.closest('.tve-group')?.remove();
    button = ref.cloneNode(false);
    for (const a of [...button.attributes]) if (a.name.startsWith('data-') || a.name.startsWith('aria-') || a.name === 'id') button.removeAttribute(a.name);
    button.setAttribute('aria-label', 'TradingView Enhanced');
    button.setAttribute('data-tooltip', 'TradingView Enhanced');
    button.setAttribute('aria-pressed', String(!!panel));
    button.innerHTML = ref.innerHTML;
    const svg = button.querySelector('svg');
    if (svg) svg.outerHTML = ICON; else button.innerHTML = ICON;
    button.addEventListener('click', e => { e.stopPropagation(); panel ? close() : open(); });
    const wrap = group.cloneNode(false);
    wrap.classList.add('tve-group');
    wrap.append(button);
    group.before(wrap);
  }
  const mountTimer = setInterval(mountButton, 1000);
  mountButton();

  function onKey(e) {
    if (window.__tvKeys?.recording) return;
    if (window.__tvKeys?.is(e, 'panel')) { e.preventDefault(); e.stopPropagation(); panel ? close() : open(); }
    else if (e.key === 'Escape' && panel) close();
  }
  function onDown(e) {
    if (panel && !panel.contains(e.target) && !button?.contains(e.target)) close();
  }
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('mousedown', onDown, true);
  const onSkin = () => panel && tab === 'backgrounds' && render();
  window.addEventListener('tv-skin-change', onSkin);

  window.__tvPanel = {
    open, close,
    dispose() {
      close(); style?.remove(); button?.closest('.tve-group')?.remove();
      clearInterval(mountTimer);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('tv-skin-change', onSkin);
    },
  };
})();
