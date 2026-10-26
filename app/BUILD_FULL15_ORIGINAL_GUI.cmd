@echo off
cd /d "%~dp0"
title P-12 FULL15 BUILDER - STAY OPEN
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0P12_BUILD_STAY_OPEN.ps1"
echo.
echo Build launcher finished. Its output is saved in P12_FULL15_BUILD.log.
pause
