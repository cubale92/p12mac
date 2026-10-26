@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title P-12 Windows EXE Builder

echo ============================================================
echo   P-12 Windows x64 EXE Builder - SP12 Safe Chop Routing
echo ============================================================
echo.

where node >nul 2>nul || (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Run INSTALL_NODEJS.cmd first, then reopen this folder.
  pause
  exit /b 1
)
where npm >nul 2>nul || (
  echo ERROR: npm is not available.
  pause
  exit /b 1
)

if not exist "native" mkdir "native"
echo.
echo [0/3] Compiling patched VST3 host with PCM processing...
where cmake >nul 2>nul || (
  echo ERROR: CMake required for Ozone/VST3 host. Native processing cannot work without it.
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD_P12_VST_HOST.ps1" -Mode VST3
if errorlevel 1 goto :fail
if not exist "native\p12-vst-host.exe" (
  echo ERROR: Missing freshly compiled native VST3 host.
  goto :fail
)

if not exist node_modules (
  echo [1/3] Installing Electron dependencies...
  call npm install
  if errorlevel 1 goto :fail
) else (
  echo [1/3] Electron dependencies already installed.
)

echo.
echo [2/3] Building Windows installer EXE...
rem The first pass keeps the normal EXE icon and version-resource editing.
rem Some Windows security scanners lock newly-created EXEs during this exact step.
rem If it fails, rebuild in a fresh folder WITHOUT the EXE resource editing pass.
set "P12_BUILD_ID=%RANDOM%%RANDOM%%RANDOM%"
set "P12_INSTALL_OUT=dist-installer-%P12_BUILD_ID%"
set "P12_PORTABLE_OUT=dist-portable-%P12_BUILD_ID%"
echo Installer output: %P12_INSTALL_OUT%
call npx --no-install electron-builder --win nsis --x64 "--config.directories.output=%P12_INSTALL_OUT%"
if errorlevel 1 (
  echo.
  echo WARNING: Standard installer packaging failed.
  echo Retrying in fresh output WITHOUT Windows EXE resource modification...
  echo The fallback EXE may lack custom embedded icon and version metadata.
  set "P12_INSTALL_OUT=dist-installer-safe-%P12_BUILD_ID%"
  call npx --no-install electron-builder --win nsis --x64 "--config.directories.output=dist-installer-safe-%P12_BUILD_ID%" "--config.win.signAndEditExecutable=false"
  if errorlevel 1 goto :fail
)

echo.
echo [3/3] Building portable Windows EXE...
echo Portable output: %P12_PORTABLE_OUT%
call npx --no-install electron-builder --win portable --x64 "--config.directories.output=%P12_PORTABLE_OUT%"
if errorlevel 1 (
  echo.
  echo WARNING: Standard portable packaging failed.
  echo Retrying in fresh output WITHOUT Windows EXE resource modification...
  echo The fallback EXE may lack custom embedded icon and version metadata.
  set "P12_PORTABLE_OUT=dist-portable-safe-%P12_BUILD_ID%"
  call npx --no-install electron-builder --win portable --x64 "--config.directories.output=dist-portable-safe-%P12_BUILD_ID%" "--config.win.signAndEditExecutable=false"
  if errorlevel 1 goto :fail
)

echo.
echo ============================================================
echo SUCCESS
for %%F in ("%P12_INSTALL_OUT%\*.exe") do if exist "%%~fF" echo Installer: %%~fF
for %%F in ("%P12_PORTABLE_OUT%\*.exe") do if exist "%%~fF" echo Portable:  %%~fF
echo ============================================================
pause
exit /b 0

:fail
echo.
echo BUILD FAILED with exit code %errorlevel%
echo Send me the console output if you want me to fix the next error.
pause
exit /b 1
