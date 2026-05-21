#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start_all.sh — HIRIS Multi-Portal Dev Launcher (macOS / Linux)
#
# Startup sequence:
#   1. Kill stale HIRIS processes on all preferred ports
#   2. Run scripts/find-ports.js  → find free ports, write .resolved-ports.json
#   3. Run scripts/inject-env.js  → regenerate all .env files + .allowed-origins.txt
#   4. Launch backend + all portals via concurrently
#   5. Print resolved URL table
#
# Usage:
#   bash start_all.sh
# ─────────────────────────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$ROOT_DIR/scripts"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
BACKEND_DIR="$ROOT_DIR/apps/backend"
PORTALS_CFG="$SCRIPTS_DIR/portals.config.js"
RESOLVED_JSON="$SCRIPTS_DIR/.resolved-ports.json"
ORIGINS_FILE="$SCRIPTS_DIR/.allowed-origins.txt"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'; CYAN='\033[0;36m'
WHITE='\033[1;37m'; NC='\033[0m'

banner() {
  echo ""
  echo -e "${WHITE}╔══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${WHITE}║          HIRIS — Multi-Portal Dev Launcher               ║${NC}"
  echo -e "${WHITE}╚══════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

# ── 0. Validate Node.js is available ─────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo -e "${RED}[ERROR]${NC} Node.js is not installed or not in PATH. Install Node.js first."
  exit 1
fi

banner

# ── 1. Kill stale processes on HIRIS ports ────────────────────────────────────
echo -e "${CYAN}[STEP 1/4]${NC} Clearing stale HIRIS port processes..."
node "$SCRIPTS_DIR/find-ports.js" --kill
echo ""

# ── 2. Inject env files ───────────────────────────────────────────────────────
echo -e "${CYAN}[STEP 2/4]${NC} Injecting environment variables into portal .env files..."
node "$SCRIPTS_DIR/inject-env.js"
echo ""

# ── 3. Read resolved ports for display & CORS ────────────────────────────────
BACKEND_PORT=$(node -e "const r=require('$RESOLVED_JSON');console.log(r.backend)")
LANDING_PORT=$(node -e "const r=require('$RESOLVED_JSON');console.log(r.landing)")
FACULTY_PORT=$(node -e "const r=require('$RESOLVED_JSON');console.log(r.faculty)")
HIRING_PORT=$(node -e  "const r=require('$RESOLVED_JSON');console.log(r.hiring)")
CHRO_PORT=$(node -e    "const r=require('$RESOLVED_JSON');console.log(r.chro)")
RECRUITER_PORT=$(node -e "const r=require('$RESOLVED_JSON');console.log(r.recruiter)")
CANDIDATE_PORT=$(node -e "const r=require('$RESOLVED_JSON');console.log(r.candidate)")

# Read allowed origins for backend
ALLOWED_ORIGINS=""
if [ -f "$ORIGINS_FILE" ]; then
  ALLOWED_ORIGINS=$(cat "$ORIGINS_FILE")
fi

# ── 4. Launch all services ────────────────────────────────────────────────────
echo -e "${CYAN}[STEP 3/4]${NC} Starting all services...\n"

echo -e "  ${BLUE}Backend API${NC}      →  http://localhost:${BACKEND_PORT}"
echo -e "  ${CYAN}Landing Page${NC}     →  http://localhost:${LANDING_PORT}"
echo -e "  ${GREEN}Faculty Portal${NC}   →  http://localhost:${FACULTY_PORT}"
echo -e "  ${YELLOW}Hiring Mgr${NC}       →  http://localhost:${HIRING_PORT}"
echo -e "  ${MAGENTA}CHRO / Admin${NC}     →  http://localhost:${CHRO_PORT}"
echo -e "  ${WHITE}Recruiter${NC}        →  http://localhost:${RECRUITER_PORT}"
echo -e "  ${RED}Candidate${NC}        →  http://localhost:${CANDIDATE_PORT}"
echo ""
# Export ALLOWED_ORIGINS so backend picks it up
export ALLOWED_ORIGINS

cd "$FRONTEND_DIR"
npx concurrently \
  --names "backend,landing,faculty,hiring,chro,recruiter,candidate" \
  --prefix-colors "bgBlue.bold,bgCyan.bold,bgGreen.bold,bgYellow.bold,bgMagenta.bold,bgWhite.bold,bgRed.bold" \
  --kill-others-on-fail \
  --prefix "[{name}]" \
  "ALLOWED_ORIGINS='${ALLOWED_ORIGINS}' cd '$BACKEND_DIR' && npm run dev" \
  "npx vite --port ${LANDING_PORT}" \
  "npx vite --config vite.config.faculty.js   --mode faculty" \
  "npx vite --config vite.config.hiring.js    --mode hiring" \
  "npx vite --config vite.config.chro.js      --mode chro" \
  "npx vite --config vite.config.recruiter.js --mode recruiter" \
  "npx vite --config vite.config.candidate.js --mode candidate" &
CONC_PID=$!

echo -e "\n${YELLOW}[LAUNCH] Waiting 6 seconds for Vite dev servers to stabilize...${NC}"
sleep 6

echo -e "\n${GREEN}[LAUNCH] Launching Incognito Chrome Windows...${NC}"
# Open each portal in its own isolated incognito Chrome window
# --new-window forces a brand new window (not a tab)
# --incognito ensures session isolation for each role
open -na "Google Chrome" --args --incognito --new-window "http://localhost:${LANDING_PORT}/"
sleep 0.5
open -na "Google Chrome" --args --incognito --new-window "http://localhost:${FACULTY_PORT}/"
sleep 0.5
open -na "Google Chrome" --args --incognito --new-window "http://localhost:${CHRO_PORT}/"
# Uncomment these when recruiter/candidate/hiring portals are needed:
# sleep 0.5
# open -na "Google Chrome" --args --incognito --new-window "http://localhost:${HIRING_PORT}/"
# sleep 0.5
# open -na "Google Chrome" --args --incognito --new-window "http://localhost:${RECRUITER_PORT}/"
# sleep 0.5
# open -na "Google Chrome" --args --incognito --new-window "http://localhost:${CANDIDATE_PORT}/"

echo -e "\n${GREEN}[OK] Isolated Chrome incognito windows launched successfully.${NC}\n"

# Wait for the background concurrently process so Ctrl+C propagates beautifully
wait $CONC_PID
