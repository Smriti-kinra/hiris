@echo off
setlocal

:: --- HIRIS - start backend + unified frontend -------------------------

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%hiris-unified"

:: -- 1. Kill any lingering processes on our ports ---------------------
echo - Clearing ports 3001, 5176...
for %%P in (3001 5176) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%P" ^| findstr "LISTENING"') do (
        taskkill /F /PID %%a >nul 2>&1
    )
)

:: -- 2. Install backend deps if needed -------------------------------
if not exist "%BACKEND%\node_modules\" (
    echo - Installing backend dependencies...
    cd /d "%BACKEND%"
    call npm install
)

:: -- 3. Install frontend deps if needed -------------------------------
if not exist "%FRONTEND%\node_modules\" (
    echo - Installing frontend dependencies...
    cd /d "%FRONTEND%"
    call npm install
)

:: -- 4. Start backend -------------------------------------------------
echo - Starting backend on :3001
cd /d "%BACKEND%"
start /B "" npm run dev

:: -- 5. Start unified frontend -----------------------------------------
echo - Starting HIRIS unified app on :5176
cd /d "%FRONTEND%"
start /B "" npm run dev

echo.
echo   ============================================
echo           HIRIS is running                  
echo   ============================================
echo     Backend API    http://localhost:3001     
echo     HIRIS App      http://localhost:5176     
echo   ============================================
echo     Demo accounts (click Quick Login):      
echo     smriti.kinra@hiris.demo     - CHRO      
echo     sartajdeep.singh@hiris.demo - Hiring Mgr
echo     gracy.tanna@hiris.demo      - Faculty   
echo   ============================================
echo.
echo   Press Ctrl+C to stop all services.
echo.

:: Open the landing page
echo - Opening landing page in browser...
start http://localhost:5176

:: Keep the command prompt open to view output and accept Ctrl+C
:wait
pause >nul
goto wait
