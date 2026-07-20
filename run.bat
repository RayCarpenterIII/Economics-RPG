@echo off
rem One-click launcher for The Emberfold Valley (Windows).
rem Requires Node.js: https://nodejs.org
cd /d "%~dp0"
node serve.js %*
pause
