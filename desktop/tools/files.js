// ═══════════════════════════════════════════════════════════════
// Lily — File Management Tools (100% offline)
// ═══════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');
const os   = require('os');

/**
 * Resolve ~ and environment variables in paths
 */
function resolvePath(p) {
  if (!p) return p;
  let resolved = p.replace(/^~/, os.homedir());
  resolved = resolved.replace(/%([^%]+)%/g, (_, key) => process.env[key] || `%${key}%`);
  return path.resolve(resolved);
}

/**
 * Create a new file with content
 */
function createFile(filePath, content = '') {
  const fp = resolvePath(filePath);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content, 'utf-8');
  return { message: `📄 File created: \`${fp}\`` };
}

/**
 * Read content of a file
 */
function readFile(filePath) {
  const fp = resolvePath(filePath);
  if (!fs.existsSync(fp)) {
    return { message: `File not found: \`${fp}\`` };
  }
  const stat = fs.statSync(fp);
  if (stat.size > 500 * 1024) {
    return { message: `File is too large (${(stat.size / 1024).toFixed(0)}KB). Showing first 5KB.`, content: fs.readFileSync(fp, 'utf-8').slice(0, 5120) };
  }
  const content = fs.readFileSync(fp, 'utf-8');
  return { message: `📄 **${path.basename(fp)}** (${content.split('\n').length} lines):\n\`\`\`\n${content}\n\`\`\`` };
}

/**
 * Delete a file
 */
function deleteFile(filePath) {
  const fp = resolvePath(filePath);
  if (!fs.existsSync(fp)) {
    return { message: `File not found: \`${fp}\`` };
  }
  const stat = fs.statSync(fp);
  if (stat.isDirectory()) {
    fs.rmSync(fp, { recursive: true, force: true });
    return { message: `🗑️ Folder deleted: \`${fp}\`` };
  }
  fs.unlinkSync(fp);
  return { message: `🗑️ File deleted: \`${fp}\`` };
}

/**
 * Create a folder
 */
function createFolder(folderPath) {
  const fp = resolvePath(folderPath);
  fs.mkdirSync(fp, { recursive: true });
  return { message: `📁 Folder created: \`${fp}\`` };
}

/**
 * List files in a directory
 */
function listFiles(dirPath) {
  const dp = resolvePath(dirPath || '.');
  if (!fs.existsSync(dp)) {
    return { message: `Directory not found: \`${dp}\`` };
  }

  const entries = fs.readdirSync(dp, { withFileTypes: true });
  const items = entries.slice(0, 50).map(e => {
    const icon = e.isDirectory() ? '📁' : '📄';
    let size = '';
    try {
      if (!e.isDirectory()) {
        const s = fs.statSync(path.join(dp, e.name)).size;
        size = s < 1024 ? `${s}B` : s < 1048576 ? `${(s / 1024).toFixed(1)}KB` : `${(s / 1048576).toFixed(1)}MB`;
        size = ` (${size})`;
      }
    } catch (_) {}
    return `${icon} ${e.name}${size}`;
  });

  const more = entries.length > 50 ? `\n… and ${entries.length - 50} more` : '';
  return { message: `**${dp}** (${entries.length} items):\n${items.join('\n')}${more}` };
}

/**
 * Move or rename a file
 */
function moveFile(from, to) {
  const src = resolvePath(from);
  const dst = resolvePath(to);
  if (!fs.existsSync(src)) {
    return { message: `Source not found: \`${src}\`` };
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(src, dst);
  return { message: `📦 Moved \`${path.basename(src)}\` → \`${dst}\`` };
}

/**
 * Copy a file
 */
function copyFile(from, to) {
  const src = resolvePath(from);
  const dst = resolvePath(to);
  if (!fs.existsSync(src)) {
    return { message: `Source not found: \`${src}\`` };
  }
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return { message: `📋 Copied \`${path.basename(src)}\` → \`${dst}\`` };
}

/**
 * Search for files by name pattern (recursive)
 */
function searchFiles(dirPath, pattern) {
  const dp = resolvePath(dirPath || os.homedir());
  const results = [];
  const maxResults = 30;
  const pat = (pattern || '').toLowerCase();

  function walk(dir, depth) {
    if (depth > 5 || results.length >= maxResults) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (results.length >= maxResults) break;
        // Skip node_modules, .git, system dirs
        if (e.isDirectory() && ['node_modules', '.git', '$Recycle.Bin', 'System Volume Information'].includes(e.name)) continue;

        if (e.name.toLowerCase().includes(pat)) {
          const icon = e.isDirectory() ? '📁' : '📄';
          results.push(`${icon} ${path.join(dir, e.name)}`);
        }

        if (e.isDirectory()) {
          walk(path.join(dir, e.name), depth + 1);
        }
      }
    } catch (_) { /* permission errors */ }
  }

  walk(dp, 0);
  if (results.length === 0) {
    return { message: `No files matching "${pattern}" found in \`${dp}\`` };
  }
  return { message: `**Search results for "${pattern}":**\n${results.join('\n')}` };
}

/**
 * Get file info
 */
function getFileInfo(filePath) {
  const fp = resolvePath(filePath);
  if (!fs.existsSync(fp)) {
    return { message: `File not found: \`${fp}\`` };
  }
  const stat = fs.statSync(fp);
  const sizeStr = stat.size < 1024 ? `${stat.size} B`
    : stat.size < 1048576 ? `${(stat.size / 1024).toFixed(1)} KB`
    : `${(stat.size / 1048576).toFixed(1)} MB`;

  return {
    message: `📄 **${path.basename(fp)}**\n` +
      `- Type: ${stat.isDirectory() ? 'Directory' : 'File'}\n` +
      `- Size: ${sizeStr}\n` +
      `- Created: ${stat.birthtime.toLocaleString()}\n` +
      `- Modified: ${stat.mtime.toLocaleString()}\n` +
      `- Path: \`${fp}\``
  };
}

module.exports = {
  createFile, readFile, deleteFile, createFolder,
  listFiles, moveFile, copyFile, searchFiles, getFileInfo,
};
