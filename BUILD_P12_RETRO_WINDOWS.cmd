@echo off
setlocal
cd /d "%~dp0"
title P12 Retro - Windows build (plug-in + desktop + installer)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\build-windows.ps1" %*
set "ERR=%ERRORLEVEL%"
echo.
if "%ERR%"=="0" (echo Done. Installer is in installer\Output) else (echo Build failed with code %ERR%.)
pause
exit /b %ERR%
