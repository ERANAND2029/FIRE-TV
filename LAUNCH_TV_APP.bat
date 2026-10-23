@echo off
title Family Watch Referee - Launch on Fire TV Emulator
set "SDK_DIR=%~dp0.android-sdk"
set "ADB=%SDK_DIR%\platform-tools\adb.exe"

echo Checking if app is installed...
"%ADB%" shell am start -n "com.familywatch.referee/.MainActivity"
if %errorlevel% neq 0 (
    echo Installing APK first...
    "%ADB%" install -r "%~dp0app\build\outputs\apk\debug\app-debug.apk"
    "%ADB%" shell am start -n "com.familywatch.referee/.MainActivity"
)

echo App launched on emulator!
pause
