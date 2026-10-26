@echo off
cd /d "%~dp0"
title P-12 STARTUP DIAGNOSTICS - STAY OPEN
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0P12_DIAGNOSE_START.ps1"
echo.
echo Send P12_STARTUP_REPORT.zip from this folder.
pause
