// Node side of "Ask Claude" (ai.js is the page side). Holds the API key and talks to the Claude API,
// so the key never enters the TradingView page.
//
// Read-only by design: Claude gets one tool, Anthropic's server-side web search. It has no tools that touch
// the chart, TradingView, or any brokerage, and its answers are only ever displayed as text, never executed.
// The page can send exactly four request types (status, saveKey, ask, reset); anything else is ignored.
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const KEY_FILE = join(here, 'claude-key.txt');
const MODEL = process.env.TVE_CLAUDE_MODEL || 'claude-opus-5-5';

const SYSTEM = `You are an ICT (Inner Circle Trader) analyst built into the user's TradingView chart. The user trades ICT concepts, so read price the way they do and use ICT vocabulary.

You receive the symbol, timeframe and OHLCV bars as CSV, with times in New York time (America/New_York), covering the selected range plus lookback bars before it. You also get key levels computed from the loaded bars (previous day high/low, Asia and London session highs/lows, the range's high/low/equilibrium). Bars marked "in" are inside the selection.

Frame your reading with:
- Time: the killzone or session each key move happened in (Asia 20:00-00:00, London 02:00-05:00, NY AM 07:00-10:00 with 08:30 news and the 09:30 open, Silver Bullet 10:00-11:00 and 14:00-15:00, NY PM 13:30-16:00), and the daily Power of 3 (accumulation, manipulation/Judas swing, distribution).
- Liquidity: buy-side and sell-side liquidity, equal highs/lows, old highs/lows, which pools were swept or raided, and what the draw on liquidity was.
- Structure: market structure shifts and breaks of structure with displacement, swing points, CHoCH.
- PD arrays: fair value gaps (check them yourself from the bars: candle 1 high below candle 3 low, or the reverse), order blocks, breakers, mitigation blocks, inversion FVGs, premium vs discount relative to the dealing range, OTE (62-79% retracement), consequent encroachment.
- Context when relevant: SMT divergence with correlated markets (say you cannot see the other chart unless you searched), NWOG/NDOG, CBDR, and high-impact news (CPI, NFP, FOMC, etc.).

Ground every claim in the bars you were given or in sources you found with web search, and cite specific NY times and prices. Do not invent levels that are not in the data. Be concise: short sections with bullets, roughly 250-350 words unless the user asks for more. Markdown bold, bullets and short headings are fine; no tables.

You can only read and explain. You cannot place, modify or cancel orders, cannot draw on or change the chart, and have no access to any brokerage or account; if asked to trade, say so plainly. This is analysis of price action for the user's own study, not personalized financial advice.`;

const PROMPTS = {
  explain: 'Explain this price move through an ICT lens: which liquidity was taken first, where displacement and the market structure shift happened, which PD array price delivered from or into, what the draw on liquidity was, and which killzone or session each step happened in.',
  events: 'Find the news, scheduled releases or macro events that most likely drove this move. Search the web for what happened to this instrument and related markets at these exact dates and NY times (pay special attention to 08:30, 10:00 and 14:00 releases), and tie each event to the bars by time. If there is no clear catalyst, say so plainly instead of guessing; it may have been a pure liquidity run.',
  levels: 'Map the PD arrays and liquidity in this area: unfilled or partially filled fair value gaps, order blocks, breakers, equal highs/lows and other resting liquidity, the dealing range with premium/discount and the OTE zone. Give exact price levels with the bar time that formed each one, and say which have already been mitigated or swept.',
  bias: 'Based on this range and the bars after it, what is the ICT narrative: daily bias, current draw on liquidity, where we are in Power of 3, and which levels would confirm or invalidate the narrative. Describe it as a reading of the chart for study, not a trade instruction.',
};

function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try { return readFileSync(KEY_FILE, 'utf8').trim() || null; } catch { return null; }
}

let client = null, clientKey = null;
function getClient() {
  const key = apiKey();
  if (!key) return null;
  if (key !== clientKey) { client = new Anthropic({ apiKey: key }); clientKey = key; }
  return client;
}

// Full conversation per chat (assistant turns kept exactly as returned, so follow-ups stay valid).
const convos = new Map();

function errorText(e) {
  if (e instanceof Anthropic.AuthenticationError) return 'Your API key was rejected. Paste a new one with the key button.';
  if (e instanceof Anthropic.PermissionDeniedError) return 'This API key is not allowed to use that model.';
  if (e instanceof Anthropic.RateLimitError) return 'Rate limited by the Claude API. Wait a moment and try again.';
  if (e instanceof Anthropic.BadRequestError) return `Claude API rejected the request: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Could not reach the Claude API. Check your internet connection.';
  if (e instanceof Anthropic.APIError) return `Claude API error ${e.status ?? ''}: ${e.message}`;
  return String(e?.message || e);
}

async function ask({ id, convId, action, question, context }, emit) {
  const c = getClient();
  if (!c) return emit({ id, type: 'error', text: 'No API key yet. Paste your Claude API key first.' });

  let messages = convos.get(convId);
  const request = action === 'custom' ? String(question || '').slice(0, 4000) : PROMPTS[action];
  if (!request) return emit({ id, type: 'error', text: 'Unknown request.' });
  if (!messages) {
    messages = [];
    convos.set(convId, messages);
    messages.push({ role: 'user', content: `<chart_context>\n${String(context || '').slice(0, 200000)}\n</chart_context>\n\n${request}` });
  } else {
    messages.push({ role: 'user', content: request });
  }

  const sources = new Map();
  try {
    // A long web-search turn can pause; send it back so the server continues (bounded).
    for (let round = 0; round < 4; round++) {
      const stream = c.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        system: SYSTEM,
        output_config: { effort: 'medium' },
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 5 }],
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages,
      });
      stream.on('text', text => emit({ id, type: 'text', text }));
      const msg = await stream.finalMessage();
      messages.push({ role: 'assistant', content: msg.content });
      for (const b of msg.content) {
        if (b.type === 'server_tool_use' && b.name === 'web_search') emit({ id, type: 'status', text: `Searching: ${b.input?.query ?? ''}` });
        if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
          for (const r of b.content) if (r.url && !sources.has(r.url)) sources.set(r.url, r.title || r.url);
        }
      }
      if (msg.stop_reason === 'pause_turn') continue;
      if (msg.stop_reason === 'refusal') emit({ id, type: 'error', text: 'Claude declined to answer this one.' });
      if (msg.stop_reason === 'max_tokens') emit({ id, type: 'text', text: '\n\n_(answer cut off at the length limit)_' });
      break;
    }
    emit({ id, type: 'done', sources: [...sources].slice(0, 8).map(([url, title]) => ({ url, title })) });
  } catch (e) {
    // Drop the unanswered user turn so the chat can continue cleanly.
    if (messages.at(-1)?.role === 'user') messages.pop();
    if (!messages.length) convos.delete(convId);
    emit({ id, type: 'error', text: errorText(e) });
  }
}

// payload: JSON string from the page's window.__tvClaude binding. emit(obj) sends a reply back to that tab.
export function handle(payload, emit) {
  let req;
  try { req = JSON.parse(payload); } catch { return; }
  if (!req || typeof req !== 'object') return;
  switch (req.type) {
    case 'status':
      return emit({ id: req.id, type: 'status-reply', hasKey: !!apiKey(), fromEnv: !!process.env.ANTHROPIC_API_KEY, keyFile: KEY_FILE, model: MODEL });
    case 'saveKey': {
      const key = String(req.key || '').trim();
      if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key)) return emit({ id: req.id, type: 'error', text: 'That does not look like a Claude API key (it starts with sk-ant-).' });
      writeFileSync(KEY_FILE, key + '\n');
      return emit({ id: req.id, type: 'status-reply', hasKey: true, keyFile: KEY_FILE, model: MODEL });
    }
    case 'reset':
      convos.delete(req.convId);
      return;
    case 'ask':
      return ask(req, emit);
  }
}
