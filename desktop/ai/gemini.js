// ═══════════════════════════════════════════════════════════════
// Lily — Google Gemini Client (FREE API — 15 RPM, 1M tokens/day)
// Get your key at: https://aistudio.google.com/apikey
// ═══════════════════════════════════════════════════════════════

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Chat with Gemini
 * @param {string} apiKey - Your Gemini API key
 * @param {string} model - Model name (default: gemini-2.0-flash)
 * @param {string} systemPrompt - System instruction
 * @param {Array} messages - Array of {role, content} objects
 * @returns {string} The response text
 */
async function chat(apiKey, model, systemPrompt, messages) {
  const modelName = model || 'gemini-2.0-flash';

  // Convert messages to Gemini format
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
      topP: 0.95,
    },
  };

  const resp = await fetch(
    `${GEMINI_BASE}/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!resp.ok) {
    const errText = await resp.text();
    if (resp.status === 429) {
      throw new Error('Rate limit reached. Free tier allows 15 requests/minute. Please wait a moment.');
    }
    if (resp.status === 400 && errText.includes('API_KEY')) {
      throw new Error('Invalid API key. Get a free one at: https://aistudio.google.com/apikey');
    }
    throw new Error(`Gemini error (${resp.status}): ${errText.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return text;
}

/**
 * Quick check if the API key works
 */
async function testKey(apiKey) {
  try {
    const resp = await fetch(
      `${GEMINI_BASE}/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );
    return resp.ok;
  } catch (_) {
    return false;
  }
}

module.exports = { chat, testKey };
