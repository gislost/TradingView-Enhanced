@echo off
rem Updates TradingView Enhanced and (re)builds the browser extension in the "extension" folder next to this file.
rem It doesn't start or touch any browser or TradingView: you load the folder in your browser yourself (see below).
set "NODEVER="
for /f "tokens=1 delims=v." %%v in ('node -v 2^>nul') do set "NODEVER=%%v"
if not defined NODEVER goto neednode
if %NODEVER% LSS 18 goto neednode

node "%~dp0update.mjs" --update-only
node "%~dp0extension.mjs"
if errorlevel 1 (
  echo.
  echo Building the extension failed. See the message above.
  pause
  exit /b 1
)
echo.
echo First time (Chrome, Edge or Brave):
echo   1. Open chrome://extensions  (Edge: edge://extensions)
echo   2. Turn on "Developer mode"
echo   3. Click "Load unpacked" and pick this folder:
echo        %~dp0extension
echo   4. Reload your TradingView chart tab.
echo.
echo After an update: click the reload button on TradingView Enhanced in that page, then reload the chart tab.
echo.
pause
exit /b

:neednode
echo TradingView Enhanced needs Node.js 18 or newer, which isn't installed on this PC (or is too old).
echo Press any key to open the Node.js download page. Install the LTS version, then run this again.
pause >nul
start "" https://nodejs.org/en/download
