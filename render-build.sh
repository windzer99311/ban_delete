#!/usr/bin/env bash

# Exit if any command fails
set -e

# Install Google Chrome manually
echo "Installing Google Chrome..."
apt-get update
apt-get install -y wget gnupg ca-certificates

wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google-chrome.list

apt-get update
apt-get install -y google-chrome-stable

# Ensure Chrome is available
google-chrome --version

# Install Node dependencies
echo "Installing Node modules..."
npm install
