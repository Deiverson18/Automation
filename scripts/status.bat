@echo off
TITLE Status do Sistema Playwright Hub
COLOR 0F

ECHO ========================================
ECHO     PLAYWRIGHT HUB - STATUS
ECHO ========================================
ECHO.

ECHO [INFO] Verificando status dos servicos...
ECHO.

REM Verificar Node.js
ECHO === NODE.JS ===
node -v >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    FOR /F "tokens=*" %%i IN ('node -v') DO ECHO Versao: %%i
    
    REM Verificar processos Node.js
    tasklist /fi "imagename eq node.exe" | findstr node >nul
    IF %ERRORLEVEL% EQU 0 (
        ECHO Status: ATIVO
        tasklist /fi "imagename eq node.exe"
    ) ELSE (
        ECHO Status: INATIVO
    )
) ELSE (
    ECHO Status: NAO INSTALADO
)

ECHO.

REM Verificar NGINX
ECHO === NGINX ===
IF EXIST "C:\nginx\nginx.exe" (
    ECHO Instalacao: C:\nginx\nginx.exe
    
    tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
    IF %ERRORLEVEL% EQU 0 (
        ECHO Status: ATIVO
        tasklist /fi "imagename eq nginx.exe"
    ) ELSE (
        ECHO Status: INATIVO
    )
) ELSE (
    ECHO Status: NAO INSTALADO
)

ECHO.

REM Verificar portas
ECHO === PORTAS ===
netstat -an | findstr :80 >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO Porta 80: ATIVA
) ELSE (
    ECHO Porta 80: INATIVA
)

netstat -an | findstr :3000 >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO Porta 3000: ATIVA
) ELSE (
    ECHO Porta 3000: INATIVA
)

ECHO.

REM Verificar PM2
ECHO === PM2 ===
pm2 -v >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    FOR /F "tokens=*" %%i IN ('pm2 -v') DO ECHO Versao: %%i
    pm2 list
) ELSE (
    ECHO Status: NAO INSTALADO
)

ECHO.

REM Verificar conectividade
ECHO === CONECTIVIDADE ===
curl -s http://localhost >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO Frontend: ACESSIVEL
) ELSE (
    ECHO Frontend: INACESSIVEL
)

curl -s http://localhost:3000 >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO Backend: ACESSIVEL
) ELSE (
    ECHO Backend: INACESSIVEL
)

ECHO.

REM Verificar logs recentes
ECHO === LOGS RECENTES ===
IF EXIST "logs\backend.log" (
    ECHO Backend Log (ultimas 5 linhas):
    powershell "Get-Content logs\backend.log -Tail 5"
) ELSE (
    ECHO Backend Log: NAO ENCONTRADO
)

ECHO.

IF EXIST "C:\nginx\logs\error.log" (
    ECHO NGINX Error Log (ultimas 3 linhas):
    powershell "Get-Content C:\nginx\logs\error.log -Tail 3"
) ELSE (
    ECHO NGINX Error Log: NAO ENCONTRADO
)

ECHO.
ECHO ========================================
ECHO        VERIFICACAO CONCLUIDA
ECHO ========================================
ECHO.

PAUSE