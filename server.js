const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
puppeteerExtra.puppeteer = puppeteer; // 🔧 Force puppeteer-extra to use puppeteer

const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const express = require('express');
const fs = require('fs');
const path = require('path');

puppeteerExtra.use(StealthPlugin());

const COOKIE_FILE = 'cookies.json';
const LOG_FILE = 'log.txt';
const LOGIN_URL = 'https://aternos.org/players/banned-players';
const PLAYER_NAME = 'KARBAN2923-JmVS';
const LOOP_DELAY = 10000;

// Proxy settings
const PROXY = '192.168.1.13:808'; // Replace with your proxy IP:port
const PROXY_USERNAME = 'User-123';           // Optional
const PROXY_PASSWORD = '1234';           // Optional

// --- Log function
function log(message) {
  const timestamp = new Date().toISOString();
  const msg = `${timestamp} — ${message}`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

// --- Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Puppeteer bot
async function runBot() {
  if (!fs.existsSync(COOKIE_FILE)) {
    log("❌ No cookies found. Please run save_session.js first.");
    return;
  }

  const browser = await puppeteerExtra.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${PROXY}`
    ]
  });

  const page = await browser.newPage();

  if (PROXY_USERNAME && PROXY_PASSWORD) {
    await page.authenticate({
      username: PROXY_USERNAME,
      password: PROXY_PASSWORD
    });
  }

  const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
  await page.goto('https://aternos.org', { waitUntil: 'domcontentloaded' });
  for (const cookie of cookies) {
    try {
      await page.setCookie(cookie);
    } catch (e) {
      log(`⚠️ Failed to set cookie: ${e.message}`);
    }
  }

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });
  await delay(5000);

  try {
    log(`⏳ Waiting for server card '${PLAYER_NAME}'...`);
    const selector = `div.servercard.offline[title="${PLAYER_NAME}"]`;
    await page.waitForSelector(selector, { timeout: 15000 });
    await page.click(selector);
    log(`✅ Clicked server card for '${PLAYER_NAME}'.`);

    while (true) {
      await delay(1000);
      await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

      const buttons = await page.$$('div.js-remove-from-list');

      if (buttons.length === 0) {
        log("✅ No delete buttons found.");
      } else {
        log(`🔘 Found ${buttons.length} delete button(s)...`);
        for (const btn of buttons) {
          try {
            await btn.click();
            log("🗑️ Clicked one delete button.");
            await delay(1000);
          } catch (e) {
            log(`⚠️ Skip a button: ${e.message}`);
          }
        }
      }

      log(`⏳ Waiting ${LOOP_DELAY / 1000} seconds before next check...`);
      await delay(LOOP_DELAY);
    }

  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }

  await browser.close();
}

// --- GUI server
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
    pre { white-space: pre-wrap; word-wrap: break-word; background: #111; padding: 1rem; border-radius: 8px; max-height: 80vh; overflow-y: auto; }
  </style>
</head>
<body>
  <h1>📝 Ban Deleter Logs</h1>
  <pre id="logs">Loading...</pre>
  <script>
    async function fetchLogs() {
      const res = await fetch('/logs');
      const text = await res.text();
      document.getElementById('logs').textContent = text;
    }
    fetchLogs();
    setInterval(fetchLogs, 2000);
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

// Start GUI and bot
app.listen(PORT, () => {
  console.log(`🌐 GUI running: http://localhost:${PORT}`);
  runBot(); // start the bot after server
});

