@echo off
chcp 65001 >nul
title Nero Hub
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install --no-fund --no-audit || goto :erro
)
if not exist server\data\db.json call npm run importar
call npm run build || goto :erro
start "" http://127.0.0.1:5180
call npm run serve
goto :eof
:erro
echo.
echo Algo deu errado. Veja a mensagem acima.
pause
