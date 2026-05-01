const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const COOKIE_FILE = 'cookies.json';
const SERVER_NAME = 'meracraft-ox3w';

// Helper function to replace the missing waitForTimeout
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runBot() {
  const browser = await puppeteer.launch({
    headless: "shell", // Stable headless mode
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    if (!fs.existsSync(COOKIE_FILE)) return console.log("❌ cookies.json missing!");

    const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
    await page.setCookie(...cookies);

    console.log("⏳ Loading server list...");
    await page.goto('https://aternos.org/servers/', { waitUntil: 'networkidle2' });

    console.log(`🔍 Looking for ${SERVER_NAME}...`);
    const serverClicked = await page.evaluate((name) => {
      const cards = Array.from(document.querySelectorAll('.server-name'));
      const target = cards.find(c => c.textContent.trim().toLowerCase().includes(name.toLowerCase()));
      if (target) {
        target.closest('.server-body').click();
        return true;
      }
      return false;
    }, SERVER_NAME);

    if (!serverClicked) return console.log("❌ Server card not found.");

    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Handle Adblock Screen if it exists
    try {
        const adblockBtn = await page.$('.btn.btn-main.btn-small');
        if (adblockBtn) {
            console.log("🛡️ Clearing Adblock screen...");
            await page.evaluate(() => document.querySelector('.btn.btn-main.btn-small')?.click());
            await delay(5000);
        }
    } catch (e) {}

    console.log("🔄 Entering Start Loop...");
    let attempts = 0;
    const maxAttempts = 30; // Increased attempts

    while (attempts < maxAttempts) {
        // Get the current status text from the dashboard
        const status = await page.evaluate(() => {
            const el = document.querySelector('.statuslabel-label-container');
            return el ? el.innerText : "";
        });

        // Check if we hit the "Loading..." state from {B8537DC8-A55C-44AA-9D27-823305CFD079}.png
        if (status.includes("Loading") || status.includes("Starting") || status.includes("Online")) {
            console.log(`✨ Success! Server status is now: ${status}`);
            break;
        }

        console.log(`🖱️ Attempt ${attempts + 1}: Status is "${status}". Clicking...`);

        // Use evaluate to click the Start or Confirm button directly in the browser's context
        await page.evaluate(() => {
            const startBtn = document.querySelector('#start');
            const confirmBtn = document.querySelector('.btn.btn-success');

            // If the green "Accept/Confirm" button is there, click it first
            if (confirmBtn && confirmBtn.offsetHeight > 0) {
                confirmBtn.click();
            } else if (startBtn) {
                startBtn.click();
            }
        });

        await delay(3000); // Wait 3 seconds before checking again
        attempts++;
    }

  } catch (err) {
    console.error(`❌ Bot Error: ${err.message}`);
  } finally {
    console.log("🎉 Bot finished task.");
    // browser.close();
  }
}

runBot();
