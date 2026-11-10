# TradingView Enhanced

Chart skins, a chart color picker, readable drawing text and ICT drawing templates for TradingView Desktop.

## Install

1. Install [Node.js](https://nodejs.org/en/download) (the LTS version). If you skip this, the launcher tells you and opens the download page.
2. Download the zip from the [latest release](https://github.com/gislost/TradingView-Enhanced/releases/latest) and unzip it somewhere you'll keep it, like `C:\Users\<you>\TradingView-Enhanced`.
3. Double-click **TradingView Skinned.cmd**. If TradingView is already open, it closes it and opens it again with the mod.

The first run also adds a **TradingView Enhanced** shortcut to your desktop and Start menu, and opens the folder with a message saying how to pin it. Use that from then on. To pin it, right-click **TradingView Enhanced.exe** in the folder (or **TradingView Enhanced** in the Start menu), choose **Show more options** if you see it, then **Pin to taskbar**. Don't pin the TradingView icon that shows while it's running: that one opens TradingView without the mod. If TradingView is already running with the mod, it brings TradingView to the front.

It updates itself: each time you start TradingView this way, it downloads the newest version if there is one.

The palette button, backgrounds and hotkeys only work when TradingView was started this way. If you open TradingView normally, only the chart color themes stay. While it's running, a minimized "TradingView skins" window stays open. That's the launcher, and it closes by itself when TradingView closes. If something doesn't start, `tve-launch.log` and `tve-launcher.log` in the same folder say what happened.

## Use

Click the palette button in TradingView's top toolbar (next to the search button), or press **Alt+Shift+C**. It opens the TradingView Enhanced panel:

- **Backgrounds**: animated chart backgrounds (Synthwave, Aurora, Galaxy, Matrix) or none. **Alt+Shift+S** cycles them without opening the panel.
- **Colors**: chart color themes (built-in ones plus the chartthemes.com collection), or paste your own hex colors. These change the chart's own colors, so they stay after TradingView restarts, even without the launcher.
- **Templates**: add the ICT drawing templates to your account, update them, or remove them. They all start with `[TVE]`, so they're easy to tell apart from your own, and your own templates are never changed or deleted.
- **Settings**: "Keep drawing text readable" makes drawing text that's hard to read on the current background lighter or darker (same hue). Your original colors come back on backgrounds they read well on.

You can change both hotkeys in **Settings**: click one and press the new keys. Esc or clicking outside closes the panel.

### Ask Claude (ICT)

Your own version of TradingView's AI range feature, using your Claude API key. Select a range on the chart and click **✦ Ask Claude** (it shows under TradingView's range menu), or press **Alt+Shift+Q** to ask about the current selection or the visible range. Pick **Explain the move**, **News behind it**, **PD arrays & liquidity** or **Narrative & bias**, or type your own question. Follow-up questions keep the conversation.

Claude gets the bars in New York time plus ICT reference levels computed from the loaded bars (previous day, Asia, London and NY AM highs and lows, midnight/08:30/09:30 opens), and can search the web for news. Answers use ICT terms: killzones, liquidity sweeps, MSS/BOS, FVGs, order blocks, premium/discount, OTE, Power of 3.

- **Key**: the first time, paste your key into the popup. It's saved in `claude-key.txt` in this folder (or set `ANTHROPIC_API_KEY`). The key stays in the launcher process and is never put into the TradingView page. `.gitignore` keeps it out of git.
- **Read-only**: Claude's only tool is web search. It cannot place, change or cancel orders, touch your broker, or draw on or change the chart. Its answers are shown as text and are never run.
- **Cost**: each question is billed to your API account. Model: `claude-opus-5-5` (set `TVE_CLAUDE_MODEL` to use another).
- The first launch after updating installs the Anthropic SDK (`npm install`) automatically.

## Good to know

While the launcher is running, TradingView listens on local port 9222. Any program on this PC can control the app through that port.
