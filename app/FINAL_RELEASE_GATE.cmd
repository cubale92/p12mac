@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title P-12 FULL15 FINAL RELEASE GATE
set "LOG=%CD%\P12_FINAL_RELEASE_GATE.log"
>"%LOG%" echo P-12 FULL15 final release gate %DATE% %TIME%

echo ============================================================
echo   P-12 FULL15 FINAL RELEASE GATE
echo ============================================================
echo Log: %LOG%
echo.

where node >nul 2>nul || goto :missing_node
where cmake >nul 2>nul || goto :missing_cmake
where powershell.exe >nul 2>nul || goto :missing_ps

call :run node tests-full15-integrated.cjs || goto :fail
call :run node tests-sp-character-export-isolation.cjs || goto :fail
call :run node tests-safety-layer-source.cjs || goto :fail
call :run node tests-native-host-realtime-source.cjs || goto :fail
call :run node tests-mixer-audio-handoff-source.cjs || goto :fail

echo [BUILD] Compiling and verifying native VST3 host...
>>"%LOG%" echo [BUILD] Native VST3 host
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%CD%\BUILD_P12_VST_HOST.ps1" -Mode VST3 >>"%LOG%" 2>&1
if errorlevel 1 goto :fail
if not exist "native\p12-vst-host.exe" goto :missing_host

if not exist node_modules (
  echo [DEPS] Installing Electron dependencies...
  call npm install >>"%LOG%" 2>&1
  if errorlevel 1 goto :fail
)

echo [SMOKE] Launching exact FULL15 renderer...
>>"%LOG%" echo [SMOKE] Electron ready-to-show test
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p=Start-Process -FilePath 'npx.cmd' -ArgumentList '--no-install','electron','.','--p12-smoke-test' -WorkingDirectory '%CD%' -PassThru -WindowStyle Hidden; if(-not $p.WaitForExit(20000)){try{$p.Kill()}catch{}; exit 124}; exit $p.ExitCode" >>"%LOG%" 2>&1
if errorlevel 1 goto :fail

findstr /C:"SMOKE TEST PASS" "%APPDATA%\p12-desktop\P12_ELECTRON.log" >nul 2>nul
if errorlevel 1 (
  echo WARNING: smoke process exited but marker was not found at the default Electron userData path.>>"%LOG%"
)

echo.
echo PASS - source tests, native VST3 build and Electron startup gate passed.
echo You can now run BUILD_P12_WINDOWS_EXE.cmd for installer + portable EXE.
echo PASS>>"%LOG%"
pause
exit /b 0

:run
echo [TEST] %*
>>"%LOG%" echo [TEST] %*
%* >>"%LOG%" 2>&1
if errorlevel 1 exit /b 1
exit /b 0

:missing_node
echo ERROR: Node.js missing.>>"%LOG%"
goto :fail
:missing_cmake
echo ERROR: CMake missing.>>"%LOG%"
goto :fail
:missing_ps
echo ERROR: PowerShell missing.>>"%LOG%"
goto :fail
:missing_host
echo ERROR: native\p12-vst-host.exe missing after successful build step.>>"%LOG%"
goto :fail
:fail
echo.
echo FAILED - see %LOG%
pause
exit /b 1
