@echo off
setlocal
cd /d "%~dp0"
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 24 LTS first.
  pause
  exit /b 1
)
call npm ci
if errorlevel 1 (
  pause
  exit /b 1
)
call npm run build
if errorlevel 1 (
  pause
  exit /b 1
)
echo.
echo Build completed. Backend URL stays http://localhost:8080
echo Copy the CONTENTS of dist into your Spring project:
echo src\main\resources\static
echo Restart Spring, then open http://localhost:8080
echo Static routes must be public in Spring. See docs\LOCALHOST-8080.md
start "" "%~dp0dist"
pause
