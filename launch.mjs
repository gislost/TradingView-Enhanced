// Starts TradingView Desktop with a local debug port and injects skin.js into every chart tab.
// Exits on its own when TradingView closes.
import { readFileSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 9222;
const BASE = `http://127.0.0.1:${PORT}`;
const here = dirname(fileURLToPath(import.meta.url));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// chartthemes.com ships its theme list as JSON inside its JS bundle. Fetched fresh each launch;
// if the site changes or is down, the picker still has the built-in presets.
async function chartThemes() {
  try {
    const html = await (await fetch('https://chartthemes.com/')).text();
    const src = html.match(/src="(\/static\/js\/main\.[^"]+\.js)"/)[1];
    const js = await (await fetch(`https://chartthemes.com${src}`)).text();
    const raw = js.match(/JSON\.parse\('(\[\{"created_at".*?\])'\)/)[1];
    return JSON.parse(raw.replace(/\\'/g, "'")).filter(t => !t.is_hidden);
  } catch {
    return [];
  }
}

const themes = await chartThemes();
const skin = [
  `window.__tvChartThemes = ${JSON.stringify(themes)};`,
  readFileSync(join(here, 'skin.js'), 'utf8'),
  readFileSync(join(here, 'colors.js'), 'utf8'),
].join('\n');

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

const attached = new Set();
function attach(t) {
  attached.add(t.id);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0;
  const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params }));
  ws.onopen = () => {
    send('Page.addScriptToEvaluateOnNewDocument', { source: skin });
    send('Runtime.evaluate', { expression: skin });
  };
  ws.onclose = () => attached.delete(t.id);
}

let misses = 0;
while (misses < 3) {
  const list = await targets();
  if (!list) { misses++; await sleep(2000); continue; }
  misses = 0;
  for (const t of list) {
    if (t.type === 'page' && /tradingview\.com/.test(t.url) && !attached.has(t.id)) attach(t);
  }
  await sleep(2000);
}
