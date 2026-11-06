// ═══════════════════════════════════════════════════════════════
// Lily — System Control Tools
// Open/close apps, shutdown, volume, etc. (100% offline)
// ═══════════════════════════════════════════════════════════════

const { exec, execSync } = require('child_process');
const path = require('path');

// ── Known Windows application paths ──────────────────────────
const APP_MAP = {
  // Browsers
  'chrome':        'start chrome',
  'google chrome': 'start chrome',
  'firefox':       'start firefox',
  'edge':          'start msedge',
  'brave':         'start brave',

  // Productivity
  'notepad':       'notepad',
  'calculator':    'calc',
  'calc':          'calc',
  'paint':         'mspaint',
  'wordpad':       'write',
  'snipping tool': 'snippingtool',
  'task manager':  'taskmgr',

  // Dev tools
  'vscode':        'code',
  'vs code':       'code',
  'visual studio code': 'code',
  'cmd':           'start cmd',
  'command prompt': 'start cmd',
  'powershell':    'start powershell',
  'terminal':      'start wt',
  'windows terminal': 'start wt',

  // Microsoft Office
  'word':          'start winword',
  'excel':         'start excel',
  'powerpoint':    'start powerpnt',
  'outlook':       'start outlook',

  // System
  'settings':      'start ms-settings:',
  'control panel': 'control',
  'file explorer':  'explorer',
  'explorer':      'explorer',
  'this pc':       'explorer ::{20D04FE0-3AEA-1069-A2D8-08002B30309D}',
  'recycle bin':   'explorer ::{645FF040-5081-101B-9F08-00AA002F954E}',

  // Media
  'spotify':       'start spotify:',
  'vlc':           'start vlc',

  // Communication
  'discord':       'start discord:',
  'whatsapp':      'start whatsapp:',
  'telegram':      'start tg:',
  'teams':         'start msteams:',
  'zoom':          'start zoommtg:',
};

/**
 * Open an application by name
 */
function openApp(appName) {
  const name = appName.toLowerCase().trim();
  const cmd = APP_MAP[name];

  if (cmd) {
    exec(cmd, { shell: true });
    return { message: `Opened ${appName}` };
  }

  // Try to run as-is (for apps in PATH)
  exec(`start "" "${appName}"`, { shell: true });
  return { message: `Trying to open ${appName}…` };
}

/**
 * Close an application by name
 */
function closeApp(appName) {
  const name = appName.toLowerCase().trim();

  // Map friendly names to process names
  const PROCESS_MAP = {
    'chrome':   'chrome.exe',
    'firefox':  'firefox.exe',
    'edge':     'msedge.exe',
    'notepad':  'notepad.exe',
    'vscode':   'Code.exe',
    'vs code':  'Code.exe',
    'word':     'WINWORD.EXE',
    'excel':    'EXCEL.EXE',
    'explorer': 'explorer.exe',
    'spotify':  'Spotify.exe',
    'discord':  'Discord.exe',
    'vlc':      'vlc.exe',
    'teams':    'Teams.exe',
  };

  const proc = PROCESS_MAP[name] || `${name}.exe`;

  try {
    execSync(`taskkill /IM "${proc}" /F`, { shell: true, stdio: 'pipe' });
    return { message: `Closed ${appName}` };
  } catch (err) {
    return { message: `Could not close ${appName} — it might not be running.` };
  }
}

/**
 * Shut down the PC (with 5-second delay for safety)
 */
function shutdownPC() {
  exec('shutdown /s /t 5', { shell: true });
  return { message: '⚠️ Shutting down in 5 seconds… Run `shutdown /a` to cancel.' };
}

/**
 * Restart the PC
 */
function restartPC() {
  exec('shutdown /r /t 5', { shell: true });
  return { message: '⚠️ Restarting in 5 seconds… Run `shutdown /a` to cancel.' };
}

/**
 * Lock the screen
 */
function lockPC() {
  exec('rundll32.exe user32.dll,LockWorkStation', { shell: true });
  return { message: '🔒 Screen locked.' };
}

/**
 * Put PC to sleep
 */
function sleepPC() {
  exec('rundll32.exe powrprof.dll,SetSuspendState 0,1,0', { shell: true });
  return { message: '💤 Going to sleep…' };
}

/**
 * Set system volume (0–100) via PowerShell
 */
function setVolume(level) {
  const vol = Math.max(0, Math.min(100, parseInt(level)));
  const normalized = vol / 100;
  const ps = `
    $wshell = New-Object -ComObject WScript.Shell;
    1..50 | ForEach-Object { $wshell.SendKeys([char]174) };
    $steps = [math]::Round(${normalized} * 50);
    1..$steps | ForEach-Object { $wshell.SendKeys([char]175) };
  `;
  exec(`powershell -Command "${ps.replace(/\n/g, ' ')}"`, { shell: true });
  return { message: `🔊 Volume set to ${vol}%` };
}

/**
 * Toggle mute
 */
function muteVolume() {
  const ps = `(New-Object -ComObject WScript.Shell).SendKeys([char]173)`;
  exec(`powershell -Command "${ps}"`, { shell: true });
  return { message: '🔇 Volume mute toggled.' };
}

/**
 * List running applications
 */
function getRunningApps() {
  try {
    const out = execSync(
      'powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -ne \'\'} | Select-Object -Property Name,MainWindowTitle | Format-Table -AutoSize"',
      { encoding: 'utf-8', shell: true, timeout: 5000 }
    );
    return { message: '**Running Applications:**\n```\n' + out.trim() + '\n```' };
  } catch (err) {
    return { message: 'Could not retrieve running applications.' };
  }
}

/**
 * Get battery info
 */
function getBatteryInfo() {
  try {
    const out = execSync(
      'powershell -Command "(Get-WmiObject Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus | Format-List | Out-String).Trim()"',
      { encoding: 'utf-8', shell: true, timeout: 5000 }
    );
    if (!out.trim()) return { message: 'No battery detected (desktop PC).' };
    return { message: '🔋 **Battery Info:**\n```\n' + out.trim() + '\n```' };
  } catch (_) {
    return { message: 'No battery detected (desktop PC).' };
  }
}

/**
 * Empty the recycle bin
 */
function emptyRecycleBin() {
  try {
    execSync('powershell -Command "Clear-RecycleBin -Force -ErrorAction SilentlyContinue"', { shell: true, timeout: 10000 });
    return { message: '🗑️ Recycle bin emptied.' };
  } catch (_) {
    return { message: 'Could not empty recycle bin.' };
  }
}

module.exports = {
  openApp, closeApp, shutdownPC, restartPC, lockPC, sleepPC,
  setVolume, muteVolume, getRunningApps, getBatteryInfo, emptyRecycleBin,
};
