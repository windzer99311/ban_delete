const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const COOKIE_FILE = 'cookies.json';
const LOGIN_URL = 'https://aternos.org/go/';

async function saveSession() {
  console.log("🚀 Starting browser for manual login...");
  
  const browser = await puppeteer.launch({
    headless: false, // Must be false so you can see the login screen
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(LOGIN_URL, { waitUntil: 'networkidle2' });

  console.log("--------------------------------------------------");
  console.log("👉 ACTION REQUIRED: Log in manually in the browser window.");
  console.log("👉 Solve any Captchas and wait until you see your server list.");
  console.log("--------------------------------------------------");

  // Wait for the URL to change to the servers list or dashboard
  try {
    await page.waitForFunction(() => 
      window.location.href.includes('/servers/') || 
      window.location.href.includes('/server/'), 
      { timeout: 300000 } // Gives you 5 minutes to log in
    );

    console.log("✅ Login detected! Saving cookies...");
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
    
    console.log(`📂 Cookies saved to ${COOKIE_FILE}`);
    console.log("👋 Closing browser. You can now run your main bot script.");
    
    await browser.close();
  } catch (err) {
    console.log("❌ Timeout: Login took too long or page was closed.");
    await browser.close();
  }
}

saveSession();
