@echo off
title Pelayan BDR JTMK
echo ===================================================
echo   MEMULAKAN SISTEM PELAPORAN BDR - JTMK
echo ===================================================
echo.

:: Semak jika Python dipasang
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Python dikesan. Menjalankan pelayan di http://localhost:8080...
    start http://localhost:8080
    python -m http.server 8080
    goto end
)

:: Semak jika Node.js dipasang
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Node.js dikesan. Menjalankan pelayan (http-server) di http://localhost:8080...
    start http://localhost:8080
    npx -y http-server -p 8080
    goto end
)

:: Jika tiada Python/Node, buka fail secara terus
echo [INFO] Membuka fail index.html secara terus di pelayar lalai...
start index.html

:end
echo.
echo ===================================================
echo   Pelayan ditutup atau tamat.
echo ===================================================
pause
