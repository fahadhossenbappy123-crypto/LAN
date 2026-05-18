#!/usr/bin/env bash
set -e

# Termux-ready cleanup script to remove all uploaded files and metadata
# Usage (interactive):
#   ./clear-uploads.sh
# Non-interactive (no prompt):
#   AUTO_YES=1 REPO_DIR="/path/to/repo" bash ./clear-uploads.sh

# Default repo path (change if your repo is elsewhere)
REPO_DIR="${REPO_DIR:-$HOME/LAN}"

cd "$REPO_DIR" || { echo "Repo not found: $REPO_DIR"; exit 1; }

# Best-effort stop Node server (adjust if you use pm2/systemd)
pkill -f "node server.js" 2>/dev/null || pkill node 2>/dev/null || true

# Preview what will be removed
echo "--- uploads preview ---"
ls -la uploads || true

# Confirm
AUTO_YES=${AUTO_YES:-}
if [ -z "$AUTO_YES" ]; then
  read -p "Delete all files in uploads and metadata? (y/N) " yn
  if [ "$yn" != "y" ]; then echo "Aborted."; exit 0; fi
fi

# Delete contents (keep the uploads directory)
find uploads -mindepth 1 -exec rm -rf {} + || true
rm -f uploads/metadata.json || true
mkdir -p uploads

echo "Uploads cleared."
