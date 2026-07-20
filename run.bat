@echo off
rem One-click launcher for The Egg Lands (Windows).
rem Requires Node.js: https://nodejs.org
cd /d "%~dp0"
node serve.js %*
pause
