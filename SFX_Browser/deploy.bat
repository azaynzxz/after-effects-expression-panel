@echo off
set "DEST_DIR1=%APPDATA%\Adobe\CEP\extensions\SFX_Browser"
set "DEST_DIR2=%APPDATA%\Adobe\CEP\extensions\com.achmad.sfx.browser"

echo ========================================================
echo Deploying SFX Browser to Adobe CEP...
echo Dest 1: %DEST_DIR1%
echo Dest 2: %DEST_DIR2%
echo ========================================================

:: Enable PlayerDebugMode so Premiere Pro (including 2026) loads custom CEP extensions
echo Enabling CEP PlayerDebugMode in Registry...
reg add "HKCU\Software\Adobe\CSXS.9" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.13" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.14" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.15" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
reg add "HKCU\Software\Adobe\CSXS.16" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1

:: Deploy to SFX_Browser
if not exist "%DEST_DIR1%" mkdir "%DEST_DIR1%"
xcopy /E /I /Y "%~dp0client" "%DEST_DIR1%\client" >nul
xcopy /E /I /Y "%~dp0CSXS" "%DEST_DIR1%\CSXS" >nul
xcopy /E /I /Y "%~dp0host" "%DEST_DIR1%\host" >nul
if exist "%~dp0.debug" copy /Y "%~dp0.debug" "%DEST_DIR1%\.debug" >nul

:: Deploy to com.achmad.sfx.browser
if not exist "%DEST_DIR2%" mkdir "%DEST_DIR2%"
xcopy /E /I /Y "%~dp0client" "%DEST_DIR2%\client" >nul
xcopy /E /I /Y "%~dp0CSXS" "%DEST_DIR2%\CSXS" >nul
xcopy /E /I /Y "%~dp0host" "%DEST_DIR2%\host" >nul
if exist "%~dp0.debug" copy /Y "%~dp0.debug" "%DEST_DIR2%\.debug" >nul

echo.
echo ========================================================
echo [SUCCESS] SFX Browser successfully deployed to both locations!
echo Click Refresh or close and re-open the panel in Premiere Pro.
echo ========================================================
pause
