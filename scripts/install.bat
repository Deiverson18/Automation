@echo off
TITLE Instalacao do Sistema Playwright Hub
COLOR 0A
SETLOCAL EnableDelayedExpansion

ECHO ========================================
ECHO    PLAYWRIGHT HUB - INSTALACAO
ECHO ========================================
ECHO.

REM Verificar se esta executando como administrador
net session >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] Este script deve ser executado como Administrador!
    ECHO Clique com botao direito e selecione "Executar como administrador"
    PAUSE
    EXIT /B 1
)

ECHO [INFO] Verificando prerequisitos...
ECHO.

REM Verificar Node.js
ECHO [CHECK] Verificando Node.js...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] Node.js nao encontrado!
    ECHO Por favor, instale Node.js v18 de: https://nodejs.org
    PAUSE
    EXIT /B 1
) ELSE (
    FOR /F "tokens=*" %%i IN ('node -v') DO SET NODE_VERSION=%%i
    ECHO [OK] Node.js encontrado: !NODE_VERSION!
)

REM Verificar NPM
ECHO [CHECK] Verificando NPM...
npm -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] NPM nao encontrado!
    PAUSE
    EXIT /B 1
) ELSE (
    FOR /F "tokens=*" %%i IN ('npm -v') DO SET NPM_VERSION=%%i
    ECHO [OK] NPM encontrado: !NPM_VERSION!
)

ECHO.
ECHO [INFO] Iniciando instalacao...
ECHO.

REM Criar diretorios necessarios
ECHO [STEP] Criando estrutura de diretorios...
IF NOT EXIST "logs" mkdir logs
IF NOT EXIST "temp" mkdir temp
IF NOT EXIST "backup" mkdir backup

REM Instalar dependencias do backend
ECHO [STEP] Instalando dependencias do backend...
cd backend
call npm install --production
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] Falha ao instalar dependencias do backend!
    GOTO ERROR
)
cd ..

REM Instalar dependencias do frontend (ja esta buildado)
ECHO [STEP] Verificando build do frontend...
IF NOT EXIST "dist" (
    ECHO [ERRO] Build do frontend nao encontrado!
    ECHO Execute 'npm run build' primeiro.
    GOTO ERROR
)
ECHO [OK] Build do frontend encontrado.

REM Instalar PM2 globalmente
ECHO [STEP] Instalando PM2 globalmente...
call npm install -g pm2
IF %ERRORLEVEL% NEQ 0 (
    ECHO [AVISO] Falha ao instalar PM2. Continuando...
)

REM Verificar NGINX
ECHO [STEP] Verificando NGINX...
IF NOT EXIST "C:\nginx\nginx.exe" (
    ECHO [AVISO] NGINX nao encontrado em C:\nginx\
    ECHO Por favor, baixe e extraia NGINX de: http://nginx.org/en/download.html
    ECHO Extraia para: C:\nginx\
    ECHO.
    ECHO Pressione qualquer tecla para continuar sem NGINX...
    PAUSE >nul
) ELSE (
    ECHO [OK] NGINX encontrado.
    
    REM Backup da configuracao original do NGINX
    IF EXIST "C:\nginx\conf\nginx.conf" (
        copy "C:\nginx\conf\nginx.conf" "C:\nginx\conf\nginx.conf.backup" >nul
        ECHO [INFO] Backup da configuracao NGINX criado.
    )
    
    REM Copiar nova configuracao
    copy "config\nginx.conf" "C:\nginx\conf\nginx.conf" >nul
    IF %ERRORLEVEL% EQU 0 (
        ECHO [OK] Configuracao NGINX atualizada.
    ) ELSE (
        ECHO [AVISO] Falha ao copiar configuracao NGINX.
    )
)

REM Configurar firewall
ECHO [STEP] Configurando firewall...
netsh advfirewall firewall add rule name="Playwright Hub HTTP" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
netsh advfirewall firewall add rule name="Playwright Hub Backend" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
ECHO [OK] Regras de firewall configuradas.

REM Criar arquivo de configuracao local
ECHO [STEP] Criando configuracao local...
(
ECHO # Configuracao Local - Playwright Hub
ECHO NODE_ENV=production
ECHO PORT=3000
ECHO LOG_LEVEL=info
ECHO LOG_FILE=logs\backend.log
) > .env
ECHO [OK] Arquivo .env criado.

ECHO.
ECHO ========================================
ECHO        INSTALACAO CONCLUIDA!
ECHO ========================================
ECHO.
ECHO Proximos passos:
ECHO 1. Execute: scripts\start.bat
ECHO 2. Acesse: http://localhost
ECHO 3. API: http://localhost/api/health
ECHO.
ECHO Para iniciar automaticamente:
ECHO - Backend: scripts\start-backend.bat
ECHO - NGINX: scripts\start-nginx.bat
ECHO.
GOTO END

:ERROR
ECHO.
ECHO [ERRO] Instalacao falhou!
ECHO Verifique as mensagens de erro acima.
ECHO.
EXIT /B 1

:END
ECHO Pressione qualquer tecla para sair...
PAUSE >nul