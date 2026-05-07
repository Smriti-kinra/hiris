#!/usr/bin/env bash
# ─── HIRIS — start backend + unified frontend ─────────────────────────
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/apps/backend"
FRONTEND="$ROOT/apps/frontend"

# ── 1. Kill any lingering processes on our ports ─────────────────────
echo "→ Clearing ports 3001, 5176…"
for PORT in 3001 5176; do
  lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null || true
done

# ── 2. Install backend deps if needed ───────────────────────────────
if [ ! -d "$BACKEND/node_modules" ]; then
  echo "→ Installing backend dependencies…"
  cd "$BACKEND" && npm install
fi

# ── 3. Install frontend deps if needed ───────────────────────────────
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo "→ Installing frontend dependencies…"
  cd "$FRONTEND" && npm install
fi

# ── 4. Validate backend environment ───────────────────────────────────
if [ ! -f "$BACKEND/.env" ] && [ -z "$DATABASE_URL" -o -z "$JWT_SECRET" ]; then
  printf '\n[FATAL] Missing backend environment configuration.\n'
  printf 'Copy backend/.env.example to backend/.env and set DATABASE_URL and JWT_SECRET.\n'
  exit 1
fi

# ── 5. Run database migrations + seed demo passwords ───────────────────
echo "→ Running database migrations"
cd "$BACKEND"
npm run migrate

echo "→ Seeding demo passwords"
npm run seed:passwords

# ── 6. Start backend ─────────────────────────────────────────────────
echo "→ Starting backend on :3001"
npm run dev &
BACKEND_PID=$!

# ── 7. Start frontend ─────────────────────────────────────────
echo "→ Starting HIRIS frontend app on :5176"
cd "$FRONTEND"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║        HIRIS is running                  ║"
echo "  ╠══════════════════════════════════════════╣"
echo "  ║  Backend API    http://localhost:3001     ║"
echo "  ║  HIRIS App      http://localhost:5176     ║"
echo "  ╠══════════════════════════════════════════╣"
echo "  ║  Demo accounts (click Quick Login):      ║"
echo "  ║  smriti.kinra@hiris.demo     → CHRO      ║"
echo "  ║  sartajdeep.singh@hiris.demo → Hiring Mgr║"
echo "  ║  gracy.tanna@hiris.demo      → Faculty   ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

# Wait and propagate Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
