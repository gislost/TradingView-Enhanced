// Browser extension, content-script side (the extension's isolated world on the TradingView page).
// Relays Ask Claude requests from the page (ext-page.js) to the background worker (ext-background.js), which
// holds the API key, and sends its replies back. Only strings are passed on, and only the four request
// types claude-core.js accepts do anything there.
(() => {
  const TAG = 'tve-ext';
  let port = null;
  const connect = () => {
    port = chrome.runtime.connect({ name: 'claude' });
    port.onMessage.addListener(msg => window.postMessage({ [TAG]: 'to-page', msg }, location.origin));
    port.onDisconnect.addListener(() => { port = null; });
    return port;
  };
  window.addEventListener('message', e => {
    if (e.source !== window || e.origin !== location.origin || e.data?.[TAG] !== 'to-ext') return;
    const payload = e.data.payload;
    if (typeof payload !== 'string' || payload.length > 400000) return;
    // The worker may have been stopped while idle, which closes the port; reconnect once.
    try { (port || connect()).postMessage(payload); } catch { connect().postMessage(payload); }
  });
})();
