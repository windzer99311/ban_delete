#!/bin/bash

# This script installs full Chrome to ensure headless browser is available on Render
set -e

echo "Installing Chrome..."
apt-get update
apt-get install -y wget unzip gnupg2

wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt-get install -y ./google-chrome-stable_current_amd64.deb
rm google-chrome-stable_current_amd64.deb

echo "Chrome installed."
