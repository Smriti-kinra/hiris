@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: start_all.bat — HIRIS Multi-Portal Dev Launcher (Windows)
::
:: Startup sequence:
::   1. Kill stale HIRIS processes on preferred ports
::   2. node scripts/find-ports.js  → resolve ports, write .resolved-ports.json
::   3. node scripts/inject-env.js  → regenerate all .env files
::   4. Launch backend + all portals in separate titled terminals
::
:: Usage:  start_all.bat
:: ─────────────────────────────────────────────────────────────────────────────
setlocal EnableDelayedExpansion

set "ROOT=%~dp0"
set "SCRIPTS=%ROOT%scripts"
set "FRONTEND=%ROOT%apps\frontend"
set "BACKEND=%ROOT%apps\backend"

echo.
echo ============================================================
echo   HIRIS -- Multi-Portal Dev Launcher (Windows)
echo ============================================================
echo.

:: ── Check Node.js ─────────────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found. Install from https://nodejs.org/
  pause
  exit /b 1
)

:: ── Step 1: Resolve ports dynamically ────────────────────────────────────────
echo [STEP 1/4] Resolving ports dynamically...
node "%SCRIPTS%\find-ports.js" --kill
if errorlevel 1 ( echo [ERROR] Port resolution failed. && pause && exit /b 1 )
echo.

:: ── Step 2: Inject env files ──────────────────────────────────────────────────
echo [STEP 2/4] Injecting environment variables...
node "%SCRIPTS%\inject-env.js"
if errorlevel 1 ( echo [ERROR] Env injection failed. && pause && exit /b 1 )
echo.

:: ── Step 3: Read resolved ports ───────────────────────────────────────────────
echo [STEP 3/4] Reading resolved ports...
for /f %%i in ('node -e "const r=require('./scripts/.resolved-ports.json');console.log(r.backend)"') do set BACKEND_PORT=%%i
for /f %%i in ('node -e "const r=require('./scripts/.resolved-ports.json');console.log(r.landing)"') do set LANDING_PORT=%%i
for /f %%i in ('node -e "const r=require('./scripts/.resolved-ports.json');console.log(r.faculty)"') do set FACULTY_PORT=%%i
for /f %%i in ('node -e "const r=require('./scripts/.resolved-ports.json');console.log(r.hiring)"') do set HIRING_PORT=%%i
for /f %%i in ('node -e "const r=require('./scripts/.resolved-ports.json');console.log(r.chro)"') do set CHRO_PORT=%%i
for /f %%i in ('node -e "const r=require('./scripts/.resolved-ports.json');console.log(r.recruiter)"') do set RECRUITER_PORT=%%i
for /f %%i in ('node -e "const r=require('./scripts/.resolved-ports.json');console.log(r.candidate)"') do set CANDIDATE_PORT=%%i

echo.
echo  Backend API      -^> http://localhost:%BACKEND_PORT%
echo  Landing Page     -^> http://localhost:%LANDING_PORT%
echo  Faculty Portal   -^> http://localhost:%FACULTY_PORT%
echo  Hiring Mgr       -^> http://localhost:%HIRING_PORT%
echo  CHRO / Admin     -^> http://localhost:%CHRO_PORT%
echo  Recruiter        -^> http://localhost:%RECRUITER_PORT%
echo  Candidate        -^> http://localhost:%CANDIDATE_PORT%
echo.

:: ── Step 4: Launch all services ───────────────────────────────────────────────
echo [STEP 4/4] Launching all services in separate terminals...
echo.

start "HIRIS Backend     :%BACKEND_PORT%"  cmd /k "cd /d "%BACKEND%" && npm run dev"
timeout /t 2 /nobreak >nul

start "HIRIS Landing     :%LANDING_PORT%"  cmd /k "cd /d "%FRONTEND%" && npx vite --port %LANDING_PORT%"
start "HIRIS Faculty     :%FACULTY_PORT%"  cmd /k "cd /d "%FRONTEND%" && npx vite --config vite.config.faculty.js   --mode faculty"
start "HIRIS Hiring      :%HIRING_PORT%"   cmd /k "cd /d "%FRONTEND%" && npx vite --config vite.config.hiring.js    --mode hiring"
start "HIRIS CHRO        :%CHRO_PORT%"     cmd /k "cd /d "%FRONTEND%" && npx vite --config vite.config.chro.js      --mode chro"
start "HIRIS Recruiter   :%RECRUITER_PORT%" cmd /k "cd /d "%FRONTEND%" && npx vite --config vite.config.recruiter.js --mode recruiter"
start "HIRIS Candidate   :%CANDIDATE_PORT%" cmd /k "cd /d "%FRONTEND%" && npx vite --config vite.config.candidate.js --mode candidate"

echo.
echo [OK] All 7 HIRIS services launched.
echo      Each portal runs in its own terminal window.
echo      Close this window or press any key to exit.
echo.
pause
