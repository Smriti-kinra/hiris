@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: start_all_isolated.bat — HIRIS Multi-Window Incognito Launcher
:: ─────────────────────────────────────────────────────────────────────────────
setlocal EnableDelayedExpansion

:: Get repo root
set "ROOT_DIR=%~dp0"
set "FRONTEND_DIR=%ROOT_DIR%apps\frontend"
set "BACKEND_DIR=%ROOT_DIR%apps\backend"

echo [1/3] Cleaning up old processes...
:: This kills any 'ghost' node processes to free up port 5173
taskkill /f /im node.exe >nul 2>&1

echo [2/3] Starting HIRIS Services...
:: Start Backend
start "HIRIS Backend" cmd /k "cd /d "%BACKEND_DIR%" && npm run dev"

:: Start Frontend (One server handles all windows)
start "HIRIS Vite Server" cmd /k "cd /d "%FRONTEND_DIR%" && npx vite --port 5173 --strictPort"

echo Waiting 5 seconds for Vite to stabilize...
timeout /t 5 /nobreak > nul

echo [3/3] Launching 5 Separate Incognito Windows...

:: --new-window forces a brand new window instead of a new tab
:: --incognito ensures session isolation for your roles

start chrome --incognito --new-window "http://localhost:5173/"
start chrome --incognito --new-window "http://localhost:5173/faculty"
start chrome --incognito --new-window "http://localhost:5173/chro"
start chrome --incognito --new-window "http://localhost:5174/recruiter"
start chrome --incognito --new-window "http://localhost:5175/candidate"

echo.
echo [OK] 5 Isolated windows launched.
echo Note: If you have different vite.config files for these, 
echo make sure they are all running on port 5173 for this script.
echo.
pause