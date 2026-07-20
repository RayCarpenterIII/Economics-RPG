@echo off
rem Host The Egg Lands on your home network (and Tailscale, if installed).
rem Phone URL is printed below. LLM server: start the Ollama app, then in-game
rem Settings -> Villager LLM -> Local server -> http://<this-pc-ip>:11434/v1
cd /d "%~dp0"
node build.js
node serve.js --lan --no-open
pause
