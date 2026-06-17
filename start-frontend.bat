@echo off
echo ============================================
echo   GestureSpeak - Starting React Frontend
echo ============================================
echo.
cd /d "%~dp0gesturespeak-frontend"
echo Working directory: %CD%
echo.
echo Starting frontend on port 5173...
echo Press Ctrl+C to stop the server.
echo.
call npm run dev
pause
