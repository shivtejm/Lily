// ═══════════════════════════════════════════════════════════════
// Lily AI Assistant — Renderer App Logic
// Handles UI state, chat, voice, and communication with main
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────
  const $orb        = document.getElementById('orb');
  const $panel      = document.getElementById('panel');
  const $chatArea   = document.getElementById('chat-area');
  const $welcome    = document.getElementById('welcome');
  const $input      = document.getElementById('msg-input');
  const $btnSend    = document.getElementById('btn-send');
  const $btnVoice   = document.getElementById('btn-voice');
  const $btnClose   = document.getElementById('btn-close');
  const $btnSettings      = document.getElementById('btn-settings');
  const $settingsPanel    = document.getElementById('settings-panel');
  const $btnSettingsClose = document.getElementById('btn-settings-close');
  const $statusText = document.getElementById('status-text');

  // Settings refs
  const $setProvider  = document.getElementById('set-provider');
  const $setModel     = document.getElementById('set-model');
  const $setVoice     = document.getElementById('set-voice');
  const $setVoiceName = document.getElementById('set-voice-name');
  const $btnClear     = document.getElementById('btn-clear-history');

  const $groupOllama  = document.getElementById('group-ollama');
  const $groupGemini  = document.getElementById('group-gemini');
  const $setGeminiKey = document.getElementById('set-gemini-key');
  const $setGeminiModel = document.getElementById('set-gemini-model');

  // ── State ───────────────────────────────────────────────────
  let isDragging = false;
  let dragMoved = false;
  let dragOffset = { x: 0, y: 0 };
  const DRAG_THRESHOLD = 5;

  let isListening = false;
  let recognition = null;
  let synth       = window.speechSynthesis;

  // ═══════════════════════════════════════════════════════════════
  // Panel Toggle
  // ═══════════════════════════════════════════════════════════════

  // ── Orb Click/Drag ─────────────────────────────────────────
  $orb.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragMoved = false;
    dragOffset = { x: e.screenX, y: e.screenY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const dx = Math.abs(e.screenX - dragOffset.x);
    const dy = Math.abs(e.screenY - dragOffset.y);
    
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      dragMoved = true;
      // move window relative to screen mouse pos and container offset
      window.lily.moveWindow({
        x: e.screenX - e.clientX,
        y: e.screenY - e.clientY
      });
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  $orb.addEventListener('click', (e) => {
    if (dragMoved) return; // Don't expand if we were dragging
    window.lily.expandPanel();
  });

  $btnClose.addEventListener('click', () => window.lily.collapsePanel());

  window.lily.onPanelState((state) => {
    if (state === 'expanded') {
      $orb.classList.add('hidden');
      $panel.classList.remove('hidden');
      $settingsPanel.classList.add('hidden');
      setTimeout(() => $input.focus(), 100);
    } else {
      $panel.classList.add('hidden');
      $settingsPanel.classList.add('hidden');
      $orb.classList.remove('hidden');
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // Settings
  // ═══════════════════════════════════════════════════════════════

  $btnSettings.addEventListener('click', () => {
    $settingsPanel.classList.toggle('hidden');
    loadSettings();
    populateVoices();
  });

  $btnSettingsClose.addEventListener('click', () => {
    $settingsPanel.classList.add('hidden');
    saveSettings();
  });

  window.lily.onShowSettings(() => {
    $settingsPanel.classList.remove('hidden');
    loadSettings();
    populateVoices();
  });

  async function loadSettings() {
    try {
      const s = await window.lily.db.getSettings();

      // AUTO-SET USER PROVIDED KEY
      if (!s.geminiKey || s.geminiKey.trim() === '') {
        const key = 'AIzaSyCOUby12kZRi9q7AyCqGHMXm9_dICMIeoU';
        await window.lily.db.saveSetting('geminiKey', key);
        s.geminiKey = key;
        await window.lily.db.saveSetting('provider', 'gemini');
        s.provider = 'gemini';
      }
      if (s.provider)  $setProvider.value  = s.provider;
      if (s.model)     $setModel.value     = s.model;
      if (s.voiceOut)  $setVoice.value     = s.voiceOut;
      
      if (s.geminiKey) $setGeminiKey.value = s.geminiKey;
      if (s.geminiModel) $setGeminiModel.value = s.geminiModel;

      updateProviderUI();
    } catch (_) {}
  }

  async function saveSettings() {
    await window.lily.db.saveSetting('provider',  $setProvider.value);
    await window.lily.db.saveSetting('model',     $setModel.value);
    await window.lily.db.saveSetting('voiceOut',  $setVoice.value);
    
    await window.lily.db.saveSetting('geminiKey', $setGeminiKey.value);
    await window.lily.db.saveSetting('geminiModel', $setGeminiModel.value);

    if ($setVoiceName.value) {
      await window.lily.db.saveSetting('voiceName', $setVoiceName.value);
    }
  }

  function updateProviderUI() {
    const p = $setProvider.value;
    $groupOllama.classList.toggle('hidden', p !== 'ollama');
    $groupGemini.classList.toggle('hidden', p !== 'gemini');
  }

  $setProvider.addEventListener('change', updateProviderUI);

  $btnClear.addEventListener('click', async () => {
    await window.lily.db.clearConversations();
    $chatArea.innerHTML = '';
    $chatArea.appendChild($welcome);
    $welcome.classList.remove('hidden');
  });

  function populateVoices() {
    const voices = synth.getVoices();
    $setVoiceName.innerHTML = '';
    voices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      $setVoiceName.appendChild(opt);
    });
  }
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoices;
  }

  // ═══════════════════════════════════════════════════════════════
  // Chat
  // ═══════════════════════════════════════════════════════════════

  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    text = text.trim();

    // Hide welcome
    $welcome.classList.add('hidden');

    // User bubble
    appendMessage('user', text);
    $input.value = '';

    // Typing indicator
    const $typing = showTyping();
    setStatus('Thinking…');

    try {
      const response = await window.lily.sendMessage(text);
      removeTyping($typing);

      appendMessage('assistant', response.text, response.toolUsed, response.error);

      // Speak if voice enabled
      speak(response.text);

      setStatus('Ready');
    } catch (err) {
      removeTyping($typing);
      appendMessage('assistant', `Error: ${err.message}`, null, true);
      setStatus('Ready');
    }
  }

  function appendMessage(role, text, toolUsed, isError) {
    const $msg = document.createElement('div');
    $msg.className = `msg ${role}`;

    const $bubble = document.createElement('div');
    $bubble.className = 'msg-bubble' + (isError ? ' error' : '');

    // Handle screenshot data URLs
    if (text.includes('[screenshot:')) {
      const match = text.match(/\[screenshot:(.*?)\]/);
      if (match) {
        const cleanText = text.replace(/\[screenshot:.*?\]/, '').trim();
        $bubble.textContent = cleanText || 'Here\'s your screenshot:';
        const img = document.createElement('img');
        img.src = match[1];
        img.className = 'screenshot-preview';
        $bubble.appendChild(img);
      } else {
        $bubble.textContent = text;
      }
    } else {
      // Simple code block detection
      $bubble.innerHTML = formatText(text);
    }

    $msg.appendChild($bubble);

    // Tool badge
    if (toolUsed) {
      const $tool = document.createElement('div');
      $tool.className = 'msg-tool';
      $tool.textContent = '⚡ ' + toolUsed;
      $msg.appendChild($tool);
    }

    // Timestamp
    const $time = document.createElement('div');
    $time.className = 'msg-time';
    $time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $msg.appendChild($time);

    $chatArea.appendChild($msg);
    $chatArea.scrollTop = $chatArea.scrollHeight;
  }

  function formatText(text) {
    // Escape HTML
    let safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Code blocks ```...```
    safe = safe.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // Inline code `...`
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Bold **...**
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return safe;
  }

  function showTyping() {
    const $t = document.createElement('div');
    $t.className = 'msg assistant';
    $t.innerHTML = '<div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
    $chatArea.appendChild($t);
    $chatArea.scrollTop = $chatArea.scrollHeight;
    return $t;
  }

  function removeTyping($t) {
    if ($t && $t.parentNode) $t.parentNode.removeChild($t);
  }

  function setStatus(text) {
    $statusText.textContent = text;
  }

  // ── Send handlers ──────────────────────────────────────────
  $btnSend.addEventListener('click', () => sendMessage($input.value));

  $input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage($input.value);
    }
  });

  // Quick action buttons
  document.querySelectorAll('.qa-btn').forEach(btn => {
    btn.addEventListener('click', () => sendMessage(btn.dataset.msg));
  });

  // ═══════════════════════════════════════════════════════════════
  // Voice (Web Speech API — works offline for TTS, online for STT)
  // ═══════════════════════════════════════════════════════════════

  // Speech Recognition (STT)
  function initRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      $input.value = text;
      sendMessage(text);
    };

    rec.onend = () => {
      isListening = false;
      $btnVoice.classList.remove('listening');
      setStatus('Ready');
    };

    rec.onerror = (e) => {
      console.warn('Speech recognition error:', e.error);
      isListening = false;
      $btnVoice.classList.remove('listening');
      if (e.error === 'not-allowed') {
        setStatus('Mic access denied');
      } else if (e.error === 'network') {
        setStatus('Voice needs internet');
      } else {
        setStatus('Ready');
      }
    };

    return rec;
  }

  $btnVoice.addEventListener('click', () => {
    if (!recognition) recognition = initRecognition();
    if (!recognition) {
      appendMessage('assistant', 'Speech recognition is not available in this environment.', null, true);
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      isListening = true;
      $btnVoice.classList.add('listening');
      setStatus('Listening…');
      recognition.start();
    }
  });

  // Text-to-Speech (TTS — works offline)
  async function speak(text) {
    try {
      const settings = await window.lily.db.getSettings();
      if (settings.voiceOut === 'off') return;
    } catch (_) {}

    // Don't read very long responses aloud
    if (text.length > 500) return;
    // Don't read error messages
    if (text.startsWith('Error:') || text.startsWith('Sorry,')) return;

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.1;
    utter.volume = 0.9;

    // Try to find an Indian English voice
    const voices = synth.getVoices();
    let voice = null;

    // Check saved preference
    try {
      const settings = await window.lily.db.getSettings();
      if (settings.voiceName) {
        voice = voices.find(v => v.name === settings.voiceName);
      }
    } catch (_) {}

    // Fallback: Indian English, then any English female
    if (!voice) voice = voices.find(v => v.lang === 'en-IN' && v.name.toLowerCase().includes('female'));
    if (!voice) voice = voices.find(v => v.lang === 'en-IN');
    if (!voice) voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'));
    if (!voice) voice = voices.find(v => v.lang.startsWith('en'));

    if (voice) utter.voice = voice;

    synth.speak(utter);
  }

  // Listen for speak requests from main process
  window.lily.onSpeakText((text) => speak(text));

  // ═══════════════════════════════════════════════════════════════
  // Init
  // ═══════════════════════════════════════════════════════════════

  async function init() {
    // Load conversation history
    try {
      const history = await window.lily.db.getConversations();
      if (history && history.length > 0) {
        $welcome.classList.add('hidden');
        history.forEach(msg => {
          appendMessage(msg.role, msg.content, msg.toolUsed);
        });
      }
    } catch (_) {}

    // Load settings
    loadSettings();

    console.log('🌸 Lily UI ready');
  }

  init();
})();
