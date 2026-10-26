@echo off
cd /d "%~dp0"
title P-12 Launcher - STAY OPEN
color 0A
REM Run the real launcher inside CMD /K so this window cannot disappear on its own.
cmd.exe /d /k call "%~dp0START_P12_INNER.cmd"
