@echo off
set "DIR=%~dp0"
cd /d "%DIR%"

start "" cmd /k python -m http.server 8000

timeout /t 2 >nul

start "" explorer "http://localhost:8000/"

exit
