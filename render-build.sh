#!/usr/bin/env bash
set -e

# 1. Install dependencies
npm install

# 2. Install Chromium for Puppeteer
npx puppeteer browsers install chrome

# 3. Cache Chromium binary across builds
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p "$PUPPETEER_CACHE_DIR"
cp -R /opt/render/project/src/.cache/puppeteer/chrome/* "$PUPPETEER_CACHE_DIR" || true
