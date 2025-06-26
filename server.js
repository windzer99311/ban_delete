const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const express = require('express');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const COOKIE_FILE = 'cookies.json';
const LOG_FILE = 'log.txt';
const LOGIN_URL = 'https://aternos.org/players/banned-players';
const LOOP_DELAY = 10000;

let latestHTML = 'Loading...';

function log(message) {
  const timestamp = new Date().toISOString();
  const msg = `${timestamp} — ${message}`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBot() {
  if (!fs.existsSync(COOKIE_FILE)) {
    log("❌ No cookies found. Please run save_session.js first.");
    return;
  }

  const browser = await puppeteer.launch({
    headless: false, // ⚠️ Headed avoids headless detection
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1280,800',
      '--disable-infobars'
    ]
  });

  const page = await browser.newPage();

  // 🛡️ Set stealth headers + navigator evasion
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
    window.chrome = { runtime: {} };
  });

  // 🧠 Set user-agent and viewport
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });

  // 🧱 Optional: block heavy resources for performance
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['image', 'stylesheet', 'font'].includes(type)) req.abort();
    else req.continue();
  });

  // 🍪 Load cookies
  const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
  await page.setCookie(...cookies);

  // 🔁 Loop to refresh banned page HTML
  while (true) {
    try {
      log(`🌐 Loading banned players page...`);
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
      latestHTML = await page.content();
      log(`✅ HTML captured successfully.`);
    } catch (err) {
      log(`❌ Error: ${err.message}`);
    }

    await delay(LOOP_DELAY);
  }
}

// --- GUI server ---
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Aternos Live HTML</title>
  <style>
    body { background: #111; color: #eee; font-family: monospace; padding: 1rem; }
    iframe { width: 100%; height: 90vh; border: none; background: #fff; }
    h1 { color: #58a6ff; }
  </style>
</head>
<body>
  <h1>📄 Aternos Live HTML Viewer</h1>
  <iframe src="/html" id="viewer"></iframe>
  <script>
    setInterval(() => {
      document.getElementById("viewer").src = "/html?tick=" + Date.now();
    }, 10000);
  </script>
</body>
</html>
  `);
});

app.get('/html', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(latestHTML);
});

app.listen(PORT, () => {
  console.log(`🌐 GUI running at http://localhost:${PORT}`);
  runBot();
});
