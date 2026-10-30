// Checks for a newer version of these files, downloads it if there is one, then starts launch.mjs.
// Where to look is set in update.json: { "source": "https://raw.githubusercontent.com/<you>/<repo>/main/" }.
// No source, no internet, or anything odd in the download: it just launches what's already here.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const readJson = f => { try { return JSON.parse(readFileSync(join(here, f), 'utf8')); } catch { return {}; } };
// Plain file names only, so a bad manifest can't write outside this folder.
const SAFE_NAME = /^[\w][\w .-]*\.(mjs|js|json|md|cmd)$/;

async function update() {
  let { source } = readJson('update.json');
  if (!source || !/^https:\/\//.test(source)) return;
  if (!source.endsWith('/')) source += '/';
  const local = readJson('version.json').version || 0;
  const get = async f => {
    const r = await fetch(source + encodeURI(f), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
    return r.text();
  };
  const remote = JSON.parse(await get('version.json'));
  if (!(remote.version > local)) return;
  if (!Array.isArray(remote.files) || !remote.files.every(f => typeof f === 'string' && SAFE_NAME.test(f))) {
    throw new Error('version.json lists an unexpected file name');
  }
  // Download everything first, so a dropped connection never leaves a half-updated mix.
  const files = await Promise.all(remote.files.map(async f => [f, await get(f)]));
  for (const [f, text] of files) {
    if (f === 'update.json' && existsSync(join(here, f))) continue; // keep the local source setting
    writeFileSync(join(here, f), text);
  }
  writeFileSync(join(here, 'version.json'), JSON.stringify(remote, null, 2) + '\n');
  console.log(`Updated to version ${remote.version}.`);
}

try { await update(); } catch (e) { console.log(`Update check skipped: ${e.message}`); }
await import(pathToFileURL(join(here, 'launch.mjs')).href);
