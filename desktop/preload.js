// ═══════════════════════════════════════════════════════════════
// Lily AI Assistant — Preload Script (Secure IPC Bridge)
// Exposes safe APIs from main process to the renderer
// ═══════════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lily', {

  // ── Panel Control ──────────────────────────────────────────
  togglePanel:   () => ipcRenderer.send('toggle-panel'),
  expandPanel:   () => ipcRenderer.send('expand-panel'),
  collapsePanel: () => ipcRenderer.send('collapse-panel'),
  moveWindow:    (pos) => ipcRenderer.send('move-window', pos),

  onPanelState:   (cb) => ipcRenderer.on('panel-state', (_, s) => cb(s)),
  onShowSettings: (cb) => ipcRenderer.on('show-settings', () => cb()),

  // ── Chat / AI ──────────────────────────────────────────────
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),

  // ── Tools ──────────────────────────────────────────────────
  executeTool: (name, args) => ipcRenderer.invoke('execute-tool', name, args),

  // ── Screen ─────────────────────────────────────────────────
  captureScreen: () => ipcRenderer.invoke('capture-screen'),

  // ── Clipboard ──────────────────────────────────────────────
  readClipboard:  () => ipcRenderer.invoke('clipboard-read'),
  writeClipboard: (text) => ipcRenderer.invoke('clipboard-write', text),

  // ── Shell / External ───────────────────────────────────────
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // ── Database ───────────────────────────────────────────────
  db: {
    getConversations: ()            => ipcRenderer.invoke('db-get-conversations'),
    saveConversation: (role, text)   => ipcRenderer.invoke('db-save-conversation', role, text),
    clearConversations: ()           => ipcRenderer.invoke('db-clear-conversations'),

    getSavedItems:  ()               => ipcRenderer.invoke('db-get-saved-items'),
    saveItem:       (item)           => ipcRenderer.invoke('db-save-item', item),
    deleteItem:     (id)             => ipcRenderer.invoke('db-delete-item', id),

    getTasks:    ()                   => ipcRenderer.invoke('db-get-tasks'),
    saveTask:    (task)               => ipcRenderer.invoke('db-save-task', task),
    updateTask:  (id, updates)        => ipcRenderer.invoke('db-update-task', id, updates),
    deleteTask:  (id)                 => ipcRenderer.invoke('db-delete-task', id),

    getSettings: ()                   => ipcRenderer.invoke('db-get-settings'),
    saveSetting: (key, value)         => ipcRenderer.invoke('db-save-setting', key, value),
  },

  // ── System Info ────────────────────────────────────────────
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // ── Voice events ───────────────────────────────────────────
  onSpeakText: (cb) => ipcRenderer.on('speak-text', (_, text) => cb(text)),
});
