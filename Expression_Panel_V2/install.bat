@echo off
echo ===================================================================
echo   Expression Panel V2 - Installer Launcher
echo ===================================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" all
pause
