@echo off
:: Batch script to copy AE Expression Panel scripts to ScriptUI Panels with Auto-Elevation

set "TARGET_DIR=C:\Program Files\Adobe\Adobe After Effects 2024\Support Files\Scripts\ScriptUI Panels"
set "SRC_DIR=%~dp0"

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator privileges to write to Program Files...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo Copying scripts from: %SRC_DIR%
echo Copying scripts to:   %TARGET_DIR%
echo.

if not exist "%TARGET_DIR%" (
    echo Error: Target folder does not exist. Please check if After Effects 2024 is installed.
    echo Path: "%TARGET_DIR%"
    echo.
    pause
    exit /b
)

echo Deleting old scripts from target...
del /F /Q "%TARGET_DIR%\Expression_Panel_V2.jsx" 2>nul
del /F /Q "%TARGET_DIR%\List_Jumper.jsx" 2>nul
del /F /Q "%TARGET_DIR%\X Crop.jsx" 2>nul

echo.
echo Copying new scripts...
copy /Y "%SRC_DIR%Expression_Panel_V2\Expression_Panel_V2.jsx" "%TARGET_DIR%\"
copy /Y "%SRC_DIR%Expression_Panel_V2\List_Jumper.jsx" "%TARGET_DIR%\"
copy /Y "%SRC_DIR%Expression_Panel_V2\X Crop.jsx" "%TARGET_DIR%\"

echo.
echo Done! Scripts successfully copied.
echo.
pause
