// Builds the TradingView Enhanced browser extension (Chrome, Edge, Brave and other Chromium browsers) in the
// extension/ folder next to this file. It loads the same page scripts the launcher injects into TradingView
// Desktop (skin.js, colors.js, panel.js, ai.js) into tradingview.com chart tabs.
//   node extension.mjs    pull the indicators, fetch the color themes, then (re)build extension/
// launch.mjs also rebuilds it on every launch, so it stays current with updates. After a rebuild, click the
// reload button on the extension in the browser's extensions page.
//
// What the extension can do: run those page scripts on tradingview.com/chart pages, and call the Claude API
// (api.anthropic.com) from its background worker for Ask Claude. Nothing else: no other sites, no tabs,
// history, cookies or downloads permissions, and nothing that places, changes or cancels orders.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATES, pageInstall } from './templates.mjs';
import { pull as pullIndicators, load as loadIndicators, pageSave as saveIndicators } from './indicators.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const EXT_DIR = join(here, 'extension');

// chartthemes.com ships its theme list as JSON inside its JS bundle. Fetched fresh each launch;
// if the site changes or is down, the picker still has the built-in presets.
export async function chartThemes() {
  try {
    const html = await (await fetch('https://chartthemes.com/', { signal: AbortSignal.timeout(8000) })).text();
    const src = html.match(/src="(\/static\/js\/main\.[^"]+\.js)"/)[1];
    const js = await (await fetch(`https://chartthemes.com${src}`, { signal: AbortSignal.timeout(8000) })).text();
    const raw = js.match(/JSON\.parse\('(\[\{"created_at".*?\])'\)/)[1];
    return JSON.parse(raw.replace(/\\'/g, "'")).filter(t => !t.is_hidden);
  } catch {
    return [];
  }
}

// The globals the page scripts read (color themes, version, drawing templates, indicators).
export function pageData({ themes, indicators, version }) {
  return [
    `window.__tvChartThemes = ${JSON.stringify(themes)};`,
    `window.__tvVersion = ${JSON.stringify(version)};`,
    `window.__tvTemplates = { list: ${JSON.stringify(TEMPLATES)}, install: ${pageInstall} };`,
    `window.__tvIndicators = { list: ${JSON.stringify(indicators)}, save: ${saveIndicators} };`,
  ].join('\n');
}

const COPY = {
  'skin.js': 'skin.js', 'colors.js': 'colors.js', 'panel.js': 'panel.js', 'ai.js': 'ai.js',
  'page.js': 'ext-page.js', 'bridge.js': 'ext-bridge.js', 'background.js': 'ext-background.js',
  'anthropic.js': 'ext-anthropic.js', 'claude-core.js': 'claude-core.js',
};

export function buildExtension({ themes, indicators, version }) {
  mkdirSync(EXT_DIR, { recursive: true });
  const charts = ['https://*.tradingview.com/chart/*'];
  const manifest = {
    manifest_version: 3,
    name: 'TradingView Enhanced',
    version: `1.0.${Number(version) || 0}`,
    description: 'Chart skins, color themes, ICT drawing templates and indicators, and Ask Claude for TradingView charts.',
    minimum_chrome_version: '111',
    permissions: ['storage'],
    host_permissions: ['https://api.anthropic.com/*'],
    background: { service_worker: 'background.js', type: 'module' },
    content_scripts: [
      { matches: charts, js: ['data.js', 'page.js', 'skin.js', 'colors.js', 'panel.js', 'ai.js'], world: 'MAIN', run_at: 'document_idle' },
      { matches: charts, js: ['bridge.js'], run_at: 'document_idle' },
    ],
  };
  writeFileSync(join(EXT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(EXT_DIR, 'data.js'), pageData({ themes, indicators, version }) + '\n');
  for (const [to, from] of Object.entries(COPY)) writeFileSync(join(EXT_DIR, to), readFileSync(join(here, from)));
  return EXT_DIR;
}

if (process.argv[1]?.endsWith('extension.mjs')) {
  console.log('Indicators:', await pullIndicators());
  const version = JSON.parse(readFileSync(join(here, 'version.json'), 'utf8')).version;
  const dir = buildExtension({ themes: await chartThemes(), indicators: loadIndicators(), version });
  console.log(`Built the browser extension (version ${version}) in:\n  ${dir}`);
  if (!existsSync(join(dir, 'manifest.json'))) process.exitCode = 1;
}
