const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3000;
const LOG_FILE = path.join(__dirname, 'logs.txt');

// Proxy configuration
const proxyIP = '104.219.171.245:50100'; // Replace with your proxy
const proxyUsername = 'jEbmhvXJ'; // Optional: add username
const proxyPassword = 'NlHqLB1hCG'; // Optional: add password

// Function to log text to file
function log(text) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${text}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
  console.log(logEntry);
}

// Puppeteer task
async function runBot() {
  log('Launching browser with proxy...');

  const browser = await puppeteer.launch({
    headless: true,
    args: [`--proxy-server=${proxyIP}`],
  });

  const page = await browser.newPage();

  if (proxyUsername && proxyPassword) {
    await page.authenticate({
      username: proxyUsername,
      password: proxyPassword,
    });
    log('Proxy authentication applied');
  }

  try {
    await page.goto('https://aternos.org/:en/', { waitUntil: 'networkidle2' });
    log('🟢 Page loaded successfully.');

    const html = await page.content();
    fs.writeFileSync('page.html', html); // Optional: Save HTML
    log('✅ HTML saved to page.html');
  } catch (err) {
    log(`❌ Failed to load page: ${err.message}`);
  }

  await browser.close();
  log('🛑 Browser closed.');
}

// Start GUI server
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
      <h1>📝 Puppeteer Logs</h1>
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
  if (fs.existsSync(LOG_FILE)) {
    res.send(fs.readFileSync(LOG_FILE, 'utf8'));
  } else {
    res.send('No logs yet.');
  }
});

app.listen(PORT, () => {
  console.log(`🌐 GUI running: http://localhost:${PORT}`);
  runBot(); // Start bot after server
});
