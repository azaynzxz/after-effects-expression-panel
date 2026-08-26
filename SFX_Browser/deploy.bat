@echo off
set "DEST_DIR=%APPDATA%\Adobe\CEP\extensions\com.achmad.sfx.browser"

echo Deploying SFX Browser to: %DEST_DIR%

if not exist "%DEST_DIR%" (
    mkdir "%DEST_DIR%"
)

xcopy /E /I /Y "%~dp0client" "%DEST_DIR%\client"
xcopy /E /I /Y "%~dp0CSXS" "%DEST_DIR%\CSXS"
xcopy /E /I /Y "%~dp0host" "%DEST_DIR%\host"

echo Deployment complete. Please restart Premiere Pro.
pause
