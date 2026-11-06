// ═══════════════════════════════════════════════════════════════
// Lily — Tool Registry
// Central hub for all PC control capabilities
// ═══════════════════════════════════════════════════════════════

const system    = require('./system');
const files     = require('./files');
const browser   = require('./browser');
const screen    = require('./screen');
const code      = require('./code');
const clipBoard = require('./clipboard');
const knowledge = require('./knowledge');
const vision    = require('./vision');

// All available tools with metadata (used by AI brain for tool selection)
const TOOL_CATALOG = {
  // ── System ──────────────────────────────────────────────────
  openApp:         { fn: system.openApp,         desc: 'Open an application by name',              args: ['appName'] },
  closeApp:        { fn: system.closeApp,        desc: 'Close a running application',               args: ['appName'] },
  shutdownPC:      { fn: system.shutdownPC,      desc: 'Shut down the computer',                    args: [] },
  restartPC:       { fn: system.restartPC,       desc: 'Restart the computer',                      args: [] },
  lockPC:          { fn: system.lockPC,          desc: 'Lock the screen',                           args: [] },
  sleepPC:         { fn: system.sleepPC,         desc: 'Put the computer to sleep',                 args: [] },
  setVolume:       { fn: system.setVolume,       desc: 'Set system volume (0-100)',                  args: ['level'] },
  muteVolume:      { fn: system.muteVolume,      desc: 'Mute/unmute system volume',                  args: [] },
  getRunningApps:  { fn: system.getRunningApps,  desc: 'List all running applications',              args: [] },
  getBatteryInfo:  { fn: system.getBatteryInfo,   desc: 'Get battery status',                        args: [] },
  emptyRecycleBin: { fn: system.emptyRecycleBin,  desc: 'Empty the recycle bin',                     args: [] },

  // ── Files ───────────────────────────────────────────────────
  createFile:    { fn: files.createFile,    desc: 'Create a new file with content',            args: ['filePath', 'content'] },
  readFile:      { fn: files.readFile,      desc: 'Read content of a file',                    args: ['filePath'] },
  deleteFile:    { fn: files.deleteFile,    desc: 'Delete a file',                             args: ['filePath'] },
  createFolder:  { fn: files.createFolder,  desc: 'Create a new folder',                       args: ['folderPath'] },
  listFiles:     { fn: files.listFiles,     desc: 'List files in a directory',                 args: ['dirPath'] },
  moveFile:      { fn: files.moveFile,      desc: 'Move or rename a file',                     args: ['from', 'to'] },
  copyFile:      { fn: files.copyFile,      desc: 'Copy a file',                               args: ['from', 'to'] },
  searchFiles:   { fn: files.searchFiles,   desc: 'Search for files by name pattern',          args: ['dirPath', 'pattern'] },
  getFileInfo:   { fn: files.getFileInfo,   desc: 'Get file size, dates, and type info',       args: ['filePath'] },

  // ── Browser ─────────────────────────────────────────────────
  openUrl:         { fn: browser.openUrl,         desc: 'Open a URL in the default browser',    args: ['url'] },
  searchGoogle:    { fn: browser.searchGoogle,    desc: 'Search Google for a query',             args: ['query'] },
  searchYoutube:   { fn: browser.searchYoutube,   desc: 'Search YouTube for a video',           args: ['query'] },
  playYoutube:     { fn: browser.playYoutube,     desc: 'Search and play a YouTube video',      args: ['query'] },

  // ── Screen & Vision ─────────────────────────────────────────
  takeScreenshot:  { fn: screen.takeScreenshot,  desc: 'Take a screenshot of the screen',       args: [] },
  analyzeScreen:   { fn: vision.analyzeScreen,   desc: 'Look at the screen and describe what is visible', args: ['question'] },

  // ── Code ────────────────────────────────────────────────────
  writeCode:       { fn: code.writeCode,       desc: 'Write code to a file',                    args: ['filePath', 'codeContent'] },
  openInVSCode:    { fn: code.openInVSCode,    desc: 'Open a file or folder in VS Code',        args: ['filePath'] },
  runCommand:      { fn: code.runCommand,      desc: 'Run a terminal command',                  args: ['command'] },

  // ── Knowledge ───────────────────────────────────────────────
  answerQuestion:    { fn: knowledge.answerQuestion,    desc: 'Answer a knowledge question using Wikipedia/DuckDuckGo', args: ['query'] },

  // ── Clipboard ───────────────────────────────────────────────
  copyToClipboard:   { fn: clipBoard.copyToClipboard,   desc: 'Copy text to clipboard',        args: ['text'] },
  readFromClipboard: { fn: clipBoard.readFromClipboard, desc: 'Read text from clipboard',       args: [] },
};

/**
 * Execute a tool by name with arguments
 */
async function execute(toolName, args = {}) {
  const tool = TOOL_CATALOG[toolName];
  if (!tool) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  try {
    // Build arguments array from the args object in the right order
    const fnArgs = tool.args.map(a => args[a]);
    const result = await tool.fn(...fnArgs);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get tool descriptions for LLM context
 */
function getToolDescriptions() {
  return Object.entries(TOOL_CATALOG).map(([name, t]) => ({
    name,
    description: t.desc,
    parameters: t.args,
  }));
}

module.exports = { execute, getToolDescriptions, TOOL_CATALOG };
