@echo off
rem One-click launcher for The Egg Lands (Windows).
rem Requires Node.js: https://nodejs.org
cd /d "%~dp0"
node build.js
if errorlevel 1 goto :build_failed
node serve.js %*
pause
exit /b 0

:build_failed
echo Build failed. Run npm test for details.
pause
