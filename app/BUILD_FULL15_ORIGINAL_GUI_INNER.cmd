@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title P-12 FULL15 ORIGINAL GUI BUILDER
if not exist "P-12.html" (echo ERROR: Run this next to P-12.html & exit /b 1)
if not exist "native-host\src\main.cpp" (echo ERROR: Missing original native-host sources & exit /b 1)
echo Checking original FULL15 interface, project format, and offline assets...
where node >nul 2>nul
if errorlevel 1 (echo ERROR: Node.js is required & exit /b 1)
call node "tests-full15-integrated.cjs"
if errorlevel 1 (echo ERROR: FULL15 source check failed; build stopped & exit /b 1)
echo Building original FULL15 front end with native VST3/JUCE audio host.
call "BUILD_P12_WINDOWS_EXE.cmd"
set "exitcode=%errorlevel%"
echo.
echo FULL15 builder returned code %exitcode%.
:end
exit /b %exitcode%
