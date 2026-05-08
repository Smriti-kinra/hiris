#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start_all_new.sh — HIRIS Multi-Window Incognito Launcher (macOS)
# ─────────────────────────────────────────────────────────────────────────────

# Get the directory where this script lives (repo root)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
BACKEND_DIR="$ROOT_DIR/apps/backend"

echo "[1/3] Cleaning up old node processes..."
# Kill any ghost node processes that may be holding ports
pkill -f "node" 2>/dev/null || true
sleep 1

echo "[2/3] Starting HIRIS Services..."

# Start Backend in a new Terminal tab/window
osascript -e "
  tell application \"Terminal\"
    activate
    do script \"echo '=== HIRIS Backend ===' && cd '$BACKEND_DIR' && npm run dev\"
  end tell
"

# Start Frontend Vite server in a new Terminal tab/window
osascript -e "
  tell application \"Terminal\"
    activate
    do script \"echo '=== HIRIS Vite Server ===' && cd '$FRONTEND_DIR' && npx vite --port 5173 --strictPort\"
  end tell
"

echo "Waiting 6 seconds for Vite to stabilize..."
sleep 6

echo "[3/3] Launching Incognito Chrome Windows..."

# Open each portal in its own incognito Chrome window
# --new-window forces a brand new window (not a tab)
# --incognito ensures session isolation for each role
open -na "Google Chrome" --args --incognito --new-window "http://localhost:5173/"
sleep 0.5
open -na "Google Chrome" --args --incognito --new-window "http://localhost:5173/faculty"
sleep 0.5
open -na "Google Chrome" --args --incognito --new-window "http://localhost:5173/chro"
# Uncomment these when recruiter/candidate portals are ready:
# sleep 0.5
# open -na "Google Chrome" --args --incognito --new-window "http://localhost:5173/recruiter"
# sleep 0.5
# open -na "Google Chrome" --args --incognito --new-window "http://localhost:5173/candidate"

echo ""
echo "[OK] Isolated incognito windows launched."
echo "Note: All portals run on port 5173 via a single Vite server."
echo ""
