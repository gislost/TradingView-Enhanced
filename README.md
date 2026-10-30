# TradingView Enhanced

Chart skins, a chart color picker, readable drawing text and ICT drawing templates for TradingView Desktop.

## Install

1. Install [Node.js](https://nodejs.org/en/download) (the LTS version). If you skip this, the launcher tells you and opens the download page.
2. Download the zip from the [latest release](https://github.com/gislost/TradingView-Enhanced/releases/latest) and unzip it somewhere you'll keep it.
3. Close TradingView fully, including the tray icon, then open it with **TradingView Skinned.cmd**. Tip: right-click it and make a desktop shortcut.

It updates itself: each time you start TradingView with **TradingView Skinned.cmd**, it downloads the newest version if there is one.

## Use

| Hotkey | What it does |
|---|---|
| Alt+Shift+S | Cycle the chart skin: synthwave → aurora → galaxy (stars, like the Galaxy indicator) → matrix → off |
| Alt+Shift+C | Open the chart color picker (built-in presets, chartthemes.com themes, or pasted hex colors). Esc closes it. |

The color picker changes the chart's own colors (candles, background, grid, scale text), so those colors stay after TradingView restarts, even without the launcher.

Drawing text that's hard to read against the current skin or background is automatically made lighter or darker (same hue). Your original colors come back when you switch to a background they read well on. You can turn this off in the color picker ("Keep drawing text readable").

## Drawing templates

With TradingView open through the launcher, open a command prompt in this folder (type `cmd` in the File Explorer address bar and press Enter) and run:

```
node templates.mjs            # add the ICT templates to your account
node templates.mjs --update   # get the latest version of them
node templates.mjs --remove   # delete them again
```

They all start with `[TVE]`, so they're easy to tell apart from your own. Your own templates are never changed or deleted.

## Good to know

While the launcher is running, TradingView listens on local port 9222. Any program on this PC can control the app through that port.
