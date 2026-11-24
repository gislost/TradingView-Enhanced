// Closes TradingView's upgrade and sale popups (like "Analyze markets in TradingView Desktop ... Explore Black
// Friday offers"). On Desktop they sometimes come without a close button, so the only way out was closing the
// layout. Only popups that read like a plan upsell are touched: they must match at least two of the phrases below.
// It can be turned off in the panel's Settings tab.
(() => {
  window.__tvPromo?.dispose?.();

  let on = true;
  try { on = localStorage.tvePromoBlock !== '0'; } catch {}

  const PHRASES = [
    /Current plan[\s\S]{0,200}Recommended/i,
    /Upgrade (your )?plan/i,
    /\b(Explore|Get|See|Claim)\b[^.\n]{0,40}\b(offers?|deals?|discount)\b/i,
    /\b(Black Friday|Cyber Monday|holiday|anniversary|limited[- ]time)\b[^.\n]{0,40}\b(offers?|deals?|sale|discount)\b/i,
    /-\s?\d{1,2}\s?%/,
  ];
  const isPromo = text => text.length < 4000 && PHRASES.filter(r => r.test(text)).length >= 2;

  // Never touch anything that holds the chart or the trading panel.
  const PROTECTED = '.chart-gui-wrapper, .layout__area--center, [class*="bottom-widgetbar"], [data-name="order-panel"]';
  const overlayRoot = () => document.getElementById('overlap-manager-root');

  // The outermost element of the popup: climb while the parent is still only the popup.
  function outermost(el) {
    const root = overlayRoot();
    while (el.parentElement && el.parentElement !== document.body && el.parentElement !== root
      && !el.parentElement.querySelector(PROTECTED)) el = el.parentElement;
    return el;
  }

  function candidates() {
    const set = new Set();
    const root = overlayRoot();
    if (root) for (const c of root.children) set.add(c);
    document.querySelectorAll('[role="dialog"], [class*="dialog"], [class*="modal"], [class*="popup"]').forEach(e => set.add(e));
    return set;
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:99999;padding:6px 14px;border-radius:8px;background:rgba(0,0,0,.8);color:#fff;font:600 13px system-ui;pointer-events:none;transition:opacity .4s';
    t.textContent = msg;
    document.body.append(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 1800);
  }

  const handled = new WeakSet();
  function close(el) {
    handled.add(el);
    // Let TradingView close it its own way first: its close button, or Escape. Hide it if that didn't work.
    const x = el.querySelector('[data-name="close"], [data-name="close-button"], [aria-label="Close" i], button[class*="close" i]');
    if (x) x.click();
    else el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
    setTimeout(() => {
      if (el.isConnected && el.offsetParent !== null) el.style.setProperty('display', 'none', 'important');
      toast('Closed a TradingView upgrade popup');
    }, 400);
  }

  function scan() {
    if (!on) return;
    for (const c of candidates()) {
      if (handled.has(c) || c.offsetParent === null || c.closest('[class*="tve"]') || c.matches(PROTECTED) || c.querySelector(PROTECTED)) continue;
      if (!isPromo(c.innerText || '')) continue;
      const el = outermost(c);
      if (!handled.has(el)) close(el);
    }
  }

  let queued = false;
  const obs = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    setTimeout(() => { queued = false; scan(); }, 300);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  scan();

  window.__tvPromo = {
    enabled: () => on,
    setEnabled(v) { on = !!v; try { localStorage.tvePromoBlock = on ? '1' : '0'; } catch {} scan(); },
    scan,
    dispose() { obs.disconnect(); },
  };
})();
