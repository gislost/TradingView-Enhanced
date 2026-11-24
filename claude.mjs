// Node side of "Ask Claude" for the launcher (ai.js is the page side; the logic is in claude-core.js).
// Holds the API key in claude-key.txt (or ANTHROPIC_API_KEY), so the key never enters the TradingView page.
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClaude, MODEL } from './claude-core.js';

const here = dirname(fileURLToPath(import.meta.url));
const KEY_FILE = join(here, 'claude-key.txt');

export const handle = createClaude({
  Anthropic,
  model: process.env.TVE_CLAUDE_MODEL || MODEL,
  getKey() {
    if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
    try { return readFileSync(KEY_FILE, 'utf8').trim() || null; } catch { return null; }
  },
  saveKey: key => writeFileSync(KEY_FILE, key + '\n'),
  keyNote: 'Saved only on this PC (claude-key.txt next to the launcher). The key stays in the launcher process and is never put into the TradingView page.',
});
