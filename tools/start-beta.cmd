@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo AudioCal Hear 2.0 BETA requiere Node.js 20 o posterior.
 echo Instala Node.js desde https://nodejs.org/ y vuelve a abrir este archivo.
 pause
 exit /b 1
)
echo Iniciando AudioCal Hear 2.0 BETA solo en esta computadora...
echo Abre http://127.0.0.1:8765/ en Chrome, Edge o Firefox.
echo Para cerrar la beta, pulsa Ctrl+C.
node serve-beta.mjs
if errorlevel 1 (
 echo No se pudo iniciar la beta. Consulta el mensaje anterior.
 pause
 exit /b 1
)
endlocal
