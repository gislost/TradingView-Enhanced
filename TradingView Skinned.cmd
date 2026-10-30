@echo off
rem Starts TradingView with the skins. If it's already running with them, just brings it to the front.
rem If it's running without them (opened normally, or sitting in the tray), closes it so the launcher can hook in.
rem Every run is logged to tve-launch.log next to this file; the launcher's own output goes to tve-launcher.log.
set "LOG=%~dp0tve-launch.log"
echo.>>"%LOG%"
echo [%date% %time%] started>>"%LOG%"

rem Needs Node.js 18 or newer. If it is missing or too old, say so and open the download page.
set "NODEVER="
for /f "tokens=1 delims=v." %%v in ('node -v 2^>nul') do set "NODEVER=%%v"
if not defined NODEVER goto neednode
if %NODEVER% LSS 18 goto neednode

rem First run: build the pinnable "TradingView Enhanced.exe" and its Start menu and desktop shortcuts.
if not exist "%~dp0TradingView Enhanced.exe" node "%~dp0setup.mjs" >>"%LOG%" 2>&1

curl -s -m 2 http://127.0.0.1:9222/json/version >nul 2>&1
if not errorlevel 1 goto front
tasklist /FI "IMAGENAME eq TradingView.exe" /NH | find /I "TradingView.exe" >nul
if errorlevel 1 goto launch
echo TradingView running without skins, closing it>>"%LOG%"
taskkill /IM TradingView.exe /F >nul 2>&1
rem Wait for every TradingView process to be gone, up to ~10 seconds.
for /L %%i in (1,1,10) do (
  tasklist /FI "IMAGENAME eq TradingView.exe" /NH | find /I "TradingView.exe" >nul || goto launch
  timeout /t 1 /nobreak >nul
)
:launch
echo starting launcher>>"%LOG%"
start "TradingView skins" /min cmd /c node "%~dp0update.mjs" ^>"%~dp0tve-launcher.log" 2^>^&1
exit /b

:front
rem Starting TradingView again while it's open just focuses its window.
echo already running with skins, focusing>>"%LOG%"
start "" explorer.exe shell:AppsFolder\TradingView.Desktop_n534cwy3pjxzj!TradingView.Desktop
exit /b

:neednode
echo Node.js 18+ missing>>"%LOG%"
rem Started from the exe there is no window to read, so just open the download page.
if /I "%~1"=="exe" goto opennode
echo TradingView Enhanced needs Node.js 18 or newer, which isn't installed on this PC (or is too old).
echo.
echo Press any key to open the Node.js download page. Install the LTS version,
echo then run TradingView Skinned.cmd again.
pause >nul
:opennode
start "" https://nodejs.org/en/download
