@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PY_EXE="
set "PY_ARG="

rem Test commands rather than trusting WHERE. Windows Store aliases may exist
rem even when they cannot launch a real Python interpreter.
py -3 --version >nul 2>nul
if not errorlevel 1 (
  set "PY_EXE=py"
  set "PY_ARG=-3"
  goto found_python
)

python --version >nul 2>nul
if not errorlevel 1 (
  set "PY_EXE=python"
  goto found_python
)

python3 --version >nul 2>nul
if not errorlevel 1 (
  set "PY_EXE=python3"
  goto found_python
)

for %%P in (
  "%LocalAppData%\Programs\Python\Python313\python.exe"
  "%LocalAppData%\Programs\Python\Python312\python.exe"
  "%LocalAppData%\Programs\Python\Python311\python.exe"
  "%LocalAppData%\Programs\Python\Python310\python.exe"
  "%UserProfile%\anaconda3\python.exe"
  "%UserProfile%\miniconda3\python.exe"
  "%ProgramData%\anaconda3\python.exe"
  "%ProgramData%\miniconda3\python.exe"
  "C:\Python313\python.exe"
  "C:\Python312\python.exe"
  "C:\Python311\python.exe"
  "C:\Python310\python.exe"
) do (
  if not defined PY_EXE if exist "%%~P" (
    "%%~P" --version >nul 2>nul
    if not errorlevel 1 set "PY_EXE=%%~P"
  )
)

if not defined PY_EXE goto python_missing

goto found_python

:python_missing
echo.
echo A working Python interpreter was not found by the launcher.
echo.
echo The Microsoft Store execution alias can look like Python even when it is not installed.
echo Try these commands in Command Prompt:
echo   where python
echo   where py
echo   python --version
echo.
echo If Python is installed through Anaconda, open Anaconda Prompt and run start_game.bat there.
echo You can also install Python 3.10 or newer from python.org and enable "Add Python to PATH".
echo.
pause
exit /b 1

:found_python
echo Using Python: "%PY_EXE%" %PY_ARG%
"%PY_EXE%" %PY_ARG% tools\doctor.py
if errorlevel 1 goto failed
"%PY_EXE%" %PY_ARG% tools\build_preview.py
if errorlevel 1 goto failed
"%PY_EXE%" %PY_ARG% tools\verify_build.py
if errorlevel 1 goto failed
"%PY_EXE%" %PY_ARG% -m egglands.server.app
if errorlevel 1 goto failed
exit /b 0

:failed
echo.
echo The Egg Lands failed to start. Review the error above.
pause
exit /b 1
