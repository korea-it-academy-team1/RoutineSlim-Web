@echo off
setlocal
cd /d "%~dp0.."
where node >nul 2>nul
if errorlevel 1 goto missing
where npm.cmd >nul 2>nul
if errorlevel 1 goto missing
rem Reinstalling on every start can unlink a running esbuild.exe on Windows.
rem Use scripts\install-deps.bat after package-lock.json changes.
if not exist "node_modules\.bin\vite.cmd" (
  call "%~dp0install-deps.bat"
  if errorlevel 1 exit /b 1
)
echo Starting frontend at http://localhost:5173
echo Backend must be running at http://localhost:8080
call npm run dev -- --open
if errorlevel 1 (
  echo Startup failed. Check the error above.
  pause
  exit /b 1
)
exit /b 0
:missing
echo Install Node.js LTS with npm, then reopen this file.
pause
exit /b 1
