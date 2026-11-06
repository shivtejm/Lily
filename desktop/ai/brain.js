// ═══════════════════════════════════════════════════════════════
// Lily — AI Brain (Offline-first with Ollama upgrade)
// Pattern matching works WITHOUT any LLM/internet.
// Ollama adds natural-language understanding when available.
// ═══════════════════════════════════════════════════════════════

const os = require('os');
const ollama = require('./ollama');
const gemini = require('./gemini');
const { buildSystemPrompt } = require('./prompts');
const tools = require('../tools');

class Brain {
  constructor(db) {
    this.db = db;
    this.conversationHistory = [];
    this.provider = 'offline'; // 'offline' or 'ollama'
    this.model = 'llama3.2';
  }

  /**
   * Process a user message and return a response
   */
  async process(message) {
    // Load settings
    try {
      const settings = this.db.getSettings();
      this.provider = settings.provider || 'offline';
      this.model = settings.model || 'llama3.2';
      this.geminiKey = settings.geminiKey || '';
      this.geminiModel = settings.geminiModel || 'gemini-2.0-flash';
    } catch (_) {}

    // ── Step 1: Try pattern matching first (always works offline) ─
    const patternResult = this.patternMatch(message);
    if (patternResult) {
      // Execute the tool if one was matched
      if (patternResult.tool) {
        try {
          const toolResult = await tools.execute(patternResult.tool, patternResult.args);
          return {
            text: toolResult.message || patternResult.text,
            toolUsed: patternResult.tool,
          };
        } catch (err) {
          return { text: `Failed to execute: ${err.message}`, error: true };
        }
      }
      return { text: patternResult.text };
    }

    // ── Step 2: Try AI Providers (Ollama or Gemini) ──────────
    if (this.provider === 'ollama') {
      try {
        if (await ollama.isAvailable()) {
          return await this.processWithOllama(message);
        }
      } catch (_) {}
    } else if (this.provider === 'gemini') {
      if (this.geminiKey) {
        try {
          return await this.processWithGemini(message);
        } catch (err) {
          return { text: `Gemini error: ${err.message}. Falling back to offline mode.`, error: true };
        }
      }
    }

    // ── Step 3: Fallback — try knowledge search, then helpful message ─
    return {
      text: await this.fallbackResponse(message),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Pattern Matching Engine (100% offline)
  // ═══════════════════════════════════════════════════════════════

  patternMatch(msg) {
    const m = msg.toLowerCase().trim();

    // ── Greetings ─────────────────────────────────────────────
    if (/^(hi|hello|hey|sup|yo|good\s?(morning|afternoon|evening|night))[\s!.]*$/i.test(m)) {
      const greetings = [
        `Hey there! 🌸 How can I help you today?`,
        `Hello! What would you like me to do?`,
        `Hi! Lily here, ready to assist! 💜`,
        `Hey! What's on your mind?`,
      ];
      return { text: greetings[Math.floor(Math.random() * greetings.length)] };
    }

    // ── Identity ──────────────────────────────────────────────
    if (/who\s+are\s+you|what\s+are\s+you|your\s+name|what\s+can\s+you\s+do|capabilities|help/i.test(m)) {
      return {
        text: `I'm **Lily** 🌸, your personal AI assistant! Here's what I can do:\n\n` +
          `🖥️ **System Control** — Open/close apps, shutdown, restart, lock, volume\n` +
          `📁 **File Management** — Create, read, delete, move, copy, search files\n` +
          `🌐 **Browser** — Open URLs, Google search, YouTube\n` +
          `📸 **Screenshot** — Capture your screen\n` +
          `💻 **Code** — Write code to files, open in VS Code, run commands\n` +
          `📋 **Clipboard** — Copy/read clipboard\n` +
          `🎤 **Voice** — Talk to me using the mic button!\n\n` +
          `Try saying: "Open Chrome", "Create a file on Desktop", or "Take a screenshot"`,
      };
    }

    // ── Thank you ─────────────────────────────────────────────
    if (/^(thanks?|thank\s*you|thx|ty|appreciate)[\s!.]*$/i.test(m)) {
      return { text: `You're welcome! 💜 Let me know if you need anything else.` };
    }

    // ── Goodbye ───────────────────────────────────────────────
    if (/^(bye|goodbye|see\s*ya|later|good\s*night|exit|quit)[\s!.]*$/i.test(m)) {
      return { text: `Bye! 💜 I'll be right here if you need me. Press Alt+L anytime!` };
    }

    // ── Open Application ─────────────────────────────────────
    const openMatch = m.match(/^(?:open|launch|start|run)\s+(.+)/i);
    if (openMatch) {
      const appName = openMatch[1].replace(/[.!]+$/, '').trim();
      return { tool: 'openApp', args: { appName }, text: `Opening ${appName}…` };
    }

    // ── Close Application ────────────────────────────────────
    const closeMatch = m.match(/^(?:close|kill|stop|exit|quit)\s+(.+)/i);
    if (closeMatch) {
      const appName = closeMatch[1].replace(/[.!]+$/, '').trim();
      return { tool: 'closeApp', args: { appName }, text: `Closing ${appName}…` };
    }

    // ── Shutdown ──────────────────────────────────────────────
    if (/shut\s*down|power\s*off|turn\s*off\s*(the\s*)?(pc|computer|system)/i.test(m)) {
      return { tool: 'shutdownPC', args: {}, text: 'Shutting down…' };
    }

    // ── Restart ───────────────────────────────────────────────
    if (/restart|reboot/i.test(m)) {
      return { tool: 'restartPC', args: {}, text: 'Restarting…' };
    }

    // ── Lock Screen ───────────────────────────────────────────
    if (/lock\s*(the\s*)?(screen|pc|computer)|lock\s*it/i.test(m)) {
      return { tool: 'lockPC', args: {}, text: 'Locking screen…' };
    }

    // ── Sleep ─────────────────────────────────────────────────
    if (/sleep|hibernate/i.test(m)) {
      return { tool: 'sleepPC', args: {}, text: 'Going to sleep…' };
    }

    // ── Volume ────────────────────────────────────────────────
    const volMatch = m.match(/(?:set\s+)?volume\s+(?:to\s+)?(\d+)/i);
    if (volMatch) {
      return { tool: 'setVolume', args: { level: volMatch[1] }, text: `Setting volume to ${volMatch[1]}%` };
    }
    if (/mute|unmute/i.test(m)) {
      return { tool: 'muteVolume', args: {}, text: 'Toggling mute…' };
    }
    if (/volume\s+up/i.test(m)) {
      return { tool: 'setVolume', args: { level: '80' }, text: 'Volume up to 80%' };
    }
    if (/volume\s+down/i.test(m)) {
      return { tool: 'setVolume', args: { level: '30' }, text: 'Volume down to 30%' };
    }

    // ── Screenshot ────────────────────────────────────────────
    if (/screenshot|screen\s*shot|capture\s*(the\s*)?(screen|display)|snap\s*shot|print\s*screen/i.test(m)) {
      return { tool: 'takeScreenshot', args: {}, text: 'Taking screenshot…' };
    }

    // ── System Info ───────────────────────────────────────────
    if (/system\s*(info|information|status|specs?|details)|my\s+(pc|computer)/i.test(m)) {
      // Handled directly (not a tool) — returns info from main process
      const info = {
        platform: os.platform(),
        hostname: os.hostname(),
        username: os.userInfo().username,
        cpus: os.cpus().length + ' cores',
        totalRam: (os.totalmem() / 1073741824).toFixed(1) + ' GB',
        freeRam: (os.freemem() / 1073741824).toFixed(1) + ' GB',
        uptime: (os.uptime() / 3600).toFixed(1) + ' hours',
      };
      return {
        text: `💻 **System Info:**\n` +
          `- **User:** ${info.username}\n` +
          `- **Computer:** ${info.hostname}\n` +
          `- **CPU:** ${info.cpus}\n` +
          `- **RAM:** ${info.freeRam} free / ${info.totalRam} total\n` +
          `- **Uptime:** ${info.uptime}\n` +
          `- **OS:** Windows`,
      };
    }

    // ── Running Apps ──────────────────────────────────────────
    if (/running\s*(apps?|applications?|programs?|processes?)|what.s\s*running|list\s*(apps?|processes?)/i.test(m)) {
      return { tool: 'getRunningApps', args: {}, text: 'Checking running apps…' };
    }

    // ── Battery ───────────────────────────────────────────────
    if (/battery|charge|power\s*status/i.test(m)) {
      return { tool: 'getBatteryInfo', args: {}, text: 'Checking battery…' };
    }

    // ── Empty Recycle Bin ─────────────────────────────────────
    if (/empty\s*(the\s*)?(recycle|trash)\s*bin|clear\s*(trash|recycle)/i.test(m)) {
      return { tool: 'emptyRecycleBin', args: {}, text: 'Emptying recycle bin…' };
    }

    // ── Create File ───────────────────────────────────────────
    const createFileMatch = m.match(/create\s+(?:a\s+)?file\s+(?:called\s+|named\s+|at\s+)?["']?([^\s"']+)["']?\s*(?:with\s+(?:content\s+)?["']?(.+?)["']?)?$/i);
    if (createFileMatch) {
      return { tool: 'createFile', args: { filePath: createFileMatch[1], content: createFileMatch[2] || '' }, text: `Creating file…` };
    }
    // Simpler: "create file" on desktop
    if (/create\s+(?:a\s+)?file\s+(?:on\s+)?(?:the\s+)?desktop/i.test(m)) {
      const fp = require('path').join(os.homedir(), 'Desktop', 'new_file.txt');
      return { tool: 'createFile', args: { filePath: fp, content: '' }, text: `Creating file on Desktop…` };
    }

    // ── Create Folder ─────────────────────────────────────────
    const mkdirMatch = m.match(/(?:create|make|new)\s+(?:a\s+)?(?:folder|directory|dir)\s+(?:called\s+|named\s+|at\s+)?["']?([^\s"']+)["']?/i);
    if (mkdirMatch) {
      return { tool: 'createFolder', args: { folderPath: mkdirMatch[1] }, text: `Creating folder…` };
    }

    // ── List Files ────────────────────────────────────────────
    const listMatch = m.match(/(?:list|show|ls|dir)\s+(?:files?\s+(?:in|at|of)\s+)?["']?([^\s"']+)["']?/i);
    if (listMatch) {
      return { tool: 'listFiles', args: { dirPath: listMatch[1] }, text: `Listing files…` };
    }
    if (/list\s+(?:my\s+)?desktop\s*files?|what.s\s+on\s+(?:my\s+)?desktop/i.test(m)) {
      return { tool: 'listFiles', args: { dirPath: require('path').join(os.homedir(), 'Desktop') }, text: `Listing Desktop files…` };
    }

    // ── Read File ─────────────────────────────────────────────
    const readMatch = m.match(/(?:read|show|cat|open|display)\s+(?:the\s+)?(?:file\s+)?["']?([^\s"']+\.\w+)["']?/i);
    if (readMatch) {
      return { tool: 'readFile', args: { filePath: readMatch[1] }, text: `Reading file…` };
    }

    // ── Delete File ───────────────────────────────────────────
    const delMatch = m.match(/(?:delete|remove|rm)\s+(?:the\s+)?(?:file\s+)?["']?([^\s"']+)["']?/i);
    if (delMatch) {
      return { tool: 'deleteFile', args: { filePath: delMatch[1] }, text: `⚠️ Deleting file…` };
    }

    // ── Search Files ──────────────────────────────────────────
    const searchMatch = m.match(/(?:search|find|look\s+for)\s+(?:files?\s+)?(?:named?\s+|called\s+)?["']?([^\s"']+)["']?\s*(?:in\s+["']?([^\s"']+)["']?)?/i);
    if (searchMatch) {
      return { tool: 'searchFiles', args: { dirPath: searchMatch[2] || os.homedir(), pattern: searchMatch[1] }, text: `Searching…` };
    }

    // ── Open URL ──────────────────────────────────────────────
    const urlMatch = m.match(/(?:open|go\s+to|visit|browse)\s+(?:the\s+)?(?:url\s+|website\s+|site\s+)?["']?((?:https?:\/\/)?[\w.-]+\.\w{2,}(?:\/[^\s"']*)?)["']?/i);
    if (urlMatch) {
      return { tool: 'openUrl', args: { url: urlMatch[1] }, text: `Opening URL…` };
    }

    // ── Google Search ─────────────────────────────────────────
    const googleMatch = m.match(/(?:search|google)\s+(?:for\s+)?["']?(.+?)["']?$/i);
    if (googleMatch && !m.includes('youtube') && !m.includes('file')) {
      return { tool: 'searchGoogle', args: { query: googleMatch[1] }, text: `Searching Google…` };
    }

    // ── YouTube ───────────────────────────────────────────────
    const ytPlayMatch = m.match(/(?:play|put\s+on)\s+(.+?)\s+(?:on\s+)?youtube/i);
    if (ytPlayMatch) {
      return { tool: 'playYoutube', args: { query: ytPlayMatch[1] }, text: `Playing on YouTube…` };
    }
    const ytSearchMatch = m.match(/(?:search|find)\s+(.+?)\s+(?:on\s+)?youtube/i);
    if (ytSearchMatch) {
      return { tool: 'searchYoutube', args: { query: ytSearchMatch[1] }, text: `Searching YouTube…` };
    }
    // "open youtube" without search
    if (/^open\s+youtube$/i.test(m)) {
      return { tool: 'openUrl', args: { url: 'https://youtube.com' }, text: `Opening YouTube…` };
    }

    // ── Write Code / WAP (Write A Program) ─────────────────────
    // Matches: "write code for X", "WAP for X in java", "write a program for X", "code for X"
    const codeMatch = m.match(/(?:write\s+(?:a\s+)?(?:code|program|script)|wap|code|program)\s+(?:for\s+|to\s+)?(.+?)(?:\s+(?:in|using)\s+(\w+))?$/i);
    if (codeMatch) {
      const what = codeMatch[1].replace(/\s+in\s+\w+$/, '').trim();
      const lang = (codeMatch[2] || '').toLowerCase();

      // Map language to file extension
      const langExtMap = {
        'python': '.py', 'py': '.py',
        'javascript': '.js', 'js': '.js', 'node': '.js',
        'java': '.java',
        'c': '.c', 'cpp': '.cpp', 'c++': '.cpp',
        'html': '.html',
        'typescript': '.ts', 'ts': '.ts',
        'rust': '.rs', 'go': '.go',
        'ruby': '.rb', 'php': '.php',
        'csharp': '.cs', 'c#': '.cs',
      };
      const ext = langExtMap[lang] || '.py';
      const fileName = `lily_${what.replace(/[^a-z0-9]/gi, '_').slice(0, 30)}${ext}`;
      const file = require('path').join(os.homedir(), 'Desktop', fileName);
      const generatedCode = this.generateSimpleCode(what, file, lang);
      return { tool: 'writeCode', args: { filePath: file, codeContent: generatedCode }, text: `Writing ${lang || 'Python'} code for "${what}"…` };
    }

    // ── Open in VS Code ──────────────────────────────────────
    const vscMatch = m.match(/open\s+(.+?)\s+in\s+(?:vs\s*code|vscode)/i);
    if (vscMatch) {
      return { tool: 'openInVSCode', args: { filePath: vscMatch[1].replace(/["']/g, '') }, text: `Opening in VS Code…` };
    }

    // ── Run Command ───────────────────────────────────────────
    const runMatch = m.match(/^(?:run|execute)\s+(?:command\s+)?["']?(.+?)["']?$/i);
    if (runMatch) {
      return { tool: 'runCommand', args: { command: runMatch[1] }, text: `Running command…` };
    }

    // ── Clipboard ─────────────────────────────────────────────
    if (/(?:read|show|what.s\s+(?:in|on))\s*(?:the\s+)?clipboard|paste/i.test(m)) {
      return { tool: 'readFromClipboard', args: {}, text: `Reading clipboard…` };
    }
    const copyMatch = m.match(/copy\s+["'](.+?)["']\s*(?:to\s+clipboard)?/i);
    if (copyMatch) {
      return { tool: 'copyToClipboard', args: { text: copyMatch[1] }, text: `Copying to clipboard…` };
    }

    // ── Date / Time ───────────────────────────────────────────
    if (/what\s*(is\s+)?(?:the\s+)?(?:time|date|day)|current\s+(?:time|date)/i.test(m)) {
      const now = new Date();
      return {
        text: `📅 **${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}**\n🕐 **${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}**`
      };
    }

    // ── Screen Reading / Vision ───────────────────────────────
    const screenReadMatch = m.match(/(?:what(?:'s| is)\s+(?:on\s+)?(?:my\s+)?screen|look\s+at\s+(?:my\s+)?screen|read\s+(?:my\s+)?screen|see\s+(?:my\s+)?screen|what\s+(?:am\s+)?i\s+(?:looking|seeing|reading)\s+at|analyze\s+(?:my\s+)?screen|describe\s+(?:my\s+)?screen|what\s+is\s+(?:this|that)\s+on\s+(?:my\s+)?screen)(.*)/i);
    if (screenReadMatch) {
      const q = (screenReadMatch[1] || '').trim();
      return { tool: 'analyzeScreen', args: { question: q }, text: '👁️ Looking at your screen…' };
    }
    // Simpler: "see this", "what is this", "read this"
    if (/^(?:see|read|look at|analyze|describe)\s+(?:this|that|it|the\s+screen|my\s+screen)[\s!.?]*$/i.test(m)) {
      return { tool: 'analyzeScreen', args: { question: '' }, text: '👁️ Looking at your screen…' };
    }

    // ── Knowledge Questions (uses internet) ───────────────────
    // "tell me about X", "what is X", "who is X", "explain X", "define X"
    const knowledgeMatch = m.match(/^(?:tell\s+me\s+about|what\s+(?:is|are)\s+(?:the\s+)?|who\s+(?:is|was|are)\s+|explain\s+|describe\s+|define\s+|meaning\s+of\s+|info\s+(?:about|on)\s+|information\s+(?:about|on)\s+|details\s+(?:about|on)\s+|give\s+me\s+(?:info|information|details)\s+(?:about|on)\s+)\s*(.+?)[\s?.!]*$/i);
    if (knowledgeMatch) {
      const topic = knowledgeMatch[1].trim();
      return { tool: 'answerQuestion', args: { query: topic }, text: `🔍 Looking up "${topic}"…` };
    }
    // "how does X work", "how to X", "why is X"
    const howMatch = m.match(/^(?:how\s+(?:does|do|to|is|are|can|did)|why\s+(?:is|are|do|does|did|was|were))\s+(.+?)[\s?.!]*$/i);
    if (howMatch) {
      const topic = howMatch[1].trim();
      return { tool: 'answerQuestion', args: { query: m }, text: `🔍 Looking up "${topic}"…` };
    }
    // "capital of X", "population of X", factual questions
    const factMatch = m.match(/^(?:what(?:'s| is)\s+the\s+)?(?:capital|population|area|president|pm|prime\s*minister|language|currency)\s+of\s+(.+?)[\s?.!]*$/i);
    if (factMatch) {
      return { tool: 'answerQuestion', args: { query: m }, text: `🔍 Looking that up…` };
    }

    // ── No match ──────────────────────────────────────────────
    return null;
  }

  // ═══════════════════════════════════════════════════════════════
  // Simple Code Generation (offline)
  // ═══════════════════════════════════════════════════════════════

  generateSimpleCode(description, filePath, lang) {
    const ext = require('path').extname(filePath).toLowerCase();
    const desc = description.toLowerCase();

    // ── Java ──────────────────────────────────────────────────
    if (ext === '.java' || lang === 'java') {
      const className = 'LilyProgram';
      if (desc.includes('multiplication table') || desc.includes('multiply')) {
        return `// Multiplication Table - Generated by Lily 🌸\nimport java.util.Scanner;\n\npublic class ${className} {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter a number: ");\n        int num = sc.nextInt();\n        System.out.println("\\nMultiplication Table for " + num + ":");\n        for (int i = 1; i <= 10; i++) {\n            System.out.println(num + " x " + i + " = " + (num * i));\n        }\n        sc.close();\n    }\n}\n`;
      }
      if (desc.includes('factorial')) {
        return `// Factorial - Generated by Lily 🌸\nimport java.util.Scanner;\n\npublic class ${className} {\n    public static long factorial(int n) {\n        if (n <= 1) return 1;\n        return n * factorial(n - 1);\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter a number: ");\n        int num = sc.nextInt();\n        System.out.println("Factorial of " + num + " = " + factorial(num));\n        sc.close();\n    }\n}\n`;
      }
      if (desc.includes('fibonacci')) {
        return `// Fibonacci - Generated by Lily 🌸\nimport java.util.Scanner;\n\npublic class ${className} {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("How many terms? ");\n        int n = sc.nextInt();\n        int a = 0, b = 1;\n        System.out.print("Fibonacci: ");\n        for (int i = 0; i < n; i++) {\n            System.out.print(a + " ");\n            int temp = a + b;\n            a = b;\n            b = temp;\n        }\n        sc.close();\n    }\n}\n`;
      }
      if (desc.includes('hello')) {
        return `// Hello World - Generated by Lily 🌸\npublic class ${className} {\n    public static void main(String[] args) {\n        System.out.println("Hello, World! 🌸");\n    }\n}\n`;
      }
      if (desc.includes('sort') || desc.includes('bubble')) {
        return `// Bubble Sort - Generated by Lily 🌸\nimport java.util.Arrays;\n\npublic class ${className} {\n    public static void bubbleSort(int[] arr) {\n        int n = arr.length;\n        for (int i = 0; i < n - 1; i++) {\n            for (int j = 0; j < n - i - 1; j++) {\n                if (arr[j] > arr[j + 1]) {\n                    int temp = arr[j];\n                    arr[j] = arr[j + 1];\n                    arr[j + 1] = temp;\n                }\n            }\n        }\n    }\n\n    public static void main(String[] args) {\n        int[] arr = {64, 34, 25, 12, 22, 11, 90};\n        System.out.println("Before: " + Arrays.toString(arr));\n        bubbleSort(arr);\n        System.out.println("After:  " + Arrays.toString(arr));\n    }\n}\n`;
      }
      if (desc.includes('calculator') || desc.includes('calc')) {
        return `// Calculator - Generated by Lily 🌸\nimport java.util.Scanner;\n\npublic class ${className} {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter first number: ");\n        double a = sc.nextDouble();\n        System.out.print("Enter operator (+, -, *, /): ");\n        char op = sc.next().charAt(0);\n        System.out.print("Enter second number: ");\n        double b = sc.nextDouble();\n        double result = 0;\n        switch (op) {\n            case '+': result = a + b; break;\n            case '-': result = a - b; break;\n            case '*': result = a * b; break;\n            case '/': result = b != 0 ? a / b : 0; break;\n            default: System.out.println("Invalid operator"); return;\n        }\n        System.out.println("Result: " + a + " " + op + " " + b + " = " + result);\n        sc.close();\n    }\n}\n`;
      }
      if (desc.includes('prime')) {
        return `// Prime Number Check - Generated by Lily 🌸\nimport java.util.Scanner;\n\npublic class ${className} {\n    public static boolean isPrime(int n) {\n        if (n < 2) return false;\n        for (int i = 2; i <= Math.sqrt(n); i++) {\n            if (n % i == 0) return false;\n        }\n        return true;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter a number: ");\n        int num = sc.nextInt();\n        System.out.println(num + (isPrime(num) ? " is PRIME" : " is NOT prime"));\n        sc.close();\n    }\n}\n`;
      }
      if (desc.includes('palindrome')) {
        return `// Palindrome Check - Generated by Lily 🌸\nimport java.util.Scanner;\n\npublic class ${className} {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.print("Enter a string: ");\n        String str = sc.nextLine().toLowerCase().replaceAll("[^a-z0-9]", "");\n        String rev = new StringBuilder(str).reverse().toString();\n        System.out.println(str.equals(rev) ? "It IS a palindrome! ✅" : "It is NOT a palindrome ❌");\n        sc.close();\n    }\n}\n`;
      }
      return `// ${description} - Generated by Lily 🌸\npublic class ${className} {\n    public static void main(String[] args) {\n        // TODO: Implement ${description}\n        System.out.println("Generated by Lily 🌸");\n    }\n}\n`;
    }

    // ── Python ────────────────────────────────────────────────
    if (ext === '.py' || lang === 'python' || lang === 'py' || (!lang && ext !== '.js' && ext !== '.html' && ext !== '.c' && ext !== '.cpp')) {
      if (desc.includes('multiplication table') || desc.includes('multiply')) {
        return `# Multiplication Table - Generated by Lily 🌸\n\nnum = int(input("Enter a number: "))\nprint(f"\\nMultiplication Table for {num}:")\nfor i in range(1, 11):\n    print(f"{num} x {i} = {num * i}")\n`;
      }
      if (desc.includes('factorial')) {
        return `# Factorial - Generated by Lily 🌸\n\ndef factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nif __name__ == "__main__":\n    num = int(input("Enter a number: "))\n    print(f"Factorial of {num} is {factorial(num)}")\n`;
      }
      if (desc.includes('fibonacci')) {
        return `# Fibonacci - Generated by Lily 🌸\n\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=' ')\n        a, b = b, a + b\n    print()\n\nif __name__ == "__main__":\n    num = int(input("How many terms? "))\n    fibonacci(num)\n`;
      }
      if (desc.includes('hello')) {
        return `# Hello World - Generated by Lily 🌸\nprint("Hello, World! 🌸")\n`;
      }
      if (desc.includes('sort')) {
        return `# Bubble Sort - Generated by Lily 🌸\n\ndef bubble_sort(arr):\n    n = len(arr)\n    for i in range(n - 1):\n        for j in range(n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr\n\nif __name__ == "__main__":\n    data = [64, 34, 25, 12, 22, 11, 90]\n    print("Before:", data)\n    print("After: ", bubble_sort(data))\n`;
      }
      if (desc.includes('prime')) {
        return `# Prime Number Check - Generated by Lily 🌸\n\ndef is_prime(n):\n    if n < 2:\n        return False\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            return False\n    return True\n\nnum = int(input("Enter a number: "))\nprint(f"{num} is {'PRIME ✅' if is_prime(num) else 'NOT prime ❌'}")\n`;
      }
      if (desc.includes('calculator') || desc.includes('calc')) {
        return `# Calculator - Generated by Lily 🌸\n\na = float(input("Enter first number: "))\nop = input("Enter operator (+, -, *, /): ")\nb = float(input("Enter second number: "))\n\nif op == '+': print(f"{a} + {b} = {a + b}")\nelif op == '-': print(f"{a} - {b} = {a - b}")\nelif op == '*': print(f"{a} * {b} = {a * b}")\nelif op == '/': print(f"{a} / {b} = {a / b}" if b != 0 else "Cannot divide by zero!")\nelse: print("Invalid operator")\n`;
      }
      return `# ${description} - Generated by Lily 🌸\n# TODO: Implement ${description}\nprint("Generated by Lily")\n`;
    }

    // ── JavaScript ────────────────────────────────────────────
    if (ext === '.js' || lang === 'javascript' || lang === 'js') {
      if (desc.includes('multiplication table') || desc.includes('multiply')) {
        return `// Multiplication Table - Generated by Lily 🌸\nconst num = parseInt(process.argv[2] || '5');\nconsole.log(\`Multiplication Table for \${num}:\`);\nfor (let i = 1; i <= 10; i++) {\n  console.log(\`\${num} x \${i} = \${num * i}\`);\n}\n`;
      }
      if (desc.includes('factorial')) {
        return `// Factorial - Generated by Lily 🌸\n\nfunction factorial(n) {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}\n\nconst num = parseInt(process.argv[2] || '5');\nconsole.log(\`Factorial of \${num} is \${factorial(num)}\`);\n`;
      }
      if (desc.includes('hello')) {
        return `// Hello World - Generated by Lily 🌸\nconsole.log("Hello, World! 🌸");\n`;
      }
      return `// ${description} - Generated by Lily 🌸\n// TODO: Implement ${description}\nconsole.log("Generated by Lily");\n`;
    }

    // ── C / C++ ───────────────────────────────────────────────
    if (ext === '.c' || ext === '.cpp' || lang === 'c' || lang === 'cpp' || lang === 'c++') {
      const isC = ext === '.c' || lang === 'c';
      if (desc.includes('hello')) {
        return isC
          ? `/* Hello World - Generated by Lily 🌸 */\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`
          : `// Hello World - Generated by Lily 🌸\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`;
      }
      return isC
        ? `/* ${description} - Generated by Lily 🌸 */\n#include <stdio.h>\n\nint main() {\n    /* TODO: Implement ${description} */\n    printf("Generated by Lily\\n");\n    return 0;\n}\n`
        : `// ${description} - Generated by Lily 🌸\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // TODO: Implement ${description}\n    cout << "Generated by Lily" << endl;\n    return 0;\n}\n`;
    }

    // ── HTML ──────────────────────────────────────────────────
    if (ext === '.html') {
      return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${description}</title>\n</head>\n<body>\n  <h1>${description}</h1>\n  <p>Generated by Lily 🌸</p>\n</body>\n</html>\n`;
    }

    // Default
    return `// ${description}\n// Generated by Lily 🌸\n// TODO: Implement this\n`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Ollama Integration
  // ═══════════════════════════════════════════════════════════════

  async processWithOllama(message) {
    const toolDescs = tools.getToolDescriptions();
    const systemPrompt = buildSystemPrompt(toolDescs, os.userInfo().username);

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: message });

    // Keep last 20 messages for context
    const recentHistory = this.conversationHistory.slice(-20);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
    ];

    try {
      const rawResponse = await ollama.chat(this.model, messages);

      // Try to parse as JSON (tool call)
      let parsed;
      try {
        // Extract JSON from response (it might have markdown wrapping)
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (_) {}

      let responseText;
      let toolUsed = null;

      if (parsed && parsed.tool) {
        // Execute the tool
        try {
          const result = await tools.execute(parsed.tool, parsed.args || {});
          toolUsed = parsed.tool;
          responseText = result.message || parsed.text || 'Done!';
        } catch (err) {
          responseText = parsed.text || `Tool error: ${err.message}`;
        }
      } else if (parsed && parsed.text) {
        responseText = parsed.text;
      } else {
        responseText = rawResponse;
      }

      // Save to history
      this.conversationHistory.push({ role: 'assistant', content: responseText });

      return { text: responseText, toolUsed };
    } catch (err) {
      return { text: `Ollama error: ${err.message}. Falling back to offline mode.`, error: true };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Gemini Integration
  // ═══════════════════════════════════════════════════════════════

  async processWithGemini(message) {
    const toolDescs = tools.getToolDescriptions();
    const systemPrompt = buildSystemPrompt(toolDescs, os.userInfo().username);

    // Add to conversation history
    this.conversationHistory.push({ role: 'user', content: message });

    // Keep last 20 messages
    const recentHistory = this.conversationHistory.slice(-20);

    try {
      const rawResponse = await gemini.chat(this.geminiKey, this.geminiModel, systemPrompt, recentHistory);

      // Try to parse as JSON (tool call)
      let parsed;
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (_) {}

      let responseText;
      let toolUsed = null;

      if (parsed && parsed.tool) {
        try {
          const result = await tools.execute(parsed.tool, parsed.args || {});
          toolUsed = parsed.tool;
          responseText = result.message || parsed.text || 'Done!';
        } catch (err) {
          responseText = parsed.text || `Tool error: ${err.message}`;
        }
      } else if (parsed && parsed.text) {
        responseText = parsed.text;
      } else {
        responseText = rawResponse;
      }

      // Save to history
      this.conversationHistory.push({ role: 'assistant', content: responseText });

      return { text: responseText, toolUsed };
    } catch (err) {
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Fallback — try knowledge search before giving up
  // ═══════════════════════════════════════════════════════════════

  async fallbackResponse(message) {
    // If connected to internet, try answering as a knowledge question
    try {
      const result = await tools.execute('answerQuestion', { query: message });
      if (result.success && result.message && !result.noResult) {
        return result.message;
      }
    } catch (_) {}

    return `I'm not sure how to help with that. 🤔\n\n` +
      `**Try these commands:**\n` +
      `• "Open Chrome" / "Close Notepad"\n` +
      `• "Tell me about Maharashtra"\n` +
      `• "What is quantum computing?"\n` +
      `• "What's on my screen?"\n` +
      `• "Take a screenshot"\n` +
      `• "Volume 50" / "Mute"\n` +
      `• "Create file test.txt"\n` +
      `• "Play Shape of You on YouTube"\n` +
      `• "What time is it?"\n\n` +
      `💡 For smarter responses, enable **Google Gemini** or **Ollama** in Settings.`;
  }
}

module.exports = Brain;
