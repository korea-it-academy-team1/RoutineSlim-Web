@echo off
setlocal
cd /d "%~dp0.."
echo Close this project's Vite server before installing dependencies.
echo If esbuild.exe is locked, close its server terminal or restart Windows.
call npm ci
if errorlevel 1 (
  echo Installation failed. Development server was not started.
  pause
  exit /b 1
)
exit /b 0
