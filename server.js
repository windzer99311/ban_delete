const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const express = require('express');
const fs = require('fs');

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
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1200,800'
    ]
  });

  const pages = await browser.pages();
  if (pages.length > 0) await pages[0].close();
  const page = await browser.newPage();

  // Block images, fonts, stylesheets
  await page.setRequestInterception(true);
  page.on('request', req => {
    const type = req.resourceType();
    if (['image', 'stylesheet', 'font'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
  await page.setCookie(...cookies);

  while (true) {
    try {
      log(`⏳ Loading banned players page...`);
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
      latestHTML = await page.content();
      log(`✅ Captured HTML from banned-players page.`);
    } catch (err) {
      log(`❌ Error: ${err.message}`);
    }
    await delay(LOOP_DELAY);
  }
}

// --- GUI ---
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
      const iframe = document.getElementById("viewer");
      iframe.src = "/html?reload=" + Date.now();
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
  console.log(`🌐 GUI running: http://localhost:${PORT}`);
  runBot();
});
