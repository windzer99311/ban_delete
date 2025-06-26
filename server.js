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
      '--window-size=1200,800',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const pages = await browser.pages();
  if (pages.length > 0) await pages[0].close();
  const page = await browser.newPage();

  // ⚙️ Super stealth hardening
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4] });
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (param) {
      if (param === 37445) return 'Intel Inc.';
      if (param === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.call(this, param);
    };
  });

  // 🚫 Block unnecessary resources
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

  const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
  await page.setCookie(...cookies);
  page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' }); // faster, no await

  while (true) {
    try {
      log(`⏳ Checking '${PLAYER_NAME}'...`);
      const selector = `[title="${PLAYER_NAME}"]`;

      await page.waitForSelector(selector, { timeout: 10000, visible: true });
      await page.click(selector);
      log(`✅ Clicked server card for '${PLAYER_NAME}'.`);

      allowImages = true; // now images/icons are allowed

      while (true) {
        await delay(500);
        await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

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
