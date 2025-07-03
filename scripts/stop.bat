@echo off
TITLE Parada do Sistema Playwright Hub
COLOR 0C

ECHO ========================================
ECHO     PLAYWRIGHT HUB - PARADA
ECHO ========================================
ECHO.

ECHO [INFO] Parando servicos...
ECHO.

REM Parar PM2 se estiver rodando
ECHO [STEP] Verificando PM2...
pm2 -v >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO [INFO] Parando processos PM2...
    pm2 stop all
    pm2 delete all
    ECHO [OK] Processos PM2 parados.
) ELSE (
    ECHO [INFO] PM2 nao encontrado, continuando...
)

REM Parar processos Node.js
ECHO [STEP] Parando processos Node.js...
tasklist /fi "imagename eq node.exe" | findstr node >nul
IF %ERRORLEVEL% EQU 0 (
    taskkill /f /im node.exe >nul 2>&1
    ECHO [OK] Processos Node.js finalizados.
) ELSE (
    ECHO [INFO] Nenhum processo Node.js encontrado.
)

REM Parar NGINX
ECHO [STEP] Parando NGINX...
tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
IF %ERRORLEVEL% EQU 0 (
    IF EXIST "C:\nginx\nginx.exe" (
        cd C:\nginx
        nginx.exe -s quit
        cd %~dp0..
        
        REM Aguardar NGINX parar graciosamente
        timeout /t 3 /nobreak >nul
        
        REM Forcar parada se necessario
        tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
        IF %ERRORLEVEL% EQU 0 (
            taskkill /f /im nginx.exe >nul 2>&1
            ECHO [OK] NGINX forcado a parar.
        ) ELSE (
            ECHO [OK] NGINX parado graciosamente.
        )
    ) ELSE (
        taskkill /f /im nginx.exe >nul 2>&1
        ECHO [OK] NGINX finalizado.
    )
) ELSE (
    ECHO [INFO] NGINX nao estava rodando.
)

ECHO.
ECHO [INFO] Verificando status final...

REM Verificar se ainda ha processos rodando
tasklist /fi "imagename eq node.exe" | findstr node >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [AVISO] Ainda existem processos Node.js rodando.
) ELSE (
    ECHO [OK] Nenhum processo Node.js ativo.
)

tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [AVISO] Ainda existem processos NGINX rodando.
) ELSE (
    ECHO [OK] Nenhum processo NGINX ativo.
)

ECHO.
ECHO ========================================
ECHO        SISTEMA PARADO!
ECHO ========================================
ECHO.
ECHO Para reiniciar:
ECHO - scripts\start.bat
ECHO.
ECHO Para verificar status:
ECHO - scripts\status.bat
ECHO.

PAUSE