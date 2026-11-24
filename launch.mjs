// Starts TradingView Desktop with a local debug port and injects skin.js, colors.js, panel.js and ai.js into every chart tab.
// Also pulls the Pine indicators in the repo's indicators/ folder for the panel's Indicators tab,
// and rebuilds the browser extension in extension/ (see extension.mjs).
// Exits on its own when TradingView closes.
import { readFileSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pull as pullIndicators, load as loadIndicators } from './indicators.mjs';
import { chartThemes, pageData, buildExtension } from './extension.mjs';

const PORT = 9222;
const BASE = `http://127.0.0.1:${PORT}`;
const here = dirname(fileURLToPath(import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

const themes = await chartThemes();
// Pine indicators from the repo's indicators/ folder (see indicators.mjs).
console.log('Indicators:', await pullIndicators());
const indicators = loadIndicators();
const version = JSON.parse(readFileSync(join(here, 'version.json'), 'utf8')).version;
// Keep the browser extension (extension/) in step with this version too.
try { buildExtension({ themes, indicators, version }); } catch (e) { console.log('Browser extension not rebuilt:', e.message); }
const skin = [
  pageData({ themes, indicators, version }),
  readFileSync(join(here, 'skin.js'), 'utf8'),
  readFileSync(join(here, 'colors.js'), 'utf8'),
  readFileSync(join(here, 'panel.js'), 'utf8'),
  readFileSync(join(here, 'ai.js'), 'utf8'),
].join('\n');

// "Ask Claude" bridge (claude.mjs). Needs the Anthropic SDK; installed on first run. If that fails,
// everything else still works and the Ask Claude popup says what's wrong.
async function loadClaude() {
  try { return await import('./claude.mjs'); } catch {}
  try {
    console.log('Installing the Anthropic SDK for Ask Claude...');
    execSync('npm install --no-fund --no-audit', { cwd: here, stdio: 'ignore' });
    return await import('./claude.mjs');
  } catch (e) {
    console.log('Ask Claude unavailable:', e.message);
    return null;
  }
}
const claude = await loadClaude();

async function targets() {
  try { return await (await fetch(`${BASE}/json/list`)).json(); } catch { return null; }
}

if (!(await targets())) {
  const running = execSync('tasklist /FI "IMAGENAME eq TradingView.exe" /NH').toString().includes('TradingView.exe');
  if (running) {
    console.log('TradingView is already running without the skin port. Close it fully (tray too), then run this again.');
    process.exit(1);
  }
  const dir = execSync('powershell -NoProfile -Command "(Get-AppxPackage TradingView.Desktop).InstallLocation"').toString().trim();
  spawn(join(dir, 'TradingView.exe'), [`--remote-debugging-port=${PORT}`], { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 60 && !(await targets()); i++) await sleep(500);
}

// Each attached tab is re-checked every loop: if the page was still loading when we first injected,
// the panel can be missing, so inject again (a few times at most, so a broken script can't stack up).
// Re-injecting is safe because skin.js, colors.js and panel.js each dispose their previous instance first.
const attached = new Map();
function attach(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0, checkId = 0, retries = 0;
  const send = (method, params) => { ws.send(JSON.stringify({ id: ++id, method, params })); return id; };
  // Page -> Node: the page calls window.__tvClaude(json). Node -> page: window.__tvAI.receive(obj).
  const reply = obj => {
    if (ws.readyState === WebSocket.OPEN) send('Runtime.evaluate', { expression: `window.__tvAI?.receive(${JSON.stringify(obj)})` });
  };
  ws.onopen = () => {
    if (claude) {
      send('Runtime.enable');
      send('Runtime.addBinding', { name: '__tvClaude' });
    }
    send('Page.addScriptToEvaluateOnNewDocument', { source: skin });
    send('Runtime.evaluate', { expression: skin });
  };
  ws.onmessage = m => {
    const r = JSON.parse(m.data);
    if (r.method === 'Runtime.bindingCalled' && r.params?.name === '__tvClaude') return claude?.handle(r.params.payload, reply);
    if (r.id === checkId && r.result?.result?.value === false && retries++ < 3) send('Runtime.evaluate', { expression: skin });
  };
  ws.onclose = () => attached.delete(t.id);
  attached.set(t.id, () => {
    if (ws.readyState === WebSocket.OPEN) checkId = send('Runtime.evaluate', { expression: '!!window.__tvPanel', returnByValue: true });
  });
}

let misses = 0;
while (misses < 3) {
  const list = await targets();
  if (!list) { misses++; await sleep(2000); continue; }
  misses = 0;
  for (const t of list) {
    if (t.type === 'page' && /tradingview\.com/.test(t.url) && !attached.has(t.id)) attach(t);
  }
  for (const check of attached.values()) check();
  await sleep(2000);
}
