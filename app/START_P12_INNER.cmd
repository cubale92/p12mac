@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
set "LOG=%CD%\P12_START.log"
> "%LOG%" echo P-12 START LOG - %DATE% %TIME%
>>"%LOG%" echo Folder: %CD%

echo ============================================================
echo   P-12 - ONE CLICK ELECTRON LAUNCHER
echo ============================================================
echo Folder: %CD%
echo Log:    %LOG%
echo.

where node >nul 2>nul
if errorlevel 1 goto :NO_NODE
where npm >nul 2>nul
if errorlevel 1 goto :NO_NODE
where npx >nul 2>nul
if errorlevel 1 goto :NO_NODE

for /f "delims=" %%V in ('node --version 2^>nul') do set "NODEVER=%%V"
for /f "delims=" %%V in ('npm --version 2^>nul') do set "NPMVER=%%V"
echo Node: !NODEVER!
echo npm:  !NPMVER!
>>"%LOG%" echo Node: !NODEVER!
>>"%LOG%" echo npm: !NPMVER!
echo.

if exist "native\p12-vst-host.exe" (
  echo Native VST host: FOUND
  >>"%LOG%" echo Native VST host: FOUND
) else (
  echo WARNING: native\p12-vst-host.exe is missing.
  >>"%LOG%" echo WARNING: native\p12-vst-host.exe is missing.
)
echo.

REM Electron 44+ may not create dist\electron.exe at npm install time.
REM Ensure the local package exists, then launch through npx so Electron
REM can fetch its matching Windows binary on first run.
if not exist "node_modules\electron\package.json" (
  echo Installing P-12 Electron dependencies...
  echo This may take several minutes on first launch.
  >>"%LOG%" echo Running npm install --include=dev...
  call npm install --include=dev >>"%LOG%" 2>&1
  set "RC=!ERRORLEVEL!"
  if not "!RC!"=="0" goto :NPM_FAIL
)

if not exist "node_modules\electron\package.json" (
  echo ERROR: Electron package is still missing after npm install.
  >>"%LOG%" echo ERROR: node_modules\electron\package.json missing after npm install.
  goto :FAIL
)

echo Electron package: FOUND
echo Starting P-12...
echo.
echo IMPORTANT: On the first run Electron may download its Windows binary.
echo Keep this window open until P-12 appears.
echo.
>>"%LOG%" echo Electron package: FOUND
>>"%LOG%" echo Launching via npx electron .

REM Use the official Electron CLI path. Current Electron releases can download
REM their matching binary on first execution rather than during npm install.
call npx --yes electron . >>"%LOG%" 2>&1
set "RC=!ERRORLEVEL!"
>>"%LOG%" echo Electron exited with code !RC!

echo.
echo ============================================================
echo P-12/Electron exited with code !RC!.
echo ============================================================
echo The command window will stay open.
echo.
if not "!RC!"=="0" (
  echo If P-12 did not open, send me:
  echo   %CD%\P12_START.log
  echo   %APPDATA%\p12-desktop\P12_ELECTRON.log
)
goto :END

:NO_NODE
echo ERROR: Node.js / npm / npx is not installed or not on PATH.
>>"%LOG%" echo ERROR: Node.js / npm / npx not found.
echo Run INSTALL_NODEJS.cmd, then open this launcher again.
goto :END

:NPM_FAIL
echo ERROR: npm install failed with code !RC!.
>>"%LOG%" echo ERROR: npm install failed with code !RC!.
goto :END

:FAIL
echo P-12 failed to launch.
>>"%LOG%" echo P-12 failed to launch.

:END
echo.
echo This window intentionally stays open. Type EXIT only when you want to close it.
endlocal
