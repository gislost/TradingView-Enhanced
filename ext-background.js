// Browser extension, background worker. Runs Ask Claude (claude-core.js) with the official Anthropic SDK
// (anthropic.js, bundled from @anthropic-ai/sdk). The API key is kept in the extension's own storage and
// never reaches the TradingView page. Read-only: Claude's only tool is web search, as in the launcher.
import Anthropic from './anthropic.js';
import { createClaude } from './claude-core.js';

// The worker is stopped when idle, so chats are kept in session storage (cleared when the browser closes)
// and follow-up questions still have the earlier answers.
const KEEP = 10;
const convos = new Map();
const ready = chrome.storage.session.get('convos')
  .then(r => { for (const [k, v] of r.convos || []) convos.set(k, v); })
  .catch(() => {});
const persist = () => {
  while (convos.size > KEEP) convos.delete(convos.keys().next().value);
  chrome.storage.session.set({ convos: [...convos] }).catch(() => {});
};

const handle = createClaude({
  Anthropic,
  getKey: async () => (await chrome.storage.local.get('claudeKey')).claudeKey || null,
  saveKey: key => chrome.storage.local.set({ claudeKey: key }),
  keyNote: 'Saved only in this browser, in the TradingView Enhanced extension. The key stays in the extension and is never put into the TradingView page.',
  convos,
  persist,
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'claude' || !/^https:\/\/([\w-]+\.)*tradingview\.com$/.test(port.sender?.origin || '')) return port.disconnect();
  port.onMessage.addListener(async payload => {
    if (typeof payload !== 'string') return;
    await ready;
    handle(payload, obj => { try { port.postMessage(obj); } catch {} });
  });
});
