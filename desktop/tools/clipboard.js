// ═══════════════════════════════════════════════════════════════
// Lily — Clipboard Tools (100% offline)
// Uses PowerShell for clipboard operations (no Electron import)
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  try {
    // Pipe text to clip.exe (Windows built-in)
    execSync(`echo ${text.replace(/"/g, '\\"')} | clip`, { shell: true });
    const preview = text.length > 80 ? text.slice(0, 80) + '…' : text;
    return { message: `📋 Copied to clipboard: "${preview}"` };
  } catch (err) {
    return { message: `Clipboard copy failed: ${err.message}` };
  }
}

/**
 * Read text from clipboard
 */
function readFromClipboard() {
  try {
    const text = execSync('powershell -Command "Get-Clipboard"', {
      encoding: 'utf-8',
      shell: true,
      timeout: 5000,
    }).trim();

    if (!text) {
      return { message: 'Clipboard is empty.' };
    }
    const preview = text.length > 500 ? text.slice(0, 500) + '\n… (truncated)' : text;
    return { message: `📋 **Clipboard contents:**\n\`\`\`\n${preview}\n\`\`\`` };
  } catch (err) {
    return { message: `Clipboard read failed: ${err.message}` };
  }
}

module.exports = { copyToClipboard, readFromClipboard };
