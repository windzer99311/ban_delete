const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3000;

const LOG_FILE = path.join(__dirname, 'logs.txt');
const HTML_FILE = path.join(__dirname, 'page.html');

// Proxy config
const proxyIP = 'http://78.47.219.204:3128'; // Replace with your proxy
const proxyUsername = '';              // Optional
const proxyPassword = '';              // Optional

// Logging helper
function log(text) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${text}\n`;
  fs.appendFileSync(LOG_FILE, entry);
  console.log(entry);
}

// Bot
async function runBot() {
  log('🌐 Launching browser with proxy...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [`--proxy-server=${proxyIP}`],
  });

  const page = await browser.newPage();

  if (proxyUsername && proxyPassword) {
    await page.authenticate({ username: proxyUsername, password: proxyPassword });
    log('🔐 Proxy authenticated.');
  }

  try {
    await page.goto('https://aternos.org/:en/', { waitUntil: 'networkidle2' });
    log('✅ Page loaded.');

    const html = await page.content();
    console.log(`${html}`)
    fs.writeFileSync(HTML_FILE, html);
    log('📝 HTML saved to page.html');
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }

  await browser.close();
  log('🛑 Browser closed.');
}

// GUI
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Puppeteer Dashboard</title>
  <style>
    body { font-family: sans-serif; background: #1e1e2f; color: #eee; padding: 1rem; }
    h1 { color: #58a6ff; }
    nav { margin-bottom: 1rem; }
    button { margin-right: 1rem; padding: 0.5rem 1rem; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    pre { white-space: pre-wrap; word-wrap: break-word; background: #111; padding: 1rem; border-radius: 8px; max-height: 80vh; overflow-y: auto; }
  </style>
</head>
<body>
  <h1>🧭 Puppeteer Proxy Dashboard</h1>
  <nav>
    <button onclick="showLogs()">📝 Logs</button>
    <button onclick="showHTML()">🧾 HTML</button>
    <button onclick="location.reload()">🔁 Refresh</button>
  </nav>
  <pre id="output">Loading...</pre>

  <script>
    async function showLogs() {
      const res = await fetch('/logs');
      document.getElementById('output').textContent = await res.text();
    }

    async function showHTML() {
      const res = await fetch('/html');
      document.getElementById('output').textContent = await res.text();
    }

    // Load logs by default
    showLogs();
  </script>
</body>
</html>
  `);
});

// Endpoints
app.get('/logs', (req, res) => {
  if (fs.existsSync(LOG_FILE)) res.send(fs.readFileSync(LOG_FILE, 'utf8'));
  else res.send('No logs yet.');
});

app.get('/html', (req, res) => {
  if (fs.existsSync(HTML_FILE)) res.send(fs.readFileSync(HTML_FILE, 'utf8'));
  else res.send('No HTML captured yet.');
});

// Start
app.listen(PORT, () => {
  console.log(`🌐 GUI running at http://localhost:${PORT}`);
  runBot(); // Run bot after server starts
});
login="jEbmhvXJ"
password="NlHqLB1hCG"
port="50100"
ip="104.219.171.245"
