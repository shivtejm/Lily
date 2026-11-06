// ═══════════════════════════════════════════════════════════════
// Lily AI Assistant — Electron Main Process
// The brain that runs your entire PC
// ═══════════════════════════════════════════════════════════════

const {
  app, BrowserWindow, Tray, Menu, globalShortcut,
  ipcMain, screen, nativeImage, desktopCapturer,
  clipboard, shell, dialog
} = require('electron');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');

// ─── Constants ───────────────────────────────────────────────
const ORB_W = 50, ORB_H = 50;
const PANEL_W = 400, PANEL_H = 620;
const MARGIN = 16;

// ─── State ───────────────────────────────────────────────────
let mainWindow = null;
let tray       = null;
let isExpanded = false;
let brain      = null;
let db         = null;

// ═══════════════════════════════════════════════════════════════
// Window Management
// ═══════════════════════════════════════════════════════════════

function orbPos() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  return { x: sw - ORB_W - MARGIN, y: sh - ORB_H - MARGIN };
}

function panelPos() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  return { x: sw - PANEL_W - MARGIN, y: sh - PANEL_H - MARGIN };
}

function createWindow() {
  const pos = orbPos();

  mainWindow = new BrowserWindow({
    width: ORB_W, height: ORB_H,
    x: pos.x, y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Log any renderer errors
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('Page failed to load:', code, desc);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('Renderer crashed:', details);
  });

  // Open DevTools in dev mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('close', e => {
    if (!app.isQuitting) {
      e.preventDefault();
      if (isExpanded) collapsePanel();
      mainWindow.hide();
    }
  });
}

function expandPanel() {
  if (isExpanded || !mainWindow) return;
  isExpanded = true;
  const p = panelPos();
  mainWindow.setBounds({ x: p.x, y: p.y, width: PANEL_W, height: PANEL_H });
  mainWindow.webContents.send('panel-state', 'expanded');
}

function collapsePanel() {
  if (!isExpanded || !mainWindow) return;
  isExpanded = false;
  const p = orbPos();
  mainWindow.setBounds({ x: p.x, y: p.y, width: ORB_W, height: ORB_H });
  mainWindow.webContents.send('panel-state', 'collapsed');
}

function togglePanel() {
  if (!mainWindow) return;
  if (isExpanded) {
    collapsePanel();
  } else {
    mainWindow.show();
    expandPanel();
  }
}

// ═══════════════════════════════════════════════════════════════
// System Tray
// ═══════════════════════════════════════════════════════════════

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    // Fallback: 16×16 purple square
    const sz = 16;
    const buf = Buffer.alloc(sz * sz * 4);
    for (let i = 0; i < sz * sz; i++) {
      buf[i * 4]     = 168; // R
      buf[i * 4 + 1] = 85;  // G
      buf[i * 4 + 2] = 247; // B
      buf[i * 4 + 3] = 255; // A
    }
    trayIcon = nativeImage.createFromBitmap(buf, { width: sz, height: sz });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Lily AI Assistant 🌸');

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '🌸  Show Lily',     click: () => { mainWindow.show(); expandPanel(); } },
    { label: '⚙️  Settings',      click: () => { mainWindow.show(); expandPanel(); mainWindow.webContents.send('show-settings'); } },
    { type: 'separator' },
    { label: '❌  Quit Lily',     click: () => { app.isQuitting = true; app.quit(); } },
  ]));

  tray.on('double-click', togglePanel);
}

// ═══════════════════════════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════════════════════════

function setupIPC() {
  // ── Panel ──────────────────────────────────────────────────
  ipcMain.on('toggle-panel',   togglePanel);
  ipcMain.on('expand-panel',   () => { mainWindow.show(); expandPanel(); });
  ipcMain.on('collapse-panel', collapsePanel);
  ipcMain.on('move-window', (e, { x, y }) => {
    if (mainWindow) mainWindow.setPosition(Math.round(x), Math.round(y));
  });

  // ── Chat / AI ──────────────────────────────────────────────
  ipcMain.handle('send-message', async (_e, message) => {
    try {
      // Save user message
      db.addConversation('user', message);
      // Process with brain
      const response = await brain.process(message);
      // Save assistant response
      db.addConversation('assistant', response.text, response.toolUsed || null);
      return response;
    } catch (err) {
      const errResp = { text: `Sorry, something went wrong: ${err.message}`, error: true };
      return errResp;
    }
  });

  // ── Tool Execution ─────────────────────────────────────────
  ipcMain.handle('execute-tool', async (_e, toolName, args) => {
    try {
      const tools = require('./tools');
      const result = await tools.execute(toolName, args);
      db.addAction(toolName, JSON.stringify(args), true);
      return result;
    } catch (err) {
      db.addAction(toolName, err.message, false);
      return { success: false, error: err.message };
    }
  });

  // ── Screen Capture ─────────────────────────────────────────
  ipcMain.handle('capture-screen', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      if (sources.length > 0) {
        const pngBuf = sources[0].thumbnail.toPNG();
        const dir = path.join(app.getPath('userData'), 'screenshots');
        fs.mkdirSync(dir, { recursive: true });
        const fp = path.join(dir, `screen_${Date.now()}.png`);
        fs.writeFileSync(fp, pngBuf);
        return { success: true, path: fp, dataUrl: sources[0].thumbnail.toDataURL() };
      }
      return { success: false, error: 'No screen source found' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ── Clipboard ──────────────────────────────────────────────
  ipcMain.handle('clipboard-read',  () => clipboard.readText());
  ipcMain.handle('clipboard-write', (_e, t) => { clipboard.writeText(t); return true; });

  // ── Shell ──────────────────────────────────────────────────
  ipcMain.handle('open-external', (_e, url) => shell.openExternal(url));

  // ── Database ───────────────────────────────────────────────
  ipcMain.handle('db-get-conversations',  () => db.getConversations());
  ipcMain.handle('db-save-conversation',  (_e, role, text) => db.addConversation(role, text));
  ipcMain.handle('db-clear-conversations', () => db.clearConversations());

  ipcMain.handle('db-get-saved-items', () => db.getSavedItems());
  ipcMain.handle('db-save-item',       (_e, item) => db.addSavedItem(item));
  ipcMain.handle('db-delete-item',     (_e, id) => db.deleteSavedItem(id));

  ipcMain.handle('db-get-tasks',    () => db.getTasks());
  ipcMain.handle('db-save-task',    (_e, task) => db.addTask(task));
  ipcMain.handle('db-update-task',  (_e, id, u) => db.updateTask(id, u));
  ipcMain.handle('db-delete-task',  (_e, id) => db.deleteTask(id));

  ipcMain.handle('db-get-settings',  () => db.getSettings());
  ipcMain.handle('db-save-setting',  (_e, k, v) => db.saveSetting(k, v));

  // ── System Info ────────────────────────────────────────────
  ipcMain.handle('get-system-info', () => ({
    platform:    os.platform(),
    hostname:    os.hostname(),
    username:    os.userInfo().username,
    homedir:     os.homedir(),
    cpus:        os.cpus().length,
    totalMemory: (os.totalmem() / 1073741824).toFixed(1) + ' GB',
    freeMemory:  (os.freemem()  / 1073741824).toFixed(1) + ' GB',
    uptime:      (os.uptime() / 3600).toFixed(1) + ' hours',
  }));
}

// ═══════════════════════════════════════════════════════════════
// App Lifecycle
// ═══════════════════════════════════════════════════════════════

app.whenReady().then(async () => {
  // Database
  const Database = require('./db/database');
  db = new Database(app.getPath('userData'));
  db.load();

  // AI Brain
  const Brain = require('./ai/brain');
  brain = new Brain(db);

  createWindow();
  createTray();
  setupIPC();

  // Auto-expand on first launch so user can see the full UI
  setTimeout(() => {
    expandPanel();
  }, 1000);

  // Global shortcut  Alt+L
  globalShortcut.register('Alt+L', togglePanel);

  console.log('🌸 Lily is ready!  Press Alt+L to toggle.');
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (db) db.save();
});

// Keep app running in tray
app.on('window-all-closed', () => { /* stay alive */ });

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
