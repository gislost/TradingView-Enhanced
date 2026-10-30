@echo off
rem Needs Node.js 18 or newer. If it is missing or too old, say so and open the download page.
set "NODEVER="
for /f "tokens=1 delims=v." %%v in ('node -v 2^>nul') do set "NODEVER=%%v"
if not defined NODEVER goto neednode
if %NODEVER% LSS 18 goto neednode
start "TradingView skins" /min node "%~dp0update.mjs"
exit /b
:neednode
echo TradingView Enhanced needs Node.js 18 or newer, which isn't installed on this PC (or is too old).
echo.
echo Press any key to open the Node.js download page. Install the LTS version,
echo then run TradingView Skinned.cmd again.
pause >nul
start "" https://nodejs.org/en/download
