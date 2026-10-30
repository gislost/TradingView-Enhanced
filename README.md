# TradingView Desktop skins

Needs [Node.js](https://nodejs.org/en/download) 18 or newer (the launcher tells you if it's missing). Start TradingView with **TradingView Skinned.cmd**. Close TradingView fully first, including the tray icon.

| Hotkey | What it does |
|---|---|
| Alt+Shift+S | Cycle the chart skin: synthwave → aurora → galaxy (stars, like the Galaxy indicator) → matrix → off |
| Alt+Shift+C | Open the chart color picker (built-in presets, chartthemes.com themes, or pasted hex colors). Esc closes it. |

The color picker changes the chart's own colors (candles, background, grid, scale text), so those colors stay after TradingView restarts, even without the launcher.

Drawing text that's hard to read against the current skin or background is automatically made lighter or darker (same hue). Your original colors come back when you switch to a background they read well on. You can turn this off in the color picker ("Keep drawing text readable").

## Updates

`TradingView Skinned.cmd` runs `update.mjs` first. If `update.json` has a `source`, it checks that address for a newer `version.json`, downloads the listed files, and then starts TradingView. If there's no source or no internet, it just starts TradingView.

Updates come from https://github.com/gislost/TradingView-Enhanced. To ship one, push the changed files and raise the `version` number in `version.json`. Everyone gets it the next time they start TradingView, and a new zip appears under Releases automatically.

To install, download the zip from the latest release at https://github.com/gislost/TradingView-Enhanced/releases/latest, unzip it, and run `TradingView Skinned.cmd`.

Anyone who can push to that repository can change code that runs on your and your friends' PCs, so keep it to your own account.

## Drawing templates

```
node templates.mjs            # save any missing ICT templates to your account
node templates.mjs --list     # show them
node templates.mjs --update   # overwrite these templates with their latest version
node templates.mjs --remove   # delete only these templates
```

Run these while TradingView is open through the launcher. Our templates all start with `[TVE]`, so they're easy to tell apart from yours. Copies from older versions without `[TVE]` get renamed, but only if they're unchanged. Template names that already exist are never overwritten. Your original templates are backed up in `backup/drawing-templates-before.json`.

Note: while the launcher is running, TradingView listens on local port 9222. Any program on this PC can control the app through that port.
