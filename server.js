// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
const express = require('express')
const puppeteer = require("puppeteer-extra");
const StealthPlugin= require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
puppeteer.launch({
headless: true
}).then(async browser =>{
console.log('Running tests..')
const page= await browser.newPage()
await page.goto("https://aternos.org/:en/");
const html = await page.content();
 console.log(html);
await browser.close()
console.log('all done')

})
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


// Start GUI and bot
app.listen(PORT, () => {
  console.log(`🌐 GUI running: http://localhost:${PORT}`);
 // start the bot after server
});
