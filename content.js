/* ═══════════════════════════════════════════════════════════
   Lily AI Assistant - Interactive Content Script
   Page-aware, voice-controlled, conversational AI assistant
   ═══════════════════════════════════════════════════════════ */

let isListening = false;
let recognition = null;
let justDragged = false;

// ═══════════════════════════════════════
//  PAGE SCANNER — Reads the DOM
// ═══════════════════════════════════════

function scanPageElements() {
  const elements = [];
  const inputs = document.querySelectorAll('input, textarea, select, button, [role="button"], [role="listbox"], [role="combobox"]');

  inputs.forEach((el, index) => {
    if (el.type === 'hidden' || el.offsetParent === null) return; // skip hidden
    if (el.closest('#lily-assistant-root')) return; // skip Lily's own UI

    const info = {
      element: el,
      index,
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      label: getElementLabel(el),
      value: el.value || '',
      id: el.id || '',
      name: el.name || '',
      placeholder: el.placeholder || '',
    };

    if (el.tagName === 'SELECT') {
      info.options = Array.from(el.options).map(o => ({
        value: o.value,
        text: o.textContent.trim(),
        selected: o.selected
      })).filter(o => o.value);
    }

    if (el.tagName === 'BUTTON' || el.type === 'submit' || el.type === 'button' || el.getAttribute('role') === 'button') {
      info.isButton = true;
      info.buttonText = el.textContent.trim() || el.getAttribute('aria-label') || el.value || '';
    }

    if (el.type === 'checkbox' || el.type === 'radio') {
      info.checked = el.checked;
    }

    elements.push(info);
  });

  return elements;
}

function getElementLabel(el) {
  // 1. label[for]
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent.trim().toLowerCase();
  }
  // 2. parent label
  const parentLabel = el.closest('label');
  if (parentLabel) {
    const text = Array.from(parentLabel.childNodes)
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim())
      .join(' ');
    if (text) return text.toLowerCase();
    return parentLabel.textContent.trim().toLowerCase();
  }
  // 3. aria-label
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').toLowerCase();
  // 4. placeholder
  if (el.placeholder) return el.placeholder.toLowerCase();
  // 5. preceding text / sibling label
  const prev = el.previousElementSibling;
  if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN')) {
    return prev.textContent.trim().toLowerCase();
  }
  // 6. name/id cleanup
  return (el.name || el.id || '').toLowerCase().replace(/[_-]/g, ' ');
}

function describePageFields() {
  const elements = scanPageElements();
  if (elements.length === 0) return "I don't see any form fields on this page.";

  const fieldNames = [];
  const buttonNames = [];

  elements.forEach(el => {
    if (el.isButton) {
      if (el.buttonText) buttonNames.push(el.buttonText);
    } else {
      const name = el.label || el.placeholder || el.name || el.id;
      if (name) fieldNames.push(name);
    }
  });

  let desc = '';
  if (fieldNames.length > 0) {
    desc += `I can see ${fieldNames.length} form field${fieldNames.length > 1 ? 's' : ''}: ${fieldNames.slice(0, 10).join(', ')}`;
    if (fieldNames.length > 10) desc += `, and ${fieldNames.length - 10} more`;
    desc += '. ';
  }
  if (buttonNames.length > 0) {
    desc += `I also see button${buttonNames.length > 1 ? 's' : ''}: ${buttonNames.slice(0, 5).join(', ')}.`;
  }

  return desc || "I see some elements but couldn't identify their labels.";
}

// ═══════════════════════════════════════
//  SMART ELEMENT FINDER
// ═══════════════════════════════════════

function findElementByDescription(description) {
  const desc = description.toLowerCase().trim();
  const elements = scanPageElements();

  // Score each element by how well it matches the description
  let bestMatch = null;
  let bestScore = 0;

  elements.forEach(info => {
    let score = 0;
    const sources = [info.label, info.placeholder, info.name, info.id, info.buttonText || '']
      .filter(Boolean)
      .map(s => s.toLowerCase());

    sources.forEach(source => {
      if (source === desc) score += 100;
      else if (source.includes(desc)) score += 60;
      else if (desc.includes(source)) score += 40;
      else {
        // Word-level matching
        const descWords = desc.split(/\s+/);
        const sourceWords = source.split(/\s+/);
        const matches = descWords.filter(dw => sourceWords.some(sw => sw.includes(dw) || dw.includes(sw)));
        if (matches.length > 0) {
          score += (matches.length / descWords.length) * 50;
        }
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestMatch = info;
    }
  });

  return bestScore >= 20 ? bestMatch : null;
}

// ═══════════════════════════════════════
//  ELEMENT INTERACTION
// ═══════════════════════════════════════

function setFieldValue(input, value) {
  if (!value) return false;

  if (input.tagName === 'SELECT') {
    const options = Array.from(input.options);
    const match = options.find(o =>
      o.value.toLowerCase() === value.toLowerCase() ||
      o.textContent.trim().toLowerCase() === value.toLowerCase() ||
      o.textContent.trim().toLowerCase().includes(value.toLowerCase()) ||
      value.toLowerCase().includes(o.textContent.trim().toLowerCase())
    );
    if (match) {
      input.value = match.value;
    } else {
      return false;
    }
  } else if (input.type === 'checkbox') {
    const shouldCheck = ['yes', 'true', 'check', 'on', '1'].includes(value.toLowerCase());
    const shouldUncheck = ['no', 'false', 'uncheck', 'off', '0'].includes(value.toLowerCase());
    if (shouldCheck && !input.checked) input.click();
    else if (shouldUncheck && input.checked) input.click();
    else if (!shouldCheck && !shouldUncheck) input.click(); // toggle
  } else if (input.type === 'radio') {
    input.click();
  } else {
    const nativeSet = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (nativeSet) nativeSet.call(input, value);
    else input.value = value;
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));

  // Visual feedback
  input.classList.add('lily-filled');
  input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => input.classList.remove('lily-filled'), 2500);
  return true;
}

function clickElement(info) {
  if (info && info.element) {
    info.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      info.element.click();
      info.element.classList.add('lily-filled');
      setTimeout(() => info.element.classList.remove('lily-filled'), 1500);
    }, 300);
    return true;
  }
  return false;
}

// ═══════════════════════════════════════
//  COMMAND PARSER — NLP Intent Extraction
// ═══════════════════════════════════════

function parseCommand(transcript) {
  const text = transcript.toLowerCase().trim();

  // ── "fill all" / "fill form" / "fill everything" ──
  if (/^(fill|auto.?fill)\s*(all|form|everything|the form|fields)/.test(text)) {
    return { intent: 'fill_all' };
  }

  // ── "select [field] as [value]" / "set [field] to [value]" / "choose [value] for [field]" ──
  let match = text.match(/(?:select|set|choose|pick|change|put|type|enter|write|fill)\s+(.+?)\s+(?:as|to|with|=|is|equals?)\s+(.+)/);
  if (match) {
    return { intent: 'set_field', field: match[1].trim(), value: match[2].trim() };
  }

  // ── "fill [field] [value]" — simpler pattern ──
  match = text.match(/(?:fill|type|enter|write)\s+(.+?)\s+(?:as|with|to)\s+(.+)/);
  if (match) {
    return { intent: 'set_field', field: match[1].trim(), value: match[2].trim() };
  }

  // ── "choose [value] for [field]" / "select [value] in [field]" ──
  match = text.match(/(?:choose|select|pick)\s+(.+?)\s+(?:for|in|from)\s+(.+)/);
  if (match) {
    return { intent: 'set_field', field: match[2].trim(), value: match[1].trim() };
  }

  // ── "gender male" / "name John" — direct field value ──
  match = text.match(/^(\w[\w\s]{0,20}?)\s+(male|female|other|yes|no|single|married|divorced|indian|\d[\d\s.,%-]*|[a-z]+@\S+)$/i);
  if (match) {
    return { intent: 'set_field', field: match[1].trim(), value: match[2].trim() };
  }

  // ── "click [button]" / "press [button]" / "submit" ──
  match = text.match(/(?:click|press|tap|hit)\s+(?:on\s+|the\s+)?(.+)/);
  if (match) {
    return { intent: 'click', target: match[1].trim() };
  }
  if (/^submit/.test(text)) {
    return { intent: 'click', target: 'submit' };
  }

  // ── "what is on the screen" / "what fields" / "describe" / "what do you see" ──
  if (/what.*(screen|page|see|field|form|here)|describe|scan|look|read.*page|show.*field/i.test(text)) {
    return { intent: 'describe_page' };
  }

  // ── "read [field]" / "what is [field]" / "what's in [field]" ──
  match = text.match(/(?:read|what(?:'s| is| is in| value))\s+(?:the\s+|in\s+)?(.+?)(?:\s*field|\s*value)?$/);
  if (match && !match[1].includes('screen') && !match[1].includes('page')) {
    return { intent: 'read_field', field: match[1].trim() };
  }

  // ── "scroll down/up" ──
  if (/scroll\s*(down|up|bottom|top)/.test(text)) {
    const direction = text.includes('up') || text.includes('top') ? 'up' : 'down';
    return { intent: 'scroll', direction };
  }

  // ── "clear [field]" ──
  match = text.match(/(?:clear|erase|delete|remove|empty)\s+(?:the\s+)?(.+?)(?:\s*field)?$/);
  if (match) {
    return { intent: 'clear_field', field: match[1].trim() };
  }

  // ── Greetings ──
  if (/hello|hi|hey|namaste|good\s*(morning|afternoon|evening)|wake up/i.test(text)) {
    return { intent: 'greeting' };
  }

  // ── Thanks ──
  if (/thank|thanks|dhanyavaad|shukriya/i.test(text)) {
    return { intent: 'thanks' };
  }

  // ── Help ──
  if (/help|what\s+can\s+you|commands|how\s+do/i.test(text)) {
    return { intent: 'help' };
  }

  // ── Stop ──
  if (/stop|quiet|shut|silence|mute|bye|goodbye/i.test(text)) {
    return { intent: 'stop' };
  }

  return { intent: 'unknown', text };
}

// ═══════════════════════════════════════
//  COMMAND EXECUTOR
// ═══════════════════════════════════════

async function executeCommand(command) {
  switch (command.intent) {

    case 'fill_all': {
      const storage = await chrome.storage.local.get('userInfo');
      const data = storage.userInfo;
      if (!data || !data.firstName) {
        return "You haven't set up your profile yet. Open the side panel and fill in your details first.";
      }
      const count = await autoFillAllFields(data);
      return count > 0
        ? `Done! I filled ${count} field${count > 1 ? 's' : ''} for you. Please review them.`
        : "I couldn't find any matching fields on this page.";
    }

    case 'set_field': {
      const info = findElementByDescription(command.field);
      if (!info) {
        return `I couldn't find a field called "${command.field}" on this page. Try saying "what fields are on the screen" to see available fields.`;
      }
      const success = setFieldValue(info.element, command.value);
      if (success) {
        const fieldName = info.label || info.name || info.id || command.field;
        return `Done! I set ${fieldName} to "${command.value}".`;
      } else {
        if (info.element.tagName === 'SELECT' && info.options) {
          const available = info.options.map(o => o.text).join(', ');
          return `I couldn't set that value. Available options are: ${available}`;
        }
        return `I couldn't set that value for ${command.field}.`;
      }
    }

    case 'click': {
      const info = findElementByDescription(command.target);
      if (!info) {
        // Try finding a button/link by text content
        const allClickable = document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"]');
        let found = null;
        allClickable.forEach(el => {
          if (el.closest('#lily-assistant-root')) return;
          const elText = (el.textContent || el.value || el.getAttribute('aria-label') || '').toLowerCase();
          if (elText.includes(command.target)) found = el;
        });
        if (found) {
          found.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => found.click(), 300);
          return `Clicking "${command.target}"!`;
        }
        return `I couldn't find a "${command.target}" button or element on this page.`;
      }
      clickElement(info);
      return `Clicking ${info.buttonText || info.label || command.target}!`;
    }

    case 'describe_page': {
      return describePageFields();
    }

    case 'read_field': {
      const info = findElementByDescription(command.field);
      if (!info) {
        return `I couldn't find a field called "${command.field}" on this page.`;
      }
      const fieldName = info.label || info.name || info.id;
      if (info.element.tagName === 'SELECT') {
        const selected = info.options?.find(o => o.selected);
        return selected ? `The ${fieldName} field is set to "${selected.text}".` : `The ${fieldName} field has no selection.`;
      }
      if (info.element.type === 'checkbox' || info.element.type === 'radio') {
        return `The ${fieldName} is ${info.checked ? 'checked' : 'not checked'}.`;
      }
      return info.value
        ? `The ${fieldName} field contains: "${info.value}".`
        : `The ${fieldName} field is empty.`;
    }

    case 'clear_field': {
      const info = findElementByDescription(command.field);
      if (!info) return `I couldn't find a field called "${command.field}".`;
      setFieldValue(info.element, '');
      return `Cleared the ${info.label || command.field} field.`;
    }

    case 'scroll': {
      const amount = command.direction === 'up' ? -400 : 400;
      window.scrollBy({ top: amount, behavior: 'smooth' });
      return `Scrolling ${command.direction}.`;
    }

    case 'greeting':
      return "Namaste! I'm Lily, your AI assistant. I can see this page and help you fill forms. Tell me what to do, like \"fill all fields\" or \"select gender as male\".";

    case 'thanks':
      return "You're welcome! Good luck with your application! Let me know if you need anything else.";

    case 'help':
      return "You can say things like: \"fill all fields\", \"select gender as male\", \"type John in first name\", \"click submit\", \"what fields are on the screen\", \"read email field\", or \"clear phone\".";

    case 'stop':
      return "__STOP__";

    default:
      return `I heard "${command.text}", but I'm not sure what to do. Try saying "help" for a list of commands, or "what's on the screen" so I can see the page.`;
  }
}

// ═══════════════════════════════════════
//  AUTO-FILL ALL (from profile)
// ═══════════════════════════════════════

async function autoFillAllFields(data) {
  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');

  const fieldMap = [
    { patterns: ['first name', 'firstname', 'given name', 'fname'], value: data.firstName },
    { patterns: ['last name', 'lastname', 'surname', 'family name', 'lname'], value: data.lastName },
    { patterns: ['email', 'e-mail', 'email address'], value: data.email },
    { patterns: ['phone', 'mobile', 'telephone', 'tel', 'contact number', 'cell', 'mobile number'], value: data.phone },
    { patterns: ['date of birth', 'dob', 'birth date', 'birthdate', 'birthday'], value: data.dob },
    { patterns: ['gender', 'sex'], value: data.gender },
    { patterns: ['marital', 'marital status'], value: data.maritalStatus },
    { patterns: ['nationality', 'citizen'], value: data.nationality },
    { patterns: ['father', 'father name', "father's name"], value: data.fatherName },
    { patterns: ['mother', 'mother name', "mother's name"], value: data.motherName },
    { patterns: ['aadhaar', 'aadhar', 'uid'], value: data.aadhaar },
    { patterns: ['pan', 'pan number', 'pan card'], value: data.pan },
    { patterns: ['passport', 'passport number'], value: data.passport },
    { patterns: ['voter', 'voter id', 'epic'], value: data.voterId },
    { patterns: ['driving', 'driving license', 'dl number'], value: data.drivingLicense },
    { patterns: ['address', 'street', 'house', 'residential address'], value: data.address },
    { patterns: ['city', 'town', 'district'], value: data.city },
    { patterns: ['state', 'province', 'region'], value: data.state },
    { patterns: ['zip', 'postal', 'pincode', 'pin code'], value: data.zip },
    { patterns: ['country', 'nation'], value: data.country },
    { patterns: ['linkedin', 'linked in'], value: data.linkedin },
    { patterns: ['portfolio', 'website', 'github'], value: data.portfolio },
    { patterns: ['company', 'current company', 'employer', 'organization'], value: data.company },
    { patterns: ['job title', 'designation', 'position', 'role', 'current role'], value: data.jobTitle },
    { patterns: ['experience', 'years of experience', 'work experience'], value: data.experience },
    { patterns: ['current ctc', 'current salary', 'present salary'], value: data.currentCtc },
    { patterns: ['expected ctc', 'expected salary', 'desired salary'], value: data.expectedCtc },
    { patterns: ['notice period', 'notice'], value: data.noticePeriod },
    { patterns: ['skill', 'skills', 'expertise', 'key skills'], value: data.skills },
    { patterns: ['qualification', 'highest qualification', 'degree', 'education'], value: data.qualification },
    { patterns: ['university', 'institute', 'college'], value: data.university },
    { patterns: ['passing year', 'year of passing', 'graduation year', 'batch'], value: data.passingYear },
    { patterns: ['cgpa', 'gpa', 'percentage', 'marks', 'grade'], value: data.cgpa },
    { patterns: ['specialization', 'branch', 'major', 'stream'], value: data.specialization },
    { patterns: ['language', 'languages', 'languages known'], value: data.languages },
    { patterns: ['blood', 'blood group', 'blood type'], value: data.bloodGroup },
    { patterns: ['emergency contact name', 'emergency name', 'kin name'], value: data.emergencyName },
    { patterns: ['emergency contact number', 'emergency phone', 'emergency mobile'], value: data.emergencyPhone },
    { patterns: ['resume', 'cv', 'resume url'], value: data.resumeUrl },
  ];

  const inputs = document.querySelectorAll('input, textarea, select');
  let filledCount = 0;

  inputs.forEach(input => {
    if (input.closest('#lily-assistant-root')) return;
    const label = getElementLabel(input);
    if (!label) return;

    // Full name check
    if (/full\s*name|your\s*name|applicant\s*name|candidate\s*name/.test(label) &&
        !/first|last|company|middle|user|father|mother|emergency/.test(label)) {
      if (setFieldValue(input, fullName)) filledCount++;
      return;
    }

    for (const field of fieldMap) {
      if (field.value && field.patterns.some(p => label.includes(p))) {
        if (setFieldValue(input, field.value)) filledCount++;
        return;
      }
    }
  });

  return filledCount;
}

// ═══════════════════════════════════════
//  VOICE — SYNTHESIS (Indian Female)
// ═══════════════════════════════════════

function speak(text) {
  if (text === '__STOP__') return;
  const synth = window.speechSynthesis;
  synth.cancel(); // cancel any current speech

  const utterance = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const indianVoice = voices.find(v =>
    (v.name.includes('Hindi') || v.name.includes('India') || v.lang.includes('hi') || v.lang.includes('en-IN')) &&
    (v.name.includes('Female') || v.name.includes('Heera') || v.name.includes('Google'))
  ) || voices.find(v => v.lang.includes('en-IN'));

  if (indianVoice) utterance.voice = indianVoice;
  utterance.pitch = 1.1;
  utterance.rate = 1.0;
  synth.speak(utterance);
}

// ═══════════════════════════════════════
//  VOICE — CONTINUOUS RECOGNITION
// ═══════════════════════════════════════

function startContinuousListening() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    updateLilyMessage("Speech recognition is not supported in this browser.");
    return;
  }

  if (isListening) return;

  recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.continuous = false;      // We'll restart manually for compatibility
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    updateLilyUI('listening');
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    addChatMessage('user', transcript);
    updateLilyMessage('Thinking...');

    const command = parseCommand(transcript);
    const response = await executeCommand(command);

    if (response === '__STOP__') {
      stopListening();
      updateLilyMessage("Okay, I'll be quiet. Click me when you need me!");
      addChatMessage('lily', "Okay, I'll be quiet. Click me when you need me!");
      return;
    }

    addChatMessage('lily', response);
    updateLilyMessage(response);
    speak(response);
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') {
      // Silently restart
    } else {
      updateLilyMessage(`Couldn't hear you: ${event.error}. Tap the mic to try again.`);
    }
  };

  recognition.onend = () => {
    // Auto-restart if still in listening mode
    if (isListening) {
      try { recognition.start(); } catch(e) { /* ignore */ }
    }
  };

  try {
    recognition.start();
  } catch(e) {
    updateLilyMessage("Couldn't start listening. Please try again.");
  }
}

function stopListening() {
  isListening = false;
  if (recognition) {
    try { recognition.stop(); } catch(e) { /* ignore */ }
  }
  updateLilyUI('idle');
}

// ═══════════════════════════════════════
  //  DRAG FUNCTIONALITY
  // ═══════════════════════════════════════

let justDragged = false;

function makeDraggable(element, onDragEnd) {
  let isDragging = false;
  let didMove = false;
  let startX, startY, initialX, initialY;

  function onMouseDown(e) {
    if (e.target.closest('button') || e.target.closest('input')) return;
    isDragging = true;
    didMove = false;
    element.classList.add('lily-dragging');
    startX = e.clientX;
    startY = e.clientY;
    const rect = element.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    element.style.transition = 'none';
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 3 || dy > 3) didMove = true;
    element.style.left = `${initialX + (e.clientX - startX)}px`;
    element.style.top = `${initialY + (e.clientY - startY)}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  }

  async function onMouseUp(e) {
    const moved = didMove;
    isDragging = false;
    element.classList.remove('lily-dragging');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    element.style.transition = '';
    
    if (moved) {
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 100);
      const rect = element.getBoundingClientRect();
      const pos = { left: rect.left, top: rect.top };
      await chrome.storage.local.set({ lilyPosition: pos });
      if (onDragEnd) onDragEnd(pos);
      e.preventDefault();
      e.stopPropagation();
    }
  }

  element.addEventListener('mousedown', onMouseDown);
}

async function loadLilyPosition(element) {
  const storage = await chrome.storage.local.get('lilyPosition');
  if (storage.lilyPosition) {
    element.style.left = `${storage.lilyPosition.left}px`;
    element.style.top = `${storage.lilyPosition.top}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  }
}

// ═══════════════════════════════════════
  //  UI — INJECTION & MANAGEMENT
  // ═══════════════════════════════════════

function injectLily() {
  if (document.getElementById('lily-assistant-root')) return;

  const root = document.createElement('div');
  root.id = 'lily-assistant-root';
  document.body.appendChild(root);

  root.innerHTML = `
    <div id="lily-bubble" class="lily-glass">
      <div class="lily-drag-handle"></div>
      <div class="lily-orb"></div>
      <div class="lily-status">Lily</div>
    </div>
    <div id="lily-panel" class="lily-glass hidden">
      <div class="lily-header">
        <span>✨ Lily AI Assistant</span>
        <div class="lily-header-actions">
          <button id="lily-mic-btn" class="lily-icon-btn" title="Toggle voice">🎙️</button>
          <button id="lily-close" class="lily-icon-btn" title="Close">&times;</button>
        </div>
      </div>
      <div id="lily-chat" class="lily-chat">
        <div class="lily-msg lily-msg-lily">
          <div class="lily-msg-bubble">Namaste! 🙏 I can see this page. Try saying:<br>
          • "What fields are on the screen?"<br>
          • "Select gender as male"<br>
          • "Fill all fields"<br>
          • "Click submit"<br>
          Tap 🎙️ to start talking!</div>
        </div>
      </div>
      <div class="lily-input-bar">
        <input type="text" id="lily-text-input" placeholder="Type a command..." />
        <button id="lily-send-btn" title="Send">➤</button>
      </div>
    </div>
  `;

  // ── Load saved position ──
  const bubble = document.getElementById('lily-bubble');
  const panel = document.getElementById('lily-panel');
  loadLilyPosition(bubble);

  // ── Make bubble draggable ──
  makeDraggable(bubble, (pos) => {
    if (!panel.classList.contains('hidden')) {
      panel.style.left = `${pos.left}px`;
      panel.style.top = `${pos.top - 10 - 520}px`;
    }
  });

  // ── Make panel draggable ──
  makeDraggable(panel, (pos) => {
    chrome.storage.local.set({ lilyPosition: pos });
  });

  // ── Event Binding ──
  const closeBtn = document.getElementById('lily-close');
  const micBtn = document.getElementById('lily-mic-btn');
  const textInput = document.getElementById('lily-text-input');
  const sendBtn = document.getElementById('lily-send-btn');

  bubble.onclick = (e) => {
    if (justDragged) return;
    if (e.target.closest('button') || e.target.closest('input')) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      speak("Namaste! I can see this page. How can I help?");
    }
  };

  closeBtn.onclick = () => {
    panel.classList.add('hidden');
    stopListening();
  };

  micBtn.onclick = () => {
    if (isListening) {
      stopListening();
      addChatMessage('lily', "Voice mode off. You can still type commands below.");
      speak("Voice mode off.");
    } else {
      startContinuousListening();
      addChatMessage('lily', "I'm listening! Speak your command.");
      speak("I'm listening!");
    }
  };

  // Text input support
  const handleTextCommand = async () => {
    const text = textInput.value.trim();
    if (!text) return;
    textInput.value = '';

    addChatMessage('user', text);
    updateLilyMessage('Thinking...');

    const command = parseCommand(text);
    const response = await executeCommand(command);

    if (response === '__STOP__') {
      stopListening();
      const msg = "Okay, I'll be quiet. Type or click 🎙️ when you need me!";
      addChatMessage('lily', msg);
      updateLilyMessage(msg);
      return;
    }

    addChatMessage('lily', response);
    updateLilyMessage(response);
    speak(response);
  };

  sendBtn.onclick = handleTextCommand;
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleTextCommand();
  });
}

function addChatMessage(sender, text) {
  const chat = document.getElementById('lily-chat');
  if (!chat) return;

  const msg = document.createElement('div');
  msg.className = `lily-msg lily-msg-${sender}`;
  msg.innerHTML = `<div class="lily-msg-bubble">${escapeHtml(text)}</div>`;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;

  // Keep only last 30 messages
  while (chat.children.length > 30) {
    chat.removeChild(chat.firstChild);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateLilyMessage(text) {
  // Update the bubble status text briefly
  const status = document.querySelector('#lily-assistant-root .lily-status');
  if (status) {
    if (isListening) status.textContent = '🎙️';
    else status.textContent = 'Lily';
  }
}

function updateLilyUI(state) {
  const micBtn = document.getElementById('lily-mic-btn');
  const orb = document.querySelector('#lily-assistant-root .lily-orb');

  if (state === 'listening') {
    if (micBtn) micBtn.textContent = '🔴';
    if (orb) orb.classList.add('lily-orb-active');
  } else {
    if (micBtn) micBtn.textContent = '🎙️';
    if (orb) orb.classList.remove('lily-orb-active');
  }
}

// ═══════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════

injectLily();

// Listen for messages from background / popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleLily") {
    const panel = document.getElementById('lily-panel');
    if (panel) panel.classList.toggle('hidden');
  }

  if (request.action === "fillForm") {
    chrome.storage.local.get('userInfo', (result) => {
      autoFillAllFields(result.userInfo || {}).then(count => {
        sendResponse({ status: "done", filled: count });
      });
    });
    return true; // keep async channel open
  }

  if (request.action === "startListening") {
    startContinuousListening();
    sendResponse({ status: "listening" });
  }

  return true;
});
