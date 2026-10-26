@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Install Node.js for P-12
color 0E

echo ============================================================
echo   P-12 - INSTALL NODE.JS LTS
echo ============================================================
echo.
where winget >nul 2>nul
if errorlevel 1 (
  echo Windows Package Manager ^(winget^) was not found.
  echo Install the current Node.js LTS release manually, then run START_P12.cmd.
  echo.
  pause
  exit /b 1
)

echo This will install Node.js LTS using Windows Package Manager.
echo.
pause
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
if errorlevel 1 (
  echo.
  echo Node.js installation failed.
  pause
  exit /b 1
)

echo.
echo Node.js installation completed.
echo IMPORTANT: close this window, then double-click START_P12.cmd.
echo.
pause
