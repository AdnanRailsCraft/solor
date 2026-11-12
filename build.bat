@echo off
echo ==========================================
echo   BEFIRST ENERGY SOLUTION - BUILD SYSTEM
echo ==========================================
echo.
echo [1/2] Navigating to project directory...
cd /d "%~dp0"

echo [2/2] Building Windows Installer...
echo.
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed! Please check the logs above.
) else (
    echo.
    echo [SUCCESS] Build complete! 
    echo Check the 'dist' folder for your installer.
)
echo.
pause