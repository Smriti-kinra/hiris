@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: start_all.bat — HIRIS Multi-Portal Dev Launcher (Windows)
::
:: Starts all HIRIS services simultaneously on their dedicated ports:
::   Backend API   → http://localhost:3001
::   Landing Page  → http://localhost:5173
::   Faculty       → http://localhost:5174
::   Hiring Mgr    → http://localhost:5175
::   CHRO          → http://localhost:5176
::   Recruiter     → http://localhost:5177
::   Candidate     → http://localhost:5178
::
:: Usage:
::   start_all.bat
:: ─────────────────────────────────────────────────────────────────────────────
setlocal EnableDelayedExpansion

:: Get repo root (directory containing this .bat file)
set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%apps\frontend"
set "BACKEND_DIR=%ROOT_DIR%apps\backend"

echo.
echo ============================================================
echo   HIRIS -- Multi-Portal Dev Launcher
echo ============================================================
echo.

:: ── Port conflict check ───────────────────────────────────────────────────────
echo [CHECK] Scanning for port conflicts...
set PORTS=3001 5173 5174 5175 5176 5177 5178
set CONFLICT=0

for %%P in (%PORTS%) do (
  netstat -ano | findstr ":%%P " | findstr "LISTENING" > nul 2>&1
  if !errorlevel! == 0 (
    echo   [ERROR] Port %%P is already in use.
    set CONFLICT=1
  ) else (
    echo   [OK]    Port %%P is free.
  )
)

if %CONFLICT%==1 (
  echo.
  echo [ERROR] One or more ports are in use. Stop the conflicting processes and retry.
  echo         Run: netstat -ano ^| findstr ":PORT"  to identify the process.
  pause
  exit /b 1
)

echo.
echo [INFO] All ports available. Starting all HIRIS services...
echo.
echo   Backend API   -^> http://localhost:3001
echo   Landing Page  -^> http://localhost:5173
echo   Faculty       -^> http://localhost:5174
echo   Hiring Mgr    -^> http://localhost:5175
echo   CHRO          -^> http://localhost:5176
echo   Recruiter     -^> http://localhost:5177
echo   Candidate     -^> http://localhost:5178
echo.

:: ── Launch backend in a new window ───────────────────────────────────────────
start "HIRIS Backend :3001" cmd /k "cd /d "%BACKEND_DIR%" && npm run dev"

:: ── Small delay to give backend a head start ─────────────────────────────────
timeout /t 2 /nobreak > nul

:: ── Launch each portal in its own titled terminal window ─────────────────────
start "HIRIS Landing  :5173" cmd /k "cd /d "%FRONTEND_DIR%" && npx vite --port 5173"
start "HIRIS Faculty  :5174" cmd /k "cd /d "%FRONTEND_DIR%" && npx vite --config vite.config.faculty.js   --mode faculty"
start "HIRIS Hiring   :5175" cmd /k "cd /d "%FRONTEND_DIR%" && npx vite --config vite.config.hiring.js    --mode hiring"
start "HIRIS CHRO     :5176" cmd /k "cd /d "%FRONTEND_DIR%" && npx vite --config vite.config.chro.js      --mode chro"
start "HIRIS Recruiter:5177" cmd /k "cd /d "%FRONTEND_DIR%" && npx vite --config vite.config.recruiter.js --mode recruiter"
start "HIRIS Candidate:5178" cmd /k "cd /d "%FRONTEND_DIR%" && npx vite --config vite.config.candidate.js --mode candidate"

echo.
echo [OK] All services launched in separate windows.
echo      Close this window or press any key to exit.
echo.
pause
