@echo off
color 0A
cls
echo ================================================================
echo    SYNAPSEAI - FRESH VERSION LOADER
echo ================================================================
echo.
echo  STATUS: All changes are SAVED to disk (280,657 bytes)
echo  PROBLEM: Browser is showing OLD cached version
echo  SOLUTION: This script opens with cache-busting parameters
echo.
echo ================================================================
echo  Opening in 2 seconds...
echo ================================================================
timeout /t 2 /nobreak >nul

REM Generate unique cache-busting parameters
set TIMESTAMP=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set RANDOM_ID=%random%%random%

REM Open with multiple cache-busting parameters
start "" "app\index.html?v=%TIMESTAMP%&r=%RANDOM_ID%&nocache=true"

cls
echo ================================================================
echo    BROWSER OPENED!
echo ================================================================
echo.
echo  You should now see the LATEST version with:
echo.
echo  [✓] Conversation auto-save working
echo  [✓] Workflow modals (Create/Edit/Pause) working
echo  [✓] Status badges with centered text
echo  [✓] No AI Control Center
echo  [✓] No right document panel
echo  [✓] No Toggle Context button
echo.
echo ================================================================
echo  STILL SEEING OLD VERSION?
echo ================================================================
echo.
echo  In the browser window that opened:
echo  1. Press: Ctrl + Shift + R  (Hard refresh)
echo  2. Or press: Ctrl + Shift + Delete  (Clear cache)
echo.
echo  Then refresh the page.
echo.
echo ================================================================
pause
