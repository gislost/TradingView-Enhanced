# TradingView Enhanced

Chart skins, a chart color picker, readable drawing text and ICT drawing templates for TradingView Desktop.

## Install

1. Install [Node.js](https://nodejs.org/en/download) (the LTS version). If you skip this, the launcher tells you and opens the download page.
2. Download the zip from the [latest release](https://github.com/gislost/TradingView-Enhanced/releases/latest) and unzip it somewhere you'll keep it, like `C:\Users\<you>\TradingView-Enhanced`.
3. Double-click **TradingView Skinned.cmd**. If TradingView is already open, it closes it and opens it again with the mod.

The first run also adds a **TradingView Enhanced** shortcut to your desktop and Start menu. Use that from then on. To pin it, right-click it in the Start menu and choose **Pin to taskbar**. If TradingView is already running with the mod, it brings TradingView to the front.

It updates itself: each time you start TradingView this way, it downloads the newest version if there is one.

The palette button, backgrounds and hotkeys only work when TradingView was started this way. If you open TradingView normally, only the chart color themes stay. While it's running, a minimized "TradingView skins" window stays open. That's the launcher, and it closes by itself when TradingView closes. If something doesn't start, `tve-launch.log` and `tve-launcher.log` in the same folder say what happened.

## Use

Click the palette button in TradingView's top toolbar (next to the search button), or press **Alt+Shift+C**. It opens the TradingView Enhanced panel:

- **Backgrounds**: animated chart backgrounds (Synthwave, Aurora, Galaxy, Matrix) or none. **Alt+Shift+S** cycles them without opening the panel.
- **Colors**: chart color themes (built-in ones plus the chartthemes.com collection), or paste your own hex colors. These change the chart's own colors, so they stay after TradingView restarts, even without the launcher.
- **Templates**: add the ICT drawing templates to your account, update them, or remove them. They all start with `[TVE]`, so they're easy to tell apart from your own, and your own templates are never changed or deleted.
- **Settings**: "Keep drawing text readable" makes drawing text that's hard to read on the current background lighter or darker (same hue). Your original colors come back on backgrounds they read well on.

You can change both hotkeys in **Settings**: click one and press the new keys. Esc or clicking outside closes the panel.

## Good to know

While the launcher is running, TradingView listens on local port 9222. Any program on this PC can control the app through that port.
