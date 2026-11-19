// Adds "TradingView Enhanced" shortcuts to the Start menu and the desktop. They run TradingView Skinned.cmd
// through Windows' own cmd.exe (minimized), so they pin to the Windows 11 taskbar like a program does.
// (Earlier versions compiled a small "TradingView Enhanced.exe" for this, but Windows Defender's machine-learning
// check flags an unsigned exe that starts a hidden cmd.exe as a trojan and quarantines it, so there is no exe now.)
// TradingView Skinned.cmd runs this when the Start menu shortcut is missing.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ico = join(here, 'tv.ico');

const ps = (script, env) => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script],
  { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).toString();

// The old exe, if Defender left it, and the helper it used.
rmSync(join(here, 'TradingView Enhanced.exe'), { force: true });
rmSync(join(here, 'Open TradingView Enhanced.cmd'), { force: true });

try {
  // TradingView's own icon, so the pin looks like TradingView. Without it the shortcut gets cmd's icon.
  try {
    ps(`Add-Type -AssemblyName System.Drawing
      $tv = Join-Path (Get-AppxPackage TradingView.Desktop).InstallLocation 'TradingView.exe'
      $i = [System.Drawing.Icon]::ExtractAssociatedIcon($tv); $fs = [IO.File]::Create($env:TVE_ICO); $i.Save($fs); $fs.Close()`,
      { TVE_ICO: ico });
  } catch {}

  ps(`$sh = New-Object -ComObject WScript.Shell
    foreach ($dir in [Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop')) {
      $l = $sh.CreateShortcut((Join-Path $dir 'TradingView Enhanced.lnk'))
      $l.TargetPath = Join-Path $env:WINDIR 'System32\\cmd.exe'
      $l.Arguments = '/c ""' + (Join-Path $env:TVE_DIR 'TradingView Skinned.cmd') + '" exe"'
      $l.WorkingDirectory = $env:TVE_DIR; $l.WindowStyle = 7; $l.Description = 'TradingView with TradingView Enhanced'
      if (Test-Path $env:TVE_ICO) { $l.IconLocation = $env:TVE_ICO + ',0' }
      $l.Save()
    }`, { TVE_DIR: here, TVE_ICO: ico });
  console.log('Made the TradingView Enhanced shortcuts in the Start menu and on the desktop.');

  // Windows doesn't let programs pin themselves to the taskbar, so say how. This waits for OK, which only
  // holds up TradingView's start on this first run.
  const pinNote = `Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("TradingView Enhanced is set up, with shortcuts on your desktop and in the Start menu.\`n\`nTo pin it to the taskbar: open Start, find TradingView Enhanced (All apps), right-click it and choose Pin to taskbar. If you had pinned it before, pin it again: the old pin doesn't work any more.\`n\`nAlways start TradingView from that pin or the shortcuts. The TradingView icon that shows on the taskbar while it's running opens TradingView without the mod.", 'TradingView Enhanced') | Out-Null`;
  try { ps(pinNote); } catch {}
} catch (e) {
  console.log(`Couldn't make the shortcuts: ${e.stderr?.toString().trim() || e.message}`);
}
