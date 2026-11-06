// ═══════════════════════════════════════════════════════════════
// Lily — Ollama Client (Local LLM — 100% offline & free)
// Communicates with Ollama running at localhost:11434
// ═══════════════════════════════════════════════════════════════

const OLLAMA_BASE = 'http://localhost:11434';

/**
 * Check if Ollama is running
 */
async function isAvailable() {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return resp.ok;
  } catch (_) {
    return false;
  }
}

/**
 * List installed models
 */
async function listModels() {
  try {
    const resp = await fetch(`${OLLAMA_BASE}/api/tags`);
    const data = await resp.json();
    return (data.models || []).map(m => m.name);
  } catch (_) {
    return [];
  }
}

/**
 * Chat with Ollama (streaming disabled for simplicity)
 * @param {string} model - Model name (e.g. "llama3.2", "mistral")
 * @param {Array} messages - Array of {role, content} objects
 * @returns {string} The assistant's response text
 */
async function chat(model, messages) {
  const resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3.2',
      messages,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 512,
      },
    }),
    signal: AbortSignal.timeout(60000), // 60s timeout
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Ollama error (${resp.status}): ${err}`);
  }

  const data = await resp.json();
  return data.message?.content || '';
}

/**
 * Generate a one-shot completion
 */
async function generate(model, prompt) {
  const resp = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'llama3.2',
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 512 },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
  const data = await resp.json();
  return data.response || '';
}

module.exports = { isAvailable, listModels, chat, generate };
