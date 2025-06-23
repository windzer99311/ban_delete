// server.js
const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

// Config
const COOKIE_FILE = 'cookies.json';
const LOG_FILE = 'log.txt';
const LOGIN_URL = 'https://aternos.org/players/banned-players';
const PLAYER_NAME = 'KARBAN2923-JmVS';
const LOOP_DELAY = 10000;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('.'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/logs', (req, res) => {
  if (fs.existsSync(LOG_FILE)) {
    res.send(fs.readFileSync(LOG_FILE, 'utf-8'));
  } else {
    res.send('No log yet.');
  }
});

function log(message) {
  const timestamp = new Date().toISOString();
  const msg = `${timestamp} — ${message}`;
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBot() {
  if (!fs.existsSync(COOKIE_FILE)) {
    log("❌ No cookies found. Please run save_session.js first.");
    return;
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();

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

runBot();

app.listen(PORT, () => {
  console.log(`🌐 GUI running: http://localhost:${PORT}`);
});
