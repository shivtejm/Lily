// ═══════════════════════════════════════════════════════════════
// Lily — Local JSON Database (100% offline, zero dependencies)
// Stores conversations, tasks, saved items, settings, and logs
// ═══════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

class Database {
  constructor(dataDir) {
    this.dbPath = path.join(dataDir, 'lily-data.json');
    this.data = {
      conversations: [],
      savedItems: [],
      tasks: [],
      actionLog: [],
      settings: {
        provider: 'offline',
        model: 'llama3.2',
        geminiKey: '',
        geminiModel: 'gemini-2.0-flash',
        voiceOut: 'on',
        voiceName: '',
      },
    };
  }

  // ── Persistence ─────────────────────────────────────────────

  load() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Merge with defaults (in case new fields were added)
        this.data = {
          conversations: parsed.conversations || [],
          savedItems:    parsed.savedItems    || [],
          tasks:         parsed.tasks         || [],
          actionLog:     parsed.actionLog     || [],
          settings:      { ...this.data.settings, ...(parsed.settings || {}) },
        };
      }
    } catch (err) {
      console.error('Database load error:', err.message);
    }
  }

  save() {
    try {
      const dir = path.dirname(this.dbPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Database save error:', err.message);
    }
  }

  close() {
    this.save();
  }

  // ── Conversations ───────────────────────────────────────────

  addConversation(role, content, toolUsed = null) {
    this.data.conversations.push({
      id: Date.now() + Math.random(),
      role,
      content,
      toolUsed,
      timestamp: new Date().toISOString(),
    });
    // Keep last 500 messages
    if (this.data.conversations.length > 500) {
      this.data.conversations = this.data.conversations.slice(-500);
    }
    this.save();
  }

  getConversations(limit = 50) {
    return this.data.conversations.slice(-limit);
  }

  clearConversations() {
    this.data.conversations = [];
    this.save();
  }

  // ── Saved Items (Read Later / Do Later) ─────────────────────

  addSavedItem(item) {
    const entry = {
      id: Date.now() + Math.random(),
      type:    item.type    || 'note',     // 'article', 'job', 'link', 'note', 'task'
      title:   item.title   || 'Untitled',
      content: item.content || '',
      source:  item.source  || '',
      status:  item.status  || 'pending',  // 'pending', 'done', 'archived'
      createdAt: new Date().toISOString(),
    };
    this.data.savedItems.push(entry);
    this.save();
    return entry;
  }

  getSavedItems(status) {
    if (status) {
      return this.data.savedItems.filter(i => i.status === status);
    }
    return this.data.savedItems;
  }

  updateSavedItem(id, updates) {
    const item = this.data.savedItems.find(i => i.id === id);
    if (item) {
      Object.assign(item, updates);
      this.save();
    }
    return item;
  }

  deleteSavedItem(id) {
    this.data.savedItems = this.data.savedItems.filter(i => i.id !== id);
    this.save();
  }

  // ── Tasks ───────────────────────────────────────────────────

  addTask(task) {
    const entry = {
      id: Date.now() + Math.random(),
      title:       task.title || 'Untitled Task',
      description: task.description || '',
      dueDate:     task.dueDate || null,
      priority:    task.priority || 'medium',
      status:      task.status || 'pending',  // 'pending', 'in_progress', 'done'
      createdAt:   new Date().toISOString(),
    };
    this.data.tasks.push(entry);
    this.save();
    return entry;
  }

  getTasks(status) {
    if (status) {
      return this.data.tasks.filter(t => t.status === status);
    }
    return this.data.tasks;
  }

  updateTask(id, updates) {
    const task = this.data.tasks.find(t => t.id === id);
    if (task) {
      Object.assign(task, updates);
      this.save();
    }
    return task;
  }

  deleteTask(id) {
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.save();
  }

  // ── Action Log ──────────────────────────────────────────────

  addAction(action, details, success = true) {
    this.data.actionLog.push({
      action,
      details,
      success,
      timestamp: new Date().toISOString(),
    });
    // Keep last 1000 actions
    if (this.data.actionLog.length > 1000) {
      this.data.actionLog = this.data.actionLog.slice(-1000);
    }
    this.save();
  }

  getActionLog(limit = 50) {
    return this.data.actionLog.slice(-limit);
  }

  // ── Settings ────────────────────────────────────────────────

  getSettings() {
    return { ...this.data.settings };
  }

  saveSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }
}

module.exports = Database;
