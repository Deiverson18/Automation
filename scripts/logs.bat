@echo off
TITLE Logs do Sistema Playwright Hub
COLOR 0A

ECHO ========================================
ECHO      PLAYWRIGHT HUB - LOGS
ECHO ========================================
ECHO.

:MENU
ECHO Selecione o tipo de log:
ECHO.
ECHO 1. Backend (Node.js)
ECHO 2. NGINX Access
ECHO 3. NGINX Error
ECHO 4. PM2 Logs
ECHO 5. Todos os logs
ECHO 6. Limpar logs
ECHO 0. Sair
ECHO.
SET /P choice="Digite sua opcao (0-6): "

IF "%choice%"=="1" GOTO BACKEND_LOGS
IF "%choice%"=="2" GOTO NGINX_ACCESS
IF "%choice%"=="3" GOTO NGINX_ERROR
IF "%choice%"=="4" GOTO PM2_LOGS
IF "%choice%"=="5" GOTO ALL_LOGS
IF "%choice%"=="6" GOTO CLEAN_LOGS
IF "%choice%"=="0" GOTO END
GOTO MENU

:BACKEND_LOGS
ECHO.
ECHO === BACKEND LOGS ===
IF EXIST "logs\backend.log" (
    powershell "Get-Content logs\backend.log -Tail 20"
) ELSE (
    ECHO Log do backend nao encontrado.
)
ECHO.
PAUSE
GOTO MENU

:NGINX_ACCESS
ECHO.
ECHO === NGINX ACCESS LOGS ===
IF EXIST "C:\nginx\logs\access.log" (
    powershell "Get-Content C:\nginx\logs\access.log -Tail 20"
) ELSE (
    ECHO Log de acesso do NGINX nao encontrado.
)
ECHO.
PAUSE
GOTO MENU

:NGINX_ERROR
ECHO.
ECHO === NGINX ERROR LOGS ===
IF EXIST "C:\nginx\logs\error.log" (
    powershell "Get-Content C:\nginx\logs\error.log -Tail 20"
) ELSE (
    ECHO Log de erro do NGINX nao encontrado.
)
ECHO.
PAUSE
GOTO MENU

:PM2_LOGS
ECHO.
ECHO === PM2 LOGS ===
pm2 -v >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    pm2 logs --lines 20
) ELSE (
    ECHO PM2 nao esta instalado ou nao esta rodando.
)
ECHO.
PAUSE
GOTO MENU

:ALL_LOGS
ECHO.
ECHO === TODOS OS LOGS ===
ECHO.
ECHO --- Backend ---
IF EXIST "logs\backend.log" (
    powershell "Get-Content logs\backend.log -Tail 10"
) ELSE (
    ECHO Backend log nao encontrado.
)
ECHO.
ECHO --- NGINX Access ---
IF EXIST "C:\nginx\logs\access.log" (
    powershell "Get-Content C:\nginx\logs\access.log -Tail 5"
) ELSE (
    ECHO NGINX access log nao encontrado.
)
ECHO.
ECHO --- NGINX Error ---
IF EXIST "C:\nginx\logs\error.log" (
    powershell "Get-Content C:\nginx\logs\error.log -Tail 5"
) ELSE (
    ECHO NGINX error log nao encontrado.
)
ECHO.
PAUSE
GOTO MENU

:CLEAN_LOGS
ECHO.
ECHO === LIMPEZA DE LOGS ===
ECHO.
ECHO AVISO: Esta operacao ira apagar todos os logs!
SET /P confirm="Tem certeza? (S/N): "
IF /I "%confirm%"=="S" (
    IF EXIST "logs\*.log" del /Q logs\*.log
    IF EXIST "C:\nginx\logs\*.log" del /Q C:\nginx\logs\*.log
    ECHO Logs limpos com sucesso!
) ELSE (
    ECHO Operacao cancelada.
)
ECHO.
PAUSE
GOTO MENU

:END
ECHO.
ECHO Saindo...