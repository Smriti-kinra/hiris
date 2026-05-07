#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start_all.sh — HIRIS Multi-Portal Dev Launcher (macOS / Linux)
#
#   Backend API   → http://localhost:3001
#   Landing Page  → http://localhost:5173
#   Faculty       → http://localhost:5174
#   Hiring Mgr    → http://localhost:5175
#   CHRO          → http://localhost:5176
#   Recruiter     → http://localhost:5177
#   Candidate     → http://localhost:5178
#
# Usage:  bash start_all.sh
# ─────────────────────────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/apps/frontend"
BACKEND_DIR="$ROOT_DIR/apps/backend"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'; CYAN='\033[0;36m'
WHITE='\033[1;37m'; NC='\033[0m'

echo ""
echo -e "${WHITE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${WHITE}║          HIRIS — Multi-Portal Dev Launcher               ║${NC}"
echo -e "${WHITE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Kill any stale processes on HIRIS ports ───────────────────────────────────
PORTS=(3001 5173 5174 5175 5176 5177 5178)
NAMES=("Backend" "Landing" "Faculty" "Hiring Mgr" "CHRO" "Recruiter" "Candidate")

echo -e "${CYAN}[CHECK]${NC} Clearing HIRIS ports..."
for i in "${!PORTS[@]}"; do
  PORT="${PORTS[$i]}"
  NAME="${NAMES[$i]}"
  PIDS=$(lsof -i ":$PORT" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo -e "  ${YELLOW}⚠  Port $PORT ($NAME) — killing PID(s) $PIDS${NC}"
    kill $PIDS 2>/dev/null || true
    sleep 0.4
  else
    echo -e "  ${GREEN}✓  Port $PORT ($NAME) free${NC}"
  fi
done
echo ""

# ── Print service map ─────────────────────────────────────────────────────────
echo -e "${WHITE}Starting all services:${NC}"
echo -e "  ${BLUE}Backend API${NC}   → http://localhost:3001"
echo -e "  ${CYAN}Landing Page${NC}  → http://localhost:5173"
echo -e "  ${GREEN}Faculty${NC}       → http://localhost:5174"
echo -e "  ${YELLOW}Hiring Mgr${NC}    → http://localhost:5175"
echo -e "  ${MAGENTA}CHRO${NC}          → http://localhost:5176"
echo -e "  ${WHITE}Recruiter${NC}     → http://localhost:5177"
echo -e "  ${RED}Candidate${NC}     → http://localhost:5178"
echo ""

# ── Launch everything via concurrently (from frontend dir so node_modules is found) ──
cd "$FRONTEND_DIR"
npx concurrently \
  --names "backend,landing,faculty,hiring,chro,recruiter,candidate" \
  --prefix-colors "bgBlue.bold,bgCyan.bold,bgGreen.bold,bgYellow.bold,bgMagenta.bold,bgWhite.bold,bgRed.bold" \
  --kill-others-on-fail \
  --prefix "[{name}]" \
  "cd '$BACKEND_DIR' && npm run dev" \
  "npx vite --port 5173" \
  "npx vite --config vite.config.faculty.js   --mode faculty" \
  "npx vite --config vite.config.hiring.js    --mode hiring" \
  "npx vite --config vite.config.chro.js      --mode chro" \
  "npx vite --config vite.config.recruiter.js --mode recruiter" \
  "npx vite --config vite.config.candidate.js --mode candidate"
