@echo off
rem One-command local LLM setup for The Egg Lands (Windows).
rem Installs Ollama if needed and pulls the villagers' model.
rem Usage: setup-llm.bat [model]   (default: qwen3:8b; try qwen3:4b or llama3.2:3b on smaller GPUs)
setlocal
set "MODEL=%~1"
if "%MODEL%"=="" set "MODEL=qwen3:8b"

set "OLLAMA=ollama"
where ollama >nul 2>nul
if errorlevel 1 (
  if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" (
    set "OLLAMA=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
  ) else (
    echo Ollama is not installed. Downloading the official installer from ollama.com ...
    powershell -NoProfile -Command "Invoke-WebRequest https://ollama.com/download/OllamaSetup.exe -OutFile \"$env:TEMP\OllamaSetup.exe\""
    if errorlevel 1 goto :fail
    echo Installing Ollama silently ...
    "%TEMP%\OllamaSetup.exe" /VERYSILENT /NORESTART
    if errorlevel 1 goto :fail
    del "%TEMP%\OllamaSetup.exe" >nul 2>nul
    set "OLLAMA=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
  )
)

echo Pulling %MODEL% (a few GB on first run; Ollama uses your GPU automatically) ...
"%OLLAMA%" pull %MODEL%
if errorlevel 1 goto :fail

echo.
echo Done. To give your villagers this mind:
echo   1. Start the game (run.bat) and pick a class.
echo   2. Open Menu ^> Settings.
echo   3. Backend "Local server", URL http://localhost:11434/v1, model %MODEL%.
echo   4. Enable villager conversations and press "Load / connect".
pause
exit /b 0

:fail
echo Setup failed. See docs/LLM-SETUP.md for manual instructions.
pause
exit /b 1
