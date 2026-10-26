@echo off
setlocal
cd /d "%~dp0"
title P-12 Native VST Host Builder
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD_P12_VST_HOST.ps1"
set "P12ERR=%ERRORLEVEL%"
echo.
if not "%P12ERR%"=="0" (
  echo P-12 native host build returned error %P12ERR%.
  echo See P12_NATIVE_BUILD.log in this folder.
) else (
  echo P-12 native host build completed successfully.
)
echo.
pause
exit /b %P12ERR%
