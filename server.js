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

const proxyIP = '159.89.245.69:53971';
const proxyUsername = '';
const proxyPassword = '';

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
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-infobars',
      '--window-size=1200,800',
      `--proxy-server=${proxyIP}`
    ]
  });

  const pages = await browser.pages();
  if (pages.length > 0) await pages[0].close();

  const page = await browser.newPage();

  // ✅ Dynamic image blocking
  let allowImages = false;
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (!allowImages && ['image', 'stylesheet', 'font'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  if (proxyUsername && proxyPassword) {
    await page.authenticate({ username: proxyUsername, password: proxyPassword });
    log('🔐 Proxy authenticated.');
  }

  const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
  await page.setCookie(...cookies);

  page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' }); // fast, no await

  while (true) {
    try {
      log(`⏳ Checking '${PLAYER_NAME}'...`);
      const selector = `[title="${PLAYER_NAME}"]`;

      await page.waitForSelector(selector, { timeout: 10000, visible: true });
      await page.click(selector);
      log(`✅ Clicked server card for '${PLAYER_NAME}'.`);

      allowImages = true; // ✅ Enable images only after server card click

      while (true) {
        await delay(500);
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' }); // no await

        const buttons = await page.$$('button.js-remove');
        if (buttons.length === 0) {
          log("✅ No delete buttons found.");
        } else {
          log(`🔘 Found ${buttons.length} delete button(s)...`);
          for (const btn of buttons) {
            try {
              await btn.click();
              log("🗑️ Clicked one delete button.");
              await delay(300);
            } catch (e) {
              log(`⚠️ Skip a button: ${e.message}`);
            }
          }
        }

        log(`⏳ Waiting ${LOOP_DELAY / 1000}s before next check...`);
        await delay(LOOP_DELAY);
      }

    } catch (err) {
      log(`❌ Error: ${err.message}`);
      await delay(1000);
    }
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

app.listen(PORT, () => {
  console.log(`🌐 GUI running: http://localhost:${PORT}`);
  runBot();
});
