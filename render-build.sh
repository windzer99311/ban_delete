#!/usr/bin/env bash
set -e

echo "📦 Installing packages..."
npm install

echo "🌐 Installing Chromium..."
npx puppeteer browsers install chrome
