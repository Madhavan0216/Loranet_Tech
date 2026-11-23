@echo off
title LoraNet - Disaster ^& Emergency Response Mesh Dashboard
color 0A
cd /d "%~dp0"

echo ======================================================================
echo           LORANET -- EMERGENCY RESPONSE MESH DASHBOARD               
echo ======================================================================
echo.
echo [*] Working Directory: %CD%
echo [*] Mode: Real Host GPS + Tactical Radar + Web Serial + TCP Mesh
echo.

:: Check if server is already running on port 8765
netstat -ano | findstr :8765 | findstr LISTENING >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [+] LoraNet Unified Server is already running on port 8765.
    echo [+] Opening dashboard in browser: http://localhost:8765 ...
    start "" "http://localhost:8765"
    goto :END
)

:: Try to find Node for server.js (provides dashboard + TCP/WS bridge)
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [+] Node.js detected. Launching LoraNet Unified Server on http://localhost:8765 ...
    start "" "http://localhost:8765"
    node server.js
    goto :END
)

:: Fallback to npx http-server
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [+] Node.js (npx) detected. Starting server on http://localhost:8765 ...
    start "" "http://localhost:8765"
    npx -y http-server . -p 8765 -c-1 --cors
    goto :END
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [+] Python detected. Starting server on http://localhost:8765 ...
    start "" "http://localhost:8765"
    python -m http.server 8765
    goto :END
)

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [+] Python (py) detected. Starting server on http://localhost:8765 ...
    start "" "http://localhost:8765"
    py -m http.server 8765
    goto :END
)

:: Direct fallback if neither is found
echo [!] Neither node, npx nor python found in PATH.
echo [!] Opening index.html directly in default browser...
start "" "%~dp0index.html"

:END
pause
