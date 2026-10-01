@echo off
setlocal
title Research Agent - Conda

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start_conda.ps1" %*
set "exit_code=%ERRORLEVEL%"

if not "%exit_code%"=="0" (
  echo.
  echo Research Agent failed to start. Exit code: %exit_code%
  pause
)

exit /b %exit_code%
