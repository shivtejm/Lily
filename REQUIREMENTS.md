# 🌸 Lily — Personal AI Assistant: Full Requirements Document

> **Vision:** Lily is a Siri/Google Assistant–style AI that runs on your Windows PC. She can hear you, see your screen, control your apps, manage your files, send emails, save things for later — and do anything you'd normally do manually.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Core Capabilities](#2-core-capabilities)
3. [Tech Stack](#3-tech-stack)
4. [Backend Server](#4-backend-server)
5. [Database](#5-database)
6. [APIs & Integrations Required](#6-apis--integrations-required)
7. [Desktop Agent (Python)](#7-desktop-agent-python)
8. [Frontend / UI](#8-frontend--ui)
9. [Chrome Extension (Existing → Enhanced)](#9-chrome-extension-existing--enhanced)
10. [Security & Safety](#10-security--safety)
11. [Folder Structure](#11-folder-structure)
12. [Development Phases](#12-development-phases)
13. [What You Need From the User](#13-what-you-need-from-the-user)

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        USER (You)                                │
│   Voice / Text / Screen Interaction                              │
└──────────┬──────────────────────────────────┬────────────────────┘
           │                                  │
           ▼                                  ▼
┌─────────────────────┐           ┌─────────────────────────┐
│   Electron Desktop  │◄─WebSocket─►│  Python Backend Server │
│   App (UI / Overlay)│           │  (FastAPI + Agent Core) │
│   - Chat window     │           │  - LLM Brain            │
│   - Voice toggle    │           │  - Tool Executor         │
│   - Screen viewer   │           │  - Screen Capture        │
│   - System tray     │           │  - App Automation        │
└─────────────────────┘           └───────────┬─────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │                        │                        │
                     ▼                        ▼                        ▼
          ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
          │   LLM Provider   │   │   External APIs   │   │   Local System   │
          │  (OpenAI / Claude│   │  Gmail, GDrive,   │   │   PyAutoGUI,     │
          │   / Ollama local)│   │  Notion, Calendar │   │   subprocess,    │
          └──────────────────┘   │  etc.             │   │   file I/O       │
                                 └──────────────────┘   └──────────────────┘
                                              │
                                              ▼
                                 ┌──────────────────┐
                                 │    Database       │
                                 │  (SQLite local +  │
                                 │   Supabase cloud) │
                                 └──────────────────┘
```

### Answer: **Yes, you need a backend, a database, and multiple APIs.**

---

## 2. Core Capabilities

| # | Capability | Example Command | What's Needed |
|---|-----------|----------------|---------------|
| 1 | **Voice Input/Output** | "Lily, open YouTube" | Wake word detection, STT, TTS |
| 2 | **Open/Close Apps** | "Open Chrome" / "Close Notepad" | `subprocess`, `pyautogui`, OS integration |
| 3 | **Browser Control** | "Play Shape of You on YouTube" | Selenium / Playwright + Chrome Extension |
| 4 | **File Management** | "Create a folder called 'Projects' on Desktop" | Python `os`, `shutil`, `pathlib` |
| 5 | **Write Code** | "Write factorial code in VS Code at C:\\code\\math.py" | VS Code CLI (`code` command) + file writing |
| 6 | **System Control** | "Shut down my PC" / "Set volume to 50%" | `subprocess` (shutdown), `pycaw` (volume) |
| 7 | **Screen Reading** | "What's on my screen?" / Contextual awareness | Screenshot → Vision LLM (GPT-4o / Claude) |
| 8 | **Save for Later** | "Save this article for later" | Google Drive API / Notion API / local DB |
| 9 | **Email** | "Write an email to hr@company.com for this job" | Gmail API (OAuth2) |
| 10 | **Task Management** | "Remind me to apply tomorrow" | Notion API / Google Tasks / local DB |
| 11 | **Clipboard** | "Copy this" / "Paste my resume" | `pyperclip` |
| 12 | **Web Search** | "Search for React developer jobs in Hyderabad" | Google Search API / SerpAPI |

---

## 3. Tech Stack

### 3.1 Desktop App (Frontend UI)
| Component | Technology | Why |
|-----------|-----------|-----|
| Desktop Framework | **Electron** (or **Tauri** for lighter weight) | Cross-platform desktop app with web UI |
| UI | **React + Vite** | Already in your project, modern & fast |
| Styling | **CSS** (glassmorphism dark theme) | Continuation of your existing design |
| Communication | **WebSocket** | Real-time bidirectional with Python backend |

### 3.2 Backend / AI Brain (Python)
| Component | Technology | Why |
|-----------|-----------|-----|
| Web Framework | **FastAPI** | Async, WebSocket support, fast |
| AI/LLM | **OpenAI GPT-4o** (primary) or **Ollama** (local/free) | Reasoning, tool selection, vision |
| Agent Framework | **LangChain** or **LangGraph** | Tool calling, memory, conversation chains |
| Voice → Text | **OpenAI Whisper** (API or local) or **Vosk** (offline) | Speech recognition |
| Text → Voice | **pyttsx3** (offline) or **ElevenLabs** (premium quality) | Voice response with Indian accent |
| Wake Word | **Picovoice Porcupine** | Always-listening "Lily" keyword detection |
| Screen Capture | **mss** or **pyautogui.screenshot()** | Fast screenshots for vision analysis |
| PC Automation | **PyAutoGUI** + **subprocess** | Mouse, keyboard, app control |
| Browser Automation | **Playwright** (or **Selenium**) | Controlling Chrome programmatically |
| OCR (optional) | **Tesseract** via **pytesseract** | Reading text from screen if needed |

### 3.3 Database
| Component | Technology | Why |
|-----------|-----------|-----|
| Local DB | **SQLite** | Zero setup, stores user profile, tasks, saved items |
| Cloud DB (optional) | **Supabase** (PostgreSQL) | Sync across devices, backup, auth |
| Vector Store (optional) | **ChromaDB** or **FAISS** | For semantic search over saved content |

### 3.4 Chrome Extension (Enhanced)
| Component | Technology | Why |
|-----------|-----------|-----|
| Extension | **Manifest V3** (existing) | Browser-level control, form fill, page reading |
| Communication | **Native Messaging** or **WebSocket** | Bridge between extension and Python backend |

---

## 4. Backend Server

You **need** a Python backend server running locally on your PC. This is the brain of Lily.

### What it does:
```
User speaks/types → Backend receives message
                  → LLM decides what to do (reasoning)
                  → Calls the right "tool" (function)
                  → Returns result to user via voice/text
```

### Key Backend Components:

```python
# Example tool definitions the LLM can call:

tools = [
    open_application,       # Opens any Windows app
    close_application,      # Closes a running app
    shutdown_pc,            # Shuts down the PC
    restart_pc,             # Restarts the PC
    take_screenshot,        # Captures current screen
    read_screen,            # Screenshot → Vision LLM → description
    open_url_in_chrome,     # Opens a URL in Chrome
    search_youtube,         # Searches and plays YouTube video
    write_file,             # Creates/writes content to a file
    read_file,              # Reads content from a file
    create_folder,          # Creates a directory
    move_file,              # Moves/renames files
    delete_file,            # Deletes a file (with confirmation!)
    send_email,             # Sends email via Gmail API
    reply_to_email,         # Replies to a specific email
    save_to_notion,         # Saves content to Notion
    save_to_gdrive,         # Uploads file to Google Drive
    create_task,            # Creates a reminder/task
    get_tasks,              # Lists pending tasks
    set_volume,             # Adjusts system volume
    search_web,             # Web search via SerpAPI/Google
    type_text,              # Types text using pyautogui
    click_at,               # Clicks at screen coordinates
    press_key,              # Presses keyboard key
    run_terminal_command,   # Runs a shell command
    open_vscode_file,       # Opens specific file in VS Code
    clipboard_copy,         # Copies to clipboard
    clipboard_paste,        # Pastes from clipboard
]
```

---

## 5. Database

### 5.1 Local SQLite Tables

```sql
-- User profile (your personal data Lily uses)
CREATE TABLE user_profile (
    id INTEGER PRIMARY KEY,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    skills TEXT,           -- JSON array
    education TEXT,        -- JSON array
    experience TEXT,       -- JSON array
    resume_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversation history (memory)
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,     -- 'user' or 'assistant'
    content TEXT NOT NULL,
    tool_used TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Saved items ("read later", "do later")
CREATE TABLE saved_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,     -- 'article', 'job', 'link', 'note', 'task'
    title TEXT,
    content TEXT,           -- URL, text content, or description
    source TEXT,            -- Where it was saved from
    status TEXT DEFAULT 'pending',  -- 'pending', 'done', 'archived'
    remind_at DATETIME,
    synced_to TEXT,         -- 'notion', 'gdrive', 'local'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks and reminders
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATETIME,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App usage / context log (what Lily has done)
CREATE TABLE action_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    details TEXT,
    success BOOLEAN DEFAULT 1,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Supabase (Optional Cloud Sync)
- Same tables as above, replicated to Supabase for:
  - Cross-device access (phone app in future)
  - Cloud backup
  - User authentication
  - Real-time sync

---

## 6. APIs & Integrations Required

### 6.1 AI/LLM APIs

| API | Purpose | Cost | Required? |
|-----|---------|------|-----------|
| **OpenAI API** (GPT-4o) | Main brain — reasoning, tool calling, vision (screen reading) | ~$5-30/month depending on usage | **Yes** (or use Ollama for free local alternative) |
| **OpenAI Whisper API** | Voice → Text (speech recognition) | ~$0.006/min | Optional (can use local Whisper or Vosk for free) |
| **ElevenLabs API** | High-quality Indian voice TTS | ~$5/month | Optional (can use free pyttsx3 offline) |
| **Ollama** (local) | Free local LLM alternative (Llama 3, Qwen, etc.) | Free | **Alternative** to OpenAI |

### 6.2 Google APIs (for email, drive, calendar)

| API | Purpose | Cost | Setup |
|-----|---------|------|-------|
| **Gmail API** | Send, read, reply to emails | Free | OAuth2 consent screen in Google Cloud Console |
| **Google Drive API** | Save files/articles to Drive | Free | Same Google Cloud project |
| **Google Calendar API** | Create events, reminders | Free | Same Google Cloud project |
| **Google Search API** | Web search results | Free tier (100/day) | API key from Google Cloud |

> **Setup Required:** Create a Google Cloud project → Enable these APIs → Create OAuth2 credentials → Download `credentials.json`

### 6.3 Notion API

| API | Purpose | Cost | Setup |
|-----|---------|------|-------|
| **Notion Integration API** | Save notes, tasks, articles to Notion | Free | Create integration at notion.so/my-integrations |

### 6.4 Other APIs (Optional)

| API | Purpose | Cost |
|-----|---------|------|
| **SerpAPI** | Better web search results | Free tier (100/month) |
| **Picovoice** | "Lily" wake word detection | Free tier |
| **LinkedIn API** | Job search integration | Restricted access |

---

## 7. Desktop Agent (Python)

### 7.1 System Control Tools

```python
import subprocess
import pyautogui
import os

# Open any application
def open_application(app_name: str):
    """Opens apps like Chrome, Notepad, VS Code, etc."""
    app_map = {
        "chrome": r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        "notepad": "notepad.exe",
        "vscode": "code",
        "explorer": "explorer.exe",
        "calculator": "calc.exe",
        # ... more apps
    }
    subprocess.Popen(app_map.get(app_name.lower(), app_name))

# Shutdown PC
def shutdown_pc():
    """Shuts down the PC after confirmation."""
    subprocess.run(["shutdown", "/s", "/t", "5"])  # 5 second delay

# Take and analyze screenshot
def read_screen():
    """Captures screen and sends to Vision LLM for understanding."""
    screenshot = pyautogui.screenshot()
    screenshot.save("current_screen.png")
    # Send to GPT-4o Vision or Claude for analysis
    # Returns description of what's on screen
```

### 7.2 Browser Control

```python
from playwright.sync_api import sync_playwright

def play_youtube_song(song_name: str):
    """Opens YouTube and plays a specific song."""
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp("http://localhost:9222")
        page = browser.new_page()
        page.goto(f"https://www.youtube.com/results?search_query={song_name}")
        page.click("ytd-video-renderer:first-child a#thumbnail")
```

### 7.3 File & Code Operations

```python
def write_code_to_file(file_path: str, code: str):
    """Writes code to a specific file and opens in VS Code."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w") as f:
        f.write(code)
    subprocess.Popen(["code", file_path])  # Open in VS Code
```

---

## 8. Frontend / UI

### Desktop Overlay App (Electron)

The UI should be a **floating overlay** that stays accessible:

- **System Tray Icon** — Lily lives in your taskbar; click to expand
- **Floating Orb** — Small glowing circle on screen (like the current Chrome extension orb)
- **Chat Panel** — Slide-out panel for text conversation
- **Voice Indicator** — Pulsing animation when Lily is listening
- **Screen Preview** — Shows what Lily "sees" when using screen reading
- **Notification Toasts** — Confirms actions ("✅ Email sent", "📁 File created")

### UI Design:
- Continue the **glassmorphism dark theme** from the current Chrome extension
- **Inter** font family
- Purple/violet accent colors
- Smooth animations (Framer Motion)

---

## 9. Chrome Extension (Existing → Enhanced)

The current Chrome extension stays, but with added capabilities:

| Current | Enhanced |
|---------|----------|
| Form auto-fill only | + Page content extraction |
| Voice commands (local) | + Connected to Python backend |
| Profile in side panel | + Synced with desktop app DB |
| Isolated | + Communicates with desktop agent via Native Messaging |

### Native Messaging Bridge
The extension will communicate with the Python backend using Chrome's **Native Messaging API**:
```
Chrome Extension ←→ native_messaging_host.py ←→ FastAPI Backend
```

---

## 10. Security & Safety

### Critical Safety Rules:
1. **Confirmation required** for destructive actions:
   - Shutting down / restarting PC
   - Deleting files
   - Sending emails
   - Making purchases
2. **Kill switch** — `Ctrl+Shift+Escape` to immediately stop all Lily actions
3. **Action logging** — Every action Lily takes is logged in `action_log` table
4. **OAuth2 scopes** — Request minimum necessary permissions for Google APIs
5. **No password storage** — Use OS keychain (Windows Credential Vault) for secrets
6. **Sandboxed execution** — Terminal commands run in restricted mode

---

## 11. Folder Structure

```
lily/
├── desktop/                    # Electron desktop app
│   ├── main.js                 # Electron main process
│   ├── preload.js              # Security bridge
│   ├── src/                    # React UI (Vite)
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatPanel.jsx
│   │   │   ├── VoiceButton.jsx
│   │   │   ├── ScreenPreview.jsx
│   │   │   ├── TaskList.jsx
│   │   │   └── Settings.jsx
│   │   └── styles/
│   ├── package.json
│   └── vite.config.js
│
├── backend/                    # Python backend (the brain)
│   ├── main.py                 # FastAPI + WebSocket server
│   ├── agent/
│   │   ├── brain.py            # LLM agent with tool calling
│   │   ├── memory.py           # Conversation history management
│   │   └── prompts.py          # System prompts for Lily's personality
│   ├── tools/
│   │   ├── system.py           # Open/close apps, shutdown, volume
│   │   ├── browser.py          # Chrome/YouTube/web control
│   │   ├── files.py            # File management, code writing
│   │   ├── screen.py           # Screenshot, screen reading
│   │   ├── email_tool.py       # Gmail send/read/reply
│   │   ├── notion_tool.py      # Save to Notion
│   │   ├── gdrive_tool.py      # Save to Google Drive
│   │   ├── search.py           # Web search
│   │   ├── clipboard.py        # Copy/paste
│   │   └── tasks.py            # Task/reminder management
│   ├── voice/
│   │   ├── stt.py              # Speech-to-text (Whisper/Vosk)
│   │   ├── tts.py              # Text-to-speech (pyttsx3/ElevenLabs)
│   │   └── wake_word.py        # "Lily" wake word detection
│   ├── db/
│   │   ├── database.py         # SQLite connection & queries
│   │   ├── models.py           # Data models
│   │   └── lily.db             # SQLite database file
│   ├── config/
│   │   ├── settings.py         # API keys, paths, preferences
│   │   └── credentials.json    # Google OAuth credentials
│   ├── requirements.txt        # Python dependencies
│   └── .env                    # Environment variables (API keys)
│
├── extension/                  # Chrome Extension (enhanced existing)
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── content.css
│   ├── popup.html
│   ├── sidepanel.html
│   ├── native_messaging_host.py  # Bridge to Python backend
│   └── src/                    # React popup (existing)
│
├── shared/                     # Shared types/constants
│   └── constants.js
│
├── scripts/
│   ├── install.ps1             # One-click Windows setup script
│   ├── start.ps1               # Start Lily (backend + desktop)
│   └── register_native_host.ps1 # Register Chrome native messaging
│
├── REQUIREMENTS.md             # This file
├── README.md
├── package.json                # Root package.json (monorepo)
└── .env.example                # Template for API keys
```

---

## 12. Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up Python backend with FastAPI + WebSocket
- [ ] Implement basic LLM integration (OpenAI or Ollama)
- [ ] Create SQLite database with all tables
- [ ] Build basic tool: open app, close app, file create
- [ ] Text-based chat working (no voice yet)

### Phase 2: System Control (Week 3-4)
- [ ] Full system tools (shutdown, restart, volume, brightness)
- [ ] File management (create, move, delete, read)
- [ ] App launching (Chrome, VS Code, Notepad, etc.)
- [ ] Code generation + writing to specific file paths
- [ ] Terminal command execution

### Phase 3: Voice (Week 5-6)
- [ ] Wake word detection ("Lily")
- [ ] Speech-to-text integration
- [ ] Text-to-speech with Indian voice
- [ ] Continuous listening mode
- [ ] Voice feedback (confirmations, errors)

### Phase 4: Screen Reading (Week 7-8)
- [ ] Screenshot capture on demand
- [ ] Vision LLM integration (GPT-4o / Claude)
- [ ] Context-aware responses ("What's on my screen?")
- [ ] Auto-detect when user needs help
- [ ] OCR for text extraction

### Phase 5: External Integrations (Week 9-10)
- [ ] Gmail API (send, read, reply)
- [ ] Google Drive API (save files/links)
- [ ] Notion API (save notes, tasks)
- [ ] Web search integration
- [ ] "Save for later" feature working end-to-end

### Phase 6: Browser Control (Week 11-12)
- [ ] Enhanced Chrome extension with native messaging
- [ ] YouTube search and play
- [ ] Page content extraction (articles, job listings)
- [ ] Form auto-fill (already exists, enhance)
- [ ] Browser tab management

### Phase 7: Desktop App UI (Week 13-14)
- [ ] Electron app setup
- [ ] Floating orb + chat panel
- [ ] System tray integration
- [ ] Settings panel
- [ ] Beautiful glassmorphism UI
- [ ] Real-time status indicators

### Phase 8: Polish & Intelligence (Week 15-16)
- [ ] Conversation memory (remember past interactions)
- [ ] Smart suggestions based on context
- [ ] Error handling and retry logic
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Documentation

---

## 13. What You Need From the User

Before we start building, I need you to decide/provide the following:

### 🔴 Must Have (Before Starting)

| # | Question | Options |
|---|----------|---------|
| 1 | **Which LLM do you want as the brain?** | `OpenAI GPT-4o` (best, ~$5-30/mo) / `Ollama local` (free, needs good GPU) / `Both` (Ollama default, GPT-4o for vision) |
| 2 | **Do you have an OpenAI API key?** | Yes / No (I'll guide you to get one) |
| 3 | **Voice quality preference?** | `pyttsx3` (free, decent) / `ElevenLabs` (premium, ~$5/mo) |
| 4 | **Where to save "read later" items?** | `Notion` / `Google Drive` / `Local only` / `All of the above` |
| 5 | **Do you have a Google Cloud account?** | Yes / No (needed for Gmail, Drive, Calendar APIs) |
| 6 | **Do you have a Notion account?** | Yes / No |
| 7 | **Python installed on your PC?** | Yes (which version?) / No |
| 8 | **Node.js version?** | Check with `node -v` |
| 9 | **GPU available?** | Yes (which?) / No (affects local LLM choice) |

### 🟡 Nice to Have (Can Decide Later)

| # | Question | Options |
|---|----------|---------|
| 10 | **Desktop app framework?** | `Electron` (familiar, larger) / `Tauri` (lighter, Rust-based) |
| 11 | **Want Supabase cloud sync?** | Yes (cross-device) / No (local only is fine) |
| 12 | **Custom wake word?** | "Lily" / "Hey Lily" / Custom |
| 13 | **Lily's personality?** | Professional / Friendly casual / Customizable |

---

## Quick Summary

| Component | Needed? | Technology |
|-----------|---------|-----------|
| **Backend Server** | ✅ YES | Python + FastAPI (runs locally on your PC) |
| **Database** | ✅ YES | SQLite (local) + optionally Supabase (cloud) |
| **LLM API** | ✅ YES | OpenAI GPT-4o or Ollama (local) |
| **Google APIs** | ✅ YES (for email/drive) | Gmail, Drive, Calendar APIs (free) |
| **Notion API** | 🟡 Optional | For "save for later" to Notion |
| **Voice APIs** | ✅ YES | Whisper (STT) + pyttsx3/ElevenLabs (TTS) |
| **Desktop App** | ✅ YES | Electron or Tauri |
| **Chrome Extension** | ✅ YES (enhance existing) | Manifest V3 + Native Messaging |
| **Screen Reading** | ✅ YES | Screenshots + GPT-4o Vision |

---

> **Bottom line:** Lily is a **multi-component system** — a Python backend brain, an Electron desktop UI, an enhanced Chrome extension, and multiple API integrations. It's a serious project, but completely buildable step by step. 🌸
