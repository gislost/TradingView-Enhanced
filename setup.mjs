// Builds "TradingView Enhanced.exe" next to this file and adds Start menu and desktop shortcuts to it.
// A shortcut to a .cmd doesn't pin reliably to the Windows 11 taskbar; this small exe does, and it runs
// TradingView Skinned.cmd with no console window. It's compiled with the C# compiler that ships with Windows.
// TradingView Skinned.cmd runs this once, when the exe is missing.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const exe = join(here, 'TradingView Enhanced.exe');

const source = String.raw`
using System;
using System.Diagnostics;
using System.IO;

static class Launcher
{
    static void Main()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        try { File.AppendAllText(Path.Combine(dir, "tve-launch.log"), Environment.NewLine + "[" + DateTime.Now + "] exe started" + Environment.NewLine); }
        catch (IOException) { }
        Process.Start(new ProcessStartInfo
        {
            FileName = Environment.ExpandEnvironmentVariables(@"%WINDIR%\System32\cmd.exe"),
            Arguments = "/c \"\"" + Path.Combine(dir, "TradingView Skinned.cmd") + "\" exe\"",
            WorkingDirectory = dir,
            UseShellExecute = false,
            CreateNoWindow = true,
        });
    }
}
`;

const ps = (script, env) => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script],
  { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] }).toString();

const work = mkdtempSync(join(tmpdir(), 'tve-'));
try {
  writeFileSync(join(work, 'Launcher.cs'), source);
  const ico = join(work, 'tv.ico');
  // TradingView's own icon, so the pin looks like TradingView. Without it the exe just gets the default icon.
  try {
    ps(`Add-Type -AssemblyName System.Drawing
      $tv = Join-Path (Get-AppxPackage TradingView.Desktop).InstallLocation 'TradingView.exe'
      $i = [System.Drawing.Icon]::ExtractAssociatedIcon($tv); $fs = [IO.File]::Create($env:TVE_ICO); $i.Save($fs); $fs.Close()`,
      { TVE_ICO: ico });
  } catch {}

  const net = join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET');
  const csc = [join(net, 'Framework64', 'v4.0.30319', 'csc.exe'), join(net, 'Framework', 'v4.0.30319', 'csc.exe')].find(existsSync);
  if (!csc) throw new Error('the C# compiler that comes with Windows (.NET Framework 4) was not found');
  execFileSync(csc, ['/nologo', '/target:winexe', `/out:${exe}`, ...(existsSync(ico) ? [`/win32icon:${ico}`] : []), join(work, 'Launcher.cs')],
    { stdio: ['ignore', 'pipe', 'pipe'] });

  ps(`$sh = New-Object -ComObject WScript.Shell
    foreach ($dir in [Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop')) {
      $l = $sh.CreateShortcut((Join-Path $dir 'TradingView Enhanced.lnk'))
      $l.TargetPath = $env:TVE_EXE; $l.WorkingDirectory = $env:TVE_DIR; $l.Description = 'TradingView with TradingView Enhanced'
      $l.Save()
    }`, { TVE_EXE: exe, TVE_DIR: here });
  console.log('Made TradingView Enhanced.exe and its Start menu and desktop shortcuts.');
} catch (e) {
  console.log(`Couldn't make TradingView Enhanced.exe: ${e.stderr?.toString().trim() || e.message}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
