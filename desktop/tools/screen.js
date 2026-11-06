// ═══════════════════════════════════════════════════════════════
// Lily — Screen Capture Tool (100% offline)
// Uses PowerShell to capture screenshot (no Electron API needed)
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

/**
 * Take a screenshot using PowerShell (works reliably on Windows)
 */
function takeScreenshot() {
  try {
    const dir = path.join(os.homedir(), 'Pictures', 'Lily Screenshots');
    fs.mkdirSync(dir, { recursive: true });

    const filename = `screenshot_${Date.now()}.png`;
    const filePath = path.join(dir, filename);

    // Use PowerShell to capture the entire screen
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

    return {
      message: `📸 Screenshot saved!\nPath: \`${filePath}\``,
      path: filePath,
    };
  } catch (err) {
    return { message: `Screenshot failed: ${err.message}` };
  }
}

module.exports = { takeScreenshot };
