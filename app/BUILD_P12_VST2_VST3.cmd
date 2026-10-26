@echo off
setlocal
cd /d "%~dp0"
title P-12 Native VST2 + VST3 Host Builder
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD_P12_VST_HOST.ps1" -Mode VST2VST3
set "P12ERR=%ERRORLEVEL%"
echo.
if not "%P12ERR%"=="0" echo See P12_NATIVE_BUILD.log in this folder.
echo.
pause
exit /b %P12ERR%
