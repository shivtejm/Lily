// ═══════════════════════════════════════════════════════════════
// Lily — Vision Tool (Screen Reading + Analysis)
// Takes a screenshot and describes what's on screen
// Uses Ollama vision model if available, otherwise OCR-lite
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

/**
 * Capture the screen and analyze what's visible
 * If Ollama with a vision model is running, uses AI to describe the screen
 * Otherwise, attempts basic OCR via PowerShell
 */
async function analyzeScreen(question) {
  // Step 1: Take screenshot
  const dir = path.join(os.homedir(), 'Pictures', 'Lily Screenshots');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `screen_${Date.now()}.png`);

  try {
    const ps = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
      $graphics = [System.Drawing.Graphics]::FromImage($bmp)
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
      $bmp.Save('${filePath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $bmp.Dispose()
    `.replace(/\n/g, '; ');

    execSync(`powershell -Command "${ps}"`, { shell: true, timeout: 10000 });
  } catch (err) {
    return { message: `Screenshot failed: ${err.message}` };
  }

  // Step 2: Try Ollama vision model
  try {
    const available = await checkOllamaVision();
    if (available) {
      const description = await describeWithOllama(filePath, question);
      return {
        message: `👁️ **Screen Analysis:**\n\n${description}\n\n📸 Screenshot saved: \`${filePath}\``,
        path: filePath,
      };
    }
  } catch (_) {}

  // Step 3: Try to extract window title at least
  let activeWindow = 'Unknown';
  try {
    activeWindow = execSync(
      'powershell -Command "(Get-Process | Where-Object {$_.MainWindowTitle -ne \'\'} | Sort-Object -Property CPU -Descending | Select-Object -First 5 | ForEach-Object { $_.MainWindowTitle }) -join \\"`n\\""',
      { encoding: 'utf-8', shell: true, timeout: 5000 }
    ).trim();
  } catch (_) {}

  return {
    message: `📸 I took a screenshot and saved it.\n\n**Active Windows:**\n${activeWindow}\n\nPath: \`${filePath}\`\n\n💡 *For AI-powered screen reading, install Ollama with a vision model:*\n\`ollama pull llava\`\n*Then enable Ollama in Settings.*`,
    path: filePath,
  };
}

/**
 * Check if Ollama has a vision model available
 */
async function checkOllamaVision() {
  try {
    const resp = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    const models = (data.models || []).map(m => m.name.toLowerCase());
    // Check for vision-capable models
    return models.some(m =>
      m.includes('llava') || m.includes('vision') ||
      m.includes('bakllava') || m.includes('moondream')
    );
  } catch (_) {
    return false;
  }
}

/**
 * Send screenshot to Ollama vision model for description
 */
async function describeWithOllama(imagePath, question) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const prompt = question
    ? `Look at this screenshot and answer: ${question}`
    : 'Describe what you see on this computer screen. Be concise and specific about the applications, content, and any important information visible.';

  // Try vision models in order of preference
  const visionModels = ['llava', 'llava:13b', 'bakllava', 'moondream'];
  
  for (const model of visionModels) {
    try {
      const resp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          images: [base64Image],
          stream: false,
          options: { temperature: 0.3, num_predict: 300 },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (resp.ok) {
        const data = await resp.json();
        return data.response || 'Could not analyze the screen.';
      }
    } catch (_) {
      continue;
    }
  }

  throw new Error('No vision model available');
}

module.exports = { analyzeScreen };
