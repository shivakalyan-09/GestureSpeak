@echo off
echo ============================================
echo   GestureSpeak - Starting Spring Boot Backend
echo ============================================
echo.
cd /d "%~dp0gesturespeak-backend"
echo Working directory: %CD%
echo.
echo Starting backend on port 8080...
echo Press Ctrl+C to stop the server.
echo.
call apache-maven-3.9.6\bin\mvn.cmd spring-boot:run
pause
