// Injected into the TradingView chart page. Draws an animated scene behind each chart pane.
// Picked in the panel (panel.js); a hotkey (Alt+Shift+S by default) also cycles skins. The choice is remembered in localStorage.
(() => {
  // Re-injecting replaces the previous copy, so edits apply without restarting TradingView.
  window.__tvSkin?.dispose?.();

  const ORDER = ['synthwave', 'aurora', 'galaxy', 'matrix', 'off'];
  const LABELS = { synthwave: 'Synthwave', aurora: 'Aurora', galaxy: 'Galaxy', matrix: 'Matrix', off: 'None' };
  let current = 'synthwave';
  try { if (ORDER.includes(localStorage.tvSkin)) current = localStorage.tvSkin; } catch {}

  // TradingView paints an opaque background with a full-canvas fillRect. On pane canvases
  // we turn that one call into a clear so the scene underneath shows through.
  const proto = CanvasRenderingContext2D.prototype;
  const origFillRect = (window.__tvSkinOrigFillRect ||= proto.fillRect);
  proto.fillRect = function (x, y, w, h) {
    const c = this.canvas;
    if (c && c.__tvSkinClear && current !== 'off') {
      const t = this.getTransform();
      const X = x * t.a + t.e, Y = y * t.d + t.f, W = w * t.a, H = h * t.d;
      if (X <= 1 && Y <= 1 && X + W >= c.width - 1 && Y + H >= c.height - 1) {
        this.clearRect(x, y, w, h);
        return;
      }
    }
    return origFillRect.call(this, x, y, w, h);
  };

  // Deterministic random so stars and mountains don't jump around on resize.
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  const cache = new WeakMap(); // layer canvas -> { key, bg }
  function cachedBackground(layer, w, h, name, paint) {
    const key = `${name}:${w}x${h}`;
    let c = cache.get(layer);
    if (!c || c.key !== key) {
      const bg = document.createElement('canvas');
      bg.width = w; bg.height = h;
      paint(bg.getContext('2d'), w, h);
      c = { key, bg };
      cache.set(layer, c);
    }
    return c.bg;
  }

  function stars(ctx, w, h, maxY, n, t, seed) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * maxY, s = r() * 1.4 + 0.3, p = r() * 6.28;
      ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.5 + p));
      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  }

  const SKINS = {
    synthwave(ctx, w, h, t, layer, dpr) {
      const horizon = Math.round(h * 0.62);
      const bg = cachedBackground(layer, w, h, 'synthwave', (g, w, h) => {
        const sky = g.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, '#07020f');
        sky.addColorStop(0.55, '#1c0833');
        sky.addColorStop(0.85, '#4a0d4e');
        sky.addColorStop(1, '#a3195b');
        g.fillStyle = sky;
        g.fillRect(0, 0, w, horizon);

        // Sun with retro stripes; stripes are filled with the sky gradient so they read as gaps.
        const cx = w * 0.42, r = h * 0.24, cy = horizon - r * 0.15;
        g.save();
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
        const sun = g.createLinearGradient(0, cy - r, 0, cy + r);
        sun.addColorStop(0, '#ffd27a');
        sun.addColorStop(0.5, '#ff7a6b');
        sun.addColorStop(1, '#ff2a6d');
        g.fillStyle = sun;
        g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = sky;
        for (let i = 0; i < 7; i++) {
          const y = cy + r * (0.05 + i * 0.14), th = r * (0.02 + i * 0.012);
          g.fillRect(cx - r, y, r * 2, th);
        }
        g.restore();

        // Mountain silhouette along the horizon.
        const rr = rng(7);
        g.beginPath(); g.moveTo(0, horizon);
        for (let x = 0; x <= w; x += w / 24) g.lineTo(x, horizon - h * (0.01 + rr() * 0.09) * (0.5 + 0.5 * Math.sin(x / w * 5)));
        g.lineTo(w, horizon); g.closePath();
        g.fillStyle = '#0d0418'; g.fill();
        g.strokeStyle = 'rgba(255,60,140,0.7)'; g.lineWidth = 1.5 * dpr; g.stroke();

        g.fillStyle = '#0a0214';
        g.fillRect(0, horizon, w, h - horizon);
      });
      ctx.drawImage(bg, 0, 0);
      stars(ctx, w, h, horizon * 0.7, 140, t, 42);

      // Perspective grid scrolling toward the viewer.
      ctx.strokeStyle = 'rgba(255,41,117,0.55)';
      ctx.lineWidth = 1 * dpr;
      ctx.beginPath();
      const depth = h - horizon, vx = w / 2;
      for (let i = -30; i <= 30; i++) {
        ctx.moveTo(vx + i * w * 0.004, horizon);
        ctx.lineTo(vx + i * w * 0.12, h);
      }
      const phase = (t * 0.35) % 1;
      for (let i = 0; i < 18; i++) {
        const z = (i + phase) / 18;
        const y = horizon + depth * z * z;
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();
      const glow = ctx.createLinearGradient(0, horizon - h * 0.08, 0, horizon + h * 0.05);
      glow.addColorStop(0, 'rgba(255,41,117,0)');
      glow.addColorStop(0.6, 'rgba(255,41,117,0.35)');
      glow.addColorStop(1, 'rgba(255,41,117,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, horizon - h * 0.08, w, h * 0.13);
    },

    aurora(ctx, w, h, t, layer) {
      const bg = cachedBackground(layer, w, h, 'aurora', (g, w, h) => {
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#020611');
        sky.addColorStop(0.7, '#061a2b');
        sky.addColorStop(1, '#0b2a33');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
      });
      ctx.drawImage(bg, 0, 0);
      stars(ctx, w, h, h * 0.8, 120, t, 9);
      ctx.globalCompositeOperation = 'lighter';
      const bands = [['#19ffb0', 0.32, 0.0], ['#22d3ee', 0.42, 1.7], ['#a855f7', 0.25, 3.1]];
      for (const [col, yy, off] of bands) {
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          // Run past both edges so the thick strokes' end caps stay off-screen.
          for (let i = -6; i <= 66; i++) {
            const x = (i / 60) * w;
            const y = h * yy + Math.sin(x / w * 6 + t * 0.4 + off + k * 0.3) * h * 0.06 + Math.sin(x / w * 13 - t * 0.25 + off) * h * 0.025;
            i === -6 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.strokeStyle = col;
          ctx.globalAlpha = 0.05;
          ctx.lineWidth = h * (0.03 + k * 0.035);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    },

    // Same look as the "Galaxy" Pine indicator: black sky, a 60x35 grid where ~12% of cells
    // get a static glyph star (· • ✦), jittered within the cell, white / pale blue / lavender.
    galaxy(ctx, w, h, t, layer, dpr) {
      const bg = cachedBackground(layer, w, h, 'galaxy', (g, w, h) => {
        g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
        const r = rng(42), cols = 60, rows = 35, cw = w / cols, ch = h / rows;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        for (let row = 0; row < rows; row++) {
          for (let c = 0; c < cols; c++) {
            const star = r(), glyph = r(), size = r(), hx = r(), vy = r(), col = r(), tr = r();
            if (star >= 0.12) continue;
            g.font = `${(size < 0.7 ? 9 : 12) * dpr}px sans-serif`;
            const rgb = col < 0.7 ? '255,255,255' : col < 0.9 ? '173,205,255' : '205,185,255';
            g.fillStyle = `rgba(${rgb},${1 - Math.min(80, Math.max(20, 50 + (tr * 50 - 25))) / 100})`;
            const x = (c + 0.2 + 0.6 * Math.floor(hx * 3) / 2) * cw, y = (row + 0.2 + 0.6 * Math.floor(vy * 3) / 2) * ch;
            g.fillText(glyph < 0.65 ? '·' : glyph < 0.92 ? '•' : '✦', x, y);
          }
        }
      });
      ctx.drawImage(bg, 0, 0);
    },

    matrix(ctx, w, h, t, layer, dpr) {
      ctx.fillStyle = '#020a04';
      ctx.fillRect(0, 0, w, h);
      const size = 16 * dpr, cols = Math.ceil(w / size), rows = Math.ceil(h / size) + 12;
      ctx.font = `${size}px monospace`;
      const glyphs = 'アイウエオカキクケコサシスセソ0123456789$€¥₿';
      const r = rng(3);
      for (let c = 0; c < cols; c++) {
        const speed = 4 + r() * 8, start = r() * rows, len = 6 + Math.floor(r() * 14);
        const head = (start + t * speed) % (rows + len);
        for (let k = 0; k < len; k++) {
          const row = Math.floor(head) - k;
          if (row < 0) continue;
          ctx.fillStyle = k === 0 ? 'rgba(200,255,210,0.55)' : `rgba(0,255,90,${0.28 * (1 - k / len)})`;
          ctx.fillText(glyphs[(c * 7 + row * 13) % glyphs.length], c * size, row * size);
        }
      }
    },
  };

  // Keep a skin layer as the first child of every chart pane, under TradingView's canvases.
  function sync() {
    document.querySelectorAll('.chart-gui-wrapper').forEach(wrap => {
      let layer = wrap.querySelector(':scope > canvas.tv-skin-layer');
      if (!layer) {
        layer = document.createElement('canvas');
        layer.className = 'tv-skin-layer';
        layer.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
        wrap.prepend(layer);
      }
      wrap.querySelectorAll(':scope > canvas:not(.tv-skin-layer)').forEach(c => {
        if (!c.__tvSkinClear) { c.__tvSkinClear = true; redraw(); }
      });
    });
  }

  let redrawQueued = false;
  function redraw() {
    if (redrawQueued) return;
    redrawQueued = true;
    setTimeout(() => { redrawQueued = false; window.dispatchEvent(new Event('resize')); }, 50);
  }

  let last = 0, alive = true;
  function frame(now) {
    if (!alive) return;
    requestAnimationFrame(frame);
    if (document.hidden || now - last < 33) return;
    last = now;
    const t = now / 1000, dpr = window.devicePixelRatio || 1;
    // Chart layers show the current skin; the panel's preview tiles each show their own.
    document.querySelectorAll('canvas.tv-skin-layer, canvas.tv-skin-preview').forEach(layer => {
      const skin = layer.dataset.skin || current;
      const w = Math.round(layer.clientWidth * dpr), h = Math.round(layer.clientHeight * dpr);
      if (!w || !h) return;
      if (layer.width !== w || layer.height !== h) { layer.width = w; layer.height = h; }
      // Never hide the layer itself: a display:none canvas measures 0x0 and would never come back.
      const ctx = layer.getContext('2d');
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      try { if (SKINS[skin]) SKINS[skin](ctx, w, h, t, layer, dpr); } catch (e) { console.warn('[tv-skin]', e); }
      ctx.restore();
    });
  }

  function toast(text) {
    if (!document.body) return;
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:99999;padding:6px 14px;border-radius:8px;background:rgba(0,0,0,.8);color:#fff;font:600 13px system-ui;pointer-events:none;transition:opacity .4s';
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 1200);
  }

  function set(name, quiet) {
    current = name;
    try { localStorage.tvSkin = name; } catch {}
    redraw();
    if (!quiet) toast(`Chart skin: ${LABELS[name]}`);
    window.dispatchEvent(new Event('tv-skin-change'));
  }

  // Hotkeys, shared with panel.js and changeable in its Settings tab. Stored as e.g. "Alt+Shift+KeyS":
  // modifiers, then KeyboardEvent.code (so it works the same on any keyboard layout).
  const KEY_DEFAULTS = { panel: 'Alt+Shift+KeyC', skin: 'Alt+Shift+KeyS' };
  const saved = () => { try { return JSON.parse(localStorage.tveKeys || '{}'); } catch { return {}; } };
  const keys = {
    defaults: KEY_DEFAULTS,
    recording: false,
    get: name => saved()[name] || KEY_DEFAULTS[name],
    set(name, value) {
      const k = saved();
      if (value && value !== KEY_DEFAULTS[name]) k[name] = value; else delete k[name];
      try { localStorage.tveKeys = JSON.stringify(k); } catch {}
    },
    combo: e => [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Win', e.code].filter(Boolean).join('+'),
    is: (e, name) => !keys.recording && keys.combo(e) === keys.get(name),
    label: c => c.replace(/(^|\+)(?:Key|Digit)(\w)$/, '$1$2'),
  };
  window.__tvKeys = keys;

  function onKey(e) {
    if (keys.is(e, 'skin')) {
      e.preventDefault();
      e.stopPropagation();
      set(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
    }
  }
  window.addEventListener('keydown', onKey, true);

  const syncTimer = setInterval(sync, 1000);
  sync();
  requestAnimationFrame(frame);

  function dispose() {
    alive = false;
    clearInterval(syncTimer);
    window.removeEventListener('keydown', onKey, true);
    document.querySelectorAll('canvas.tv-skin-layer').forEach(l => l.remove());
  }
  // Roughly what color sits behind the chart for each skin, so colors.js can keep drawing text readable.
  const BACKDROP = { synthwave: '#1c0833', aurora: '#061a2b', galaxy: '#000000', matrix: '#020a04' };
  window.__tvSkin = { set, get: () => current, list: () => ORDER.map(id => ({ id, label: LABELS[id] })), backdrop: () => BACKDROP[current] || null, dispose };
})();
