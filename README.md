# Lily AI Job Assistant 🌸⚡

A Chrome Extension (Manifest V3) that acts as your personal AI assistant for job applications. Lily can auto-fill forms, respond to voice commands with an Indian female voice, and manage your professional profile — all from a beautiful glassmorphism UI.

## Features

- **Smart Form Auto-Fill** — Detects and fills 14+ field types (name, email, phone, address, skills, education, etc.) with React/Angular/Vue form compatibility
- **Voice Commands** — Speak to Lily using speech recognition (`en-IN` locale). Say "fill the form" to trigger auto-fill
- **Floating Assistant** — Lily appears as a glowing orb on every page. Click to expand the panel
- **Side Panel Profile** — Manage your complete professional profile in Chrome's side panel
- **Context Menu** — Right-click → "Fill with Lily" on any page
- **Keyboard Shortcut** — Press `Alt+L` to toggle the Lily panel
- **Visual Feedback** — Filled fields glow purple briefly so you can see what changed

## Tech Stack

- **Extension:** Chrome Manifest V3 (service worker, content scripts, side panel)
- **Popup UI:** React 19 + Vite + Framer Motion + Lucide Icons
- **Styling:** Glassmorphism dark theme with Inter font
- **Voice:** Web Speech API (SpeechSynthesis + SpeechRecognition)
- **Storage:** Chrome Storage API (local)

## Installation (Developer Mode)

1. **Clone & install dependencies:**
   ```bash
   git clone <repo-url>
   cd lily
   npm install
   ```

2. **Build the popup:**
   ```bash
   npm run build
   ```

3. **Copy static files to `dist/`:**
   ```bash
   # The build creates dist/ with the popup. Copy these additional files:
   cp manifest.json dist/
   cp background.js dist/
   cp content.js dist/
   cp content.css dist/
   cp sidepanel.html dist/
   cp sidepanel.js dist/
   cp -r icons dist/
   ```

4. **Load in Chrome:**
   - Navigate to `chrome://extensions`
   - Enable **Developer Mode** (top-right toggle)
   - Click **Load unpacked** and select the `dist/` folder

## Usage

1. Click the Lily extension icon to open the popup
2. Click **Open Profile** (or open the side panel) and fill in your details
3. Navigate to any job application form
4. Click the floating Lily orb or use **Fill Form Fields** from the popup
5. Review the auto-filled fields (they'll glow purple briefly)

## Project Structure

```
lily/
├── popup.html          # React popup entry point
├── manifest.json       # Chrome extension manifest
├── background.js       # Service worker (context menu, shortcuts)
├── content.js          # Content script (form fill, voice, UI injection)
├── content.css         # Content script styles (orb, panel, highlights)
├── sidepanel.html      # Side panel profile editor
├── sidepanel.js        # Side panel logic
├── icons/              # Extension icons (16, 48, 128px)
├── src/                # React source (Vite)
│   ├── main.jsx
│   ├── App.jsx         # Popup component
│   ├── App.css         # Popup styles
│   └── index.css       # Global styles
├── vite.config.js      # Vite build configuration
└── package.json
```

## Development

```bash
npm run dev    # Start Vite dev server (for popup development)
npm run build  # Build popup for production
npm run lint   # Run ESLint
```

> **Note:** The dev server is useful for developing the popup UI. To test the full extension (content scripts, background, side panel), you must build and load as unpacked.

## License

MIT
