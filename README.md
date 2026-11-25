# TradingView Enhanced

Chart skins, a chart color picker, readable drawing text and ICT drawing templates for TradingView Desktop, or for tradingview.com in Chrome, Edge or Brave.

## Install

1. Install [Node.js](https://nodejs.org/en/download) (the LTS version). If you skip this, the launcher tells you and opens the download page.
2. Download the zip from the [latest release](https://github.com/gislost/TradingView-Enhanced/releases/latest) and unzip it somewhere you'll keep it, like `C:\Users\<you>\TradingView-Enhanced`.
3. Double-click **TradingView Skinned.cmd**. If TradingView is already open, it closes it and opens it again with the mod.

The first run also adds a **TradingView Enhanced** shortcut to your desktop and Start menu, with a message saying how to pin it. Use that from then on. To pin it, open Start, find **TradingView Enhanced** under All apps, right-click it and choose **Pin to taskbar**. (Versions before 16 used a small `TradingView Enhanced.exe` instead. Windows Defender's machine-learning check can mistake it for a trojan and quarantine it along with its shortcuts, so it's gone now. If that happened to you, double-click **TradingView Skinned.cmd** once to get the new shortcuts, then pin again.) Don't pin the TradingView icon that shows while it's running: that one opens TradingView without the mod. If TradingView is already running with the mod, it brings TradingView to the front.

It updates itself: each time you start TradingView this way, it downloads the newest version if there is one.

The palette button, backgrounds and hotkeys only work when TradingView was started this way. If you open TradingView normally, only the chart color themes stay. While it's running, a minimized "TradingView skins" window stays open. That's the launcher, and it closes by itself when TradingView closes. If something doesn't start, `tve-launch.log` and `tve-launcher.log` in the same folder say what happened.

### In a browser (Chrome, Edge, Brave)

TradingView Enhanced also works on tradingview.com as a browser extension, with the same panel, skins, colors, templates, indicators and Ask Claude.

1. Do steps 1 and 2 above (Node.js, and the unzipped folder).
2. Double-click **TVE Browser Extension.cmd**. It updates TradingView Enhanced and builds the extension in the `extension` folder. It doesn't open or change your browser.
3. In your browser, open `chrome://extensions` (Edge: `edge://extensions`), turn on **Developer mode**, click **Load unpacked** and pick that `extension` folder.
4. Reload your TradingView chart tab. The palette button shows in the top toolbar.

Updating: run **TVE Browser Extension.cmd** again (starting TradingView Desktop with the launcher also rebuilds it), then click the reload button on **TradingView Enhanced** in the extensions page and reload the chart tab.

The extension only runs on `tradingview.com/chart` pages. Its only other permission is `api.anthropic.com`, for Ask Claude. It can't read other sites, your tabs, history or cookies, and it can't place, change or cancel orders. For Ask Claude, the browser keeps its own copy of your API key in the extension's storage (paste it once in the Ask Claude popup), never in the TradingView page.

## Use

Click the palette button in TradingView's top toolbar (next to the search button), or press **Alt+Shift+C**. It opens the TradingView Enhanced panel:

- **Backgrounds**: animated chart backgrounds (Synthwave, Aurora, Galaxy, Matrix) or none. **Alt+Shift+S** cycles them without opening the panel.
- **Colors**: chart color themes (built-in ones plus the chartthemes.com collection), or paste your own hex colors. These change the chart's own colors, so they stay after TradingView restarts, even without the launcher.
- **Templates**: add the ICT drawing templates to your account, update them, or remove them. They all start with `[TVE]`, so they're easy to tell apart from your own, and your own templates are never changed or deleted. The gaps that stay relevant (NWOG, NDOG and the first presented gaps FPFVG, FPRFVG and FPDFVG) extend right with their label, so they stay on the chart as reference levels; group them in Object Tree folders to show or hide them together. After an update, click **Update** here to get the new versions.
- **Indicators**: Pine indicators from this repo's `indicators/` folder, saved to your account as private scripts. See [Indicators](#indicators) below.
- **Settings**: "Keep drawing text readable" makes drawing text that's hard to read on the current background lighter or darker (same hue). Your original colors come back on backgrounds they read well on.

You can change both hotkeys in **Settings**: click one and press the new keys. Esc or clicking outside closes the panel.

### Indicators

Each time it starts, the launcher downloads every `.pine` file in the repo's `indicators/` folder into the local `indicators` folder. Files that only exist on your PC are kept, so you can also drop your own there. In the panel, **Indicators** → **Save / update in my TradingView** compiles each one and saves it as a private script; only scripts with the same names are changed. Then add them from **Indicators → My scripts** on the chart. TradingView keeps that list until it restarts, so restart it to see new scripts or updates.

- **TVE First Presented FVGs**: for the New York session, it shows FPFVG (the first FVG in 09:30–10:00), FPDFVG (the first one with a displacement candle), FPRFVG (the first opposite FVG after the FPFVG) and SB FPFVG (the first FVG in the 10:00–11:00 Silver Bullet window). They extend right with a CE line, with their names at the right edge next to the price scale, and the last 5 days are shown by default. Gaps are found on 1-minute candles whatever the chart's timeframe (**Find gaps on** in Settings), so they stay the same when you switch timeframes, and the boxes end on the latest candle so they don't disappear when you zoom. Each type has its own on/off switch and color, and the windows and the displacement size can be changed.
  - **Fix a day**: picking the FPFVG is discretionary, so Settings has 5 correction slots. Set a slot to *Use this candle* and choose the type and the date and time of the gap's middle candle, and that gap replaces the automatic pick for that day (its label gets a ✎). *Hide that day* removes that type for that day.
- **TVE NDOG NWOG**: New Day and New Week Opening Gaps, extended right with a CE line and their names at the right edge. Keeps the last 5 NDOGs and 4 NWOGs, and each can be turned off.
- **TVE ORG**: the Opening Range Gap, between the previous regular-session close (16:15 New York for index futures) and the 09:30 open. **Grade lines** draws quadrants (25/50/75%), octants (every 12.5%) or none inside it, **keep last (days)** sets how many days stay on the chart (3 by default), and unticking **ORG** turns them all off (also in the All-in-One). For stocks, set the session to 0930-1600. The close and open are exact on 1–15 minute charts.
- **TVE All-in-One**: built automatically from all the others, so one indicator slot holds everything. Each part has a master switch at the top of its section in Settings (**Show first presented FVGs**, **Show NDOG / NWOG**, **ORG**), plus its own switches for each type.

Writing your own: put one indicator per `.pine` file in `indicators/`, and add a line `// @tve-body` after the `indicator(...)` call. Everything below that line is copied into the All-in-One, so give your variables and functions their own prefix (`fp_`, `og_`, ...) so they can't clash with another indicator's. `node indicators.mjs --check` compiles them all, and `--build` writes the All-in-One to `indicators/TVE All-in-One.pine` (not committed).

### Ask Claude (ICT)

Your own version of TradingView's AI range feature, using your Claude API key. Select a range on the chart and click **✦ Ask Claude** (it shows under TradingView's range menu), or press **Alt+Shift+Q** to ask about the current selection or the visible range. Pick **Explain the move**, **News behind it**, **PD arrays & liquidity** or **Narrative & bias**, or type your own question. Follow-up questions keep the conversation.

Claude gets the bars in New York time plus ICT reference levels computed from the loaded bars (previous day, Asia, London and NY AM highs and lows, midnight/08:30/09:30 opens), and can search the web for news. Answers use ICT terms: killzones, liquidity sweeps, MSS/BOS, FVGs, order blocks, premium/discount, OTE, Power of 3.

- **Key**: the first time, paste your key into the popup. It's saved in `claude-key.txt` in this folder (or set `ANTHROPIC_API_KEY`). The key stays in the launcher process and is never put into the TradingView page. `.gitignore` keeps it out of git.
- In the browser extension, the key is saved in the extension's storage instead (see [In a browser](#in-a-browser-chrome-edge-brave)).
- **Read-only**: Claude's only tool is web search. It cannot place, change or cancel orders, touch your broker, or draw on or change the chart. Its answers are shown as text and are never run.
- **Cost**: each question is billed to your API account. Model: `claude-opus-5-5` (set `TVE_CLAUDE_MODEL` to use another).
- The first launch after updating installs the Anthropic SDK (`npm install`) automatically.

## Good to know

While the launcher is running, TradingView listens on local port 9222. Any program on this PC can control the app through that port.
