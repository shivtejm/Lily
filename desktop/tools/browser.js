// ═══════════════════════════════════════════════════════════════
// Lily — Browser & Web Tools
// Uses child_process to open URLs (no direct Electron import)
// ═══════════════════════════════════════════════════════════════

const { exec } = require('child_process');

/**
 * Open a URL in the default browser
 */
function openUrl(url) {
  let finalUrl = url;
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl;
  }
  exec(`start "" "${finalUrl}"`, { shell: true });
  return { message: `🌐 Opened: ${finalUrl}` };
}

/**
 * Search Google
 */
function searchGoogle(query) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  exec(`start "" "${url}"`, { shell: true });
  return { message: `🔍 Googled: "${query}"` };
}

/**
 * Search YouTube
 */
function searchYoutube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  exec(`start "" "${url}"`, { shell: true });
  return { message: `🔍 Searched YouTube: "${query}"` };
}

/**
 * Play on YouTube (opens search page)
 */
function playYoutube(query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  exec(`start "" "${url}"`, { shell: true });
  return { message: `🎵 Playing on YouTube: "${query}"\n(Opened search — click the first video to play)` };
}

module.exports = { openUrl, searchGoogle, searchYoutube, playYoutube };
