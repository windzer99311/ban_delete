const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const express = require('express');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const COOKIE_FILE = 'cookies.json';
const LOG_FILE = 'log.txt';
const LOGIN_URL = 'https://aternos.org/players/banned-players';
const PLAYER_NAME = 'KARBAN2923-JmVS';
const LOOP_DELAY = 10000;

function log(message) {
  const timestamp = new Date().toISOString();
  const msg = `${timestamp} — ${message}`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

let latestHTML = 'Not loaded yet.';

async function runBot() {
  if (!fs.existsSync(COOKIE_FILE)) {
    log("❌ No cookies found. Please run save_session.js first.");
    return;
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1280,800',
      '--disable-gpu',
      '--disable-infobars'
    ]
  });

  const page = await browser.newPage();

  // Intercept requests to block unnecessary resources
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['stylesheet', 'font', 'image'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Set cookies
  const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
  await page.setCookie(...cookies);

  while (true) {
    try {
      log(`⏳ Navigating to page...`);
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

      log(`✅ Page loaded. Capturing HTML...`);
      latestHTML = await page.content();

      log(`⏳ Waiting ${LOOP_DELAY / 1000}s before next refresh...`);
      await delay(LOOP_DELAY);

    } catch (err) {
      log(`❌ Error: ${err.message}`);
      await delay(5000);
    }
  }
}

// --- GUI Server ---
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Log Viewer</title>
  <style>
    body { background: #1e1e2f; color: #eee; font-family: monospace; padding: 1rem; }
    h1 { color: #58a6ff; }
    pre { white-space: pre-wrap; word-wrap: break-word; background: #111; padding: 1rem; border-radius: 8px; max-height: 60vh; overflow-y: auto; }
    textarea { width: 100%; height: 400px; background: #000; color: #0f0; font-family: monospace; }
  </style>
</head>
<body>
  <h1>📝 Ban Deleter Logs</h1>
  <pre id="logs">Loading...</pre>

  <h2>📄 Page HTML Snapshot</h2>
  <textarea id="html">Loading...</textarea>

  <script>
    async function fetchLogs() {
      const res = await fetch('/logs');
      const text = await res.text();
      document.getElementById('logs').textContent = text;
    }
    async function fetchHTML() {
      const res = await fetch('/html');
      const text = await res.text();
      document.getElementById('html').value = text;
    }
    fetchLogs(); fetchHTML();
    setInterval(fetchLogs, 2000);
    setInterval(fetchHTML, 5000);
  </script>
</body>
</html>
  `);
});

app.get('/logs', (req, res) => {
  fs.readFile(LOG_FILE, 'utf-8', (err, data) => {
    if (err) return res.send('Error reading log.');
    res.send(data);
  });
});

app.get('/html', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(latestHTML);
});

app.listen(PORT, () => {
  console.log(`🌐 GUI running at http://localhost:${PORT}`);
  runBot();
});
