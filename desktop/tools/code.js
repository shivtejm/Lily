// ═══════════════════════════════════════════════════════════════
// Lily — Code & Terminal Tools (100% offline)
// ═══════════════════════════════════════════════════════════════

const { exec, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

/**
 * Write code to a file (creates directories as needed)
 */
function writeCode(filePath, codeContent) {
  let fp = filePath;
  if (!fp) return { message: 'Please specify a file path.' };

  // Resolve ~ and env vars
  fp = fp.replace(/^~/, os.homedir());
  fp = fp.replace(/%([^%]+)%/g, (_, k) => process.env[k] || `%${k}%`);
  fp = path.resolve(fp);

  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, codeContent, 'utf-8');

  return { message: `✅ Code written to \`${fp}\` (${codeContent.split('\n').length} lines)` };
}

/**
 * Open a file or folder in VS Code
 */
function openInVSCode(filePath) {
  let fp = filePath || '.';
  fp = fp.replace(/^~/, os.homedir());
  fp = path.resolve(fp);

  try {
    exec(`code "${fp}"`, { shell: true });
    return { message: `📝 Opened in VS Code: \`${fp}\`` };
  } catch (err) {
    return { message: `Could not open VS Code. Is it installed and in PATH?\nError: ${err.message}` };
  }
}

/**
 * Run a terminal command and return output
 */
function runCommand(command) {
  if (!command) return { message: 'Please specify a command.' };

  // Safety: block dangerous commands without explicit intent
  const dangerous = ['format', 'del /s', 'rd /s', 'rm -rf /'];
  const lower = command.toLowerCase();
  for (const d of dangerous) {
    if (lower.includes(d)) {
      return { message: `⚠️ Blocked dangerous command: \`${command}\`\nThis command could cause data loss.` };
    }
  }

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      shell: true,
      timeout: 15000,
      maxBuffer: 1024 * 1024,
      cwd: os.homedir(),
    });
    return { message: `**\`${command}\`**\n\`\`\`\n${(output || '(no output)').trim()}\n\`\`\`` };
  } catch (err) {
    const stderr = err.stderr || err.message;
    return { message: `**\`${command}\`** failed:\n\`\`\`\n${stderr.trim()}\n\`\`\`` };
  }
}

module.exports = { writeCode, openInVSCode, runCommand };
