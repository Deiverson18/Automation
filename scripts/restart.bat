@echo off
TITLE Reinicializacao do Sistema Playwright Hub
COLOR 0E

ECHO ========================================
ECHO   PLAYWRIGHT HUB - REINICIALIZACAO
ECHO ========================================
ECHO.

ECHO [INFO] Reiniciando sistema...
ECHO.

REM Parar servicos
ECHO [STEP] Parando servicos atuais...
call scripts\stop.bat

ECHO.
ECHO [INFO] Aguardando 5 segundos...
timeout /t 5 /nobreak >nul

REM Iniciar servicos
ECHO [STEP] Iniciando servicos...
call scripts\start.bat

ECHO.
ECHO ========================================
ECHO      REINICIALIZACAO CONCLUIDA!
ECHO ========================================
ECHO.

PAUSE