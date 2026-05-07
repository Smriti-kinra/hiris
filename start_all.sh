#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start_all.sh — HIRIS Multi-Portal Dev Launcher (macOS / Linux)
#
# Starts all HIRIS services simultaneously on their dedicated ports:
#   Backend API   → http://localhost:3001
#   Landing Page  → http://localhost:5173
#   Faculty       → http://localhost:5174
#   Hiring Mgr    → http://localhost:5175
#   CHRO          → http://localhost:5176
#   Recruiter     → http://localhost:5177
#   Candidate     → http://localhost:5178
#
# Usage:
#   bash start_all.sh            # starts all portals
#   bash start_all.sh --no-open  # skip auto opening browser tabs
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
BACKEND_DIR="$ROOT_DIR/apps/backend"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'; CYAN='\033[0;36m'
WHITE='\033[1;37m'; NC='\033[0m' # No Colour

NO_OPEN=false
for arg in "$@"; do
  [[ "$arg" == "--no-open" ]] && NO_OPEN=true
done

echo ""
echo -e "${WHITE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${WHITE}║          HIRIS — Multi-Portal Dev Launcher               ║${NC}"
echo -e "${WHITE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisite: check concurrently is installed ─────────────────────────────
if ! npm ls concurrently --prefix "$FRONTEND_DIR" > /dev/null 2>&1; then
  echo -e "${YELLOW}[SETUP]${NC} Installing concurrently in frontend..."
  npm install --save-dev concurrently --prefix "$FRONTEND_DIR" --silent
fi

# ── Port conflict check ───────────────────────────────────────────────────────
PORTS=(3001 5173 5174 5175 5176 5177 5178)
NAMES=("Backend" "Landing" "Faculty" "Hiring Mgr" "CHRO" "Recruiter" "Candidate")
CONFLICT=false

echo -e "${CYAN}[CHECK]${NC} Scanning for port conflicts..."
for i in "${!PORTS[@]}"; do
  PORT="${PORTS[$i]}"
  NAME="${NAMES[$i]}"
  if lsof -i ":$PORT" -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo -e "  ${RED}✗ Port $PORT ($NAME) is already in use.${NC}"
    CONFLICT=true
  else
    echo -e "  ${GREEN}✓ Port $PORT ($NAME) is free.${NC}"
  fi
done

if $CONFLICT; then
  echo ""
  echo -e "${RED}[ERROR]${NC} One or more ports are in use. Stop the conflicting processes and retry."
  echo -e "        Run: ${YELLOW}lsof -i :<port> -sTCP:LISTEN${NC}  to identify the process."
  exit 1
fi

echo ""
echo -e "${GREEN}[OK]${NC} All ports are available. Starting all services...\n"

# ── Backend ───────────────────────────────────────────────────────────────────
echo -e "${BLUE}[BACKEND]${NC}   http://localhost:3001"
echo -e "${CYAN}[LANDING]${NC}   http://localhost:5173"
echo -e "${GREEN}[FACULTY]${NC}   http://localhost:5174"
echo -e "${YELLOW}[HIRING MGR]${NC} http://localhost:5175"
echo -e "${MAGENTA}[CHRO]${NC}      http://localhost:5176"
echo -e "${WHITE}[RECRUITER]${NC} http://localhost:5177"
echo -e "${RED}[CANDIDATE]${NC} http://localhost:5178"
echo ""

# ── Launch via concurrently ───────────────────────────────────────────────────
cd "$ROOT_DIR"
npx --prefix "$FRONTEND_DIR" concurrently \
  --names        "backend,landing,faculty,hiring,chro,recruiter,candidate" \
  --prefix-colors "bgBlue.bold,bgCyan.bold,bgGreen.bold,bgYellow.bold,bgMagenta.bold,bgWhite.bold,bgRed.bold" \
  --kill-others-on-fail \
  --prefix "[{name}]" \
  "cd '$BACKEND_DIR' && npm run dev" \
  "cd '$FRONTEND_DIR' && npx vite --port 5173" \
  "cd '$FRONTEND_DIR' && npx vite --config vite.config.faculty.js    --mode faculty" \
  "cd '$FRONTEND_DIR' && npx vite --config vite.config.hiring.js     --mode hiring" \
  "cd '$FRONTEND_DIR' && npx vite --config vite.config.chro.js       --mode chro" \
  "cd '$FRONTEND_DIR' && npx vite --config vite.config.recruiter.js  --mode recruiter" \
  "cd '$FRONTEND_DIR' && npx vite --config vite.config.candidate.js  --mode candidate"
