// Browser extension, page side (runs in the TradingView page before ai.js). Gives ai.js the same
// window.__tvClaude(json) it gets from the launcher, but passes requests to the extension's bridge
// (ext-bridge.js) with window.postMessage. Replies come back the same way and go to window.__tvAI.receive().
(() => {
  const TAG = 'tve-ext';
  window.__tvClaude = payload => window.postMessage({ [TAG]: 'to-ext', payload: String(payload) }, location.origin);
  window.addEventListener('message', e => {
    if (e.source !== window || e.origin !== location.origin || e.data?.[TAG] !== 'to-page') return;
    window.__tvAI?.receive(e.data.msg);
  });
})();
