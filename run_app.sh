#!/usr/bin/env bash
set -e
cd -- "$(dirname -- "$0")"
if [ ! -d node_modules ]; then
  npm install
fi
echo "Open http://localhost:5173/ in your browser."
npm run dev -- --port 5173 --strictPort
