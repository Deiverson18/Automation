@echo off
TITLE Instalacao do Sistema Playwright Hub
COLOR 0A
SETLOCAL EnableDelayedExpansion

REM --- Log Configuration ---
SET "LOG_DIR=%~dp0logs"
FOR /F "tokens=1-4 delims=/ " %%a IN ('date /t') DO (SET "CURRENT_DATE=%%c%%b%%a")
FOR /F "tokens=1-3 delims=:." %%a IN ('time /t') DO (SET "CURRENT_TIME=%%a%%b%%c")
SET "LOG_FILE=!LOG_DIR!\install_log_!CURRENT_DATE!_!CURRENT_TIME!.log"

REM Create log directory if it doesn't exist
IF NOT EXIST "!LOG_DIR!" mkdir "!LOG_DIR!"

REM Function to log messages
:_log
ECHO [%DATE% %TIME%] [INFO] %*
ECHO [%DATE% %TIME%] [INFO] %* >> "!LOG_FILE!"
GOTO :EOF

REM Function to log errors
:_log_error
ECHO [%DATE% %TIME%] [ERRO] %*
ECHO [%DATE% %TIME%] [ERRO] %* >> "!LOG_FILE!"
GOTO :EOF

REM --- Script Start ---
CALL :_log "========================================"
CALL :_log "   PLAYWRIGHT HUB - INICIO DA INSTALACAO"
CALL :_log "========================================"
CALL :_log ""

REM Check for Administrator privileges
CALL :_log "Verificando privilegios de Administrador..."
net session >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    CALL :_log_error "Este script deve ser executado como Administrador!"
    CALL :_log_error "Clique com botao direito e selecione 'Executar como administrador'"
    PAUSE
    EXIT /B 1
)
CALL :_log "Privilegios de Administrador OK."
CALL :_log ""

REM --- Prerequisites Check ---
CALL :_log "Verificando prerequisitos..."
CALL :_log ""

REM Check Node.js
CALL :_log "Verificando Node.js..."
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    CALL :_log_error "Node.js nao encontrado!"
    CALL :_log_error "Por favor, instale Node.js v18 de: https://nodejs.org"
    GOTO ERROR
) ELSE (
    FOR /F "tokens=*" %%i IN ('node -v') DO SET NODE_VERSION=%%i
    CALL :_log "Node.js encontrado: !NODE_VERSION!"
)

REM Check NPM
CALL :_log "Verificando NPM..."
npm -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    CALL :_log_error "NPM nao encontrado!"
    GOTO ERROR
) ELSE (
    FOR /F "tokens=*" %%i IN ('npm -v') DO SET NPM_VERSION=%%i
    CALL :_log "NPM encontrado: !NPM_VERSION!"
)
CALL :_log ""

REM --- Installation Steps ---
CALL :_log "Iniciando instalacao..."
CALL :_log ""

REM Create necessary directories
CALL :_log "Criando estrutura de diretorios..."
IF NOT EXIST "logs" mkdir logs
IF NOT EXIST "temp" mkdir temp
IF NOT EXIST "backup" mkdir backup
CALL :_log "Diretorios 'logs', 'temp', 'backup' criados/verificados."

REM Install backend dependencies
CALL :_log "Instalando dependencias do backend..."
cd backend
call npm install --production
IF %ERRORLEVEL% NEQ 0 (
    CALL :_log_error "Falha ao instalar dependencias do backend!"
    cd ..
    GOTO ERROR
)
cd ..
CALL :_log "Dependencias do backend instaladas com sucesso."

REM Verify frontend build
CALL :_log "Verificando build do frontend..."
IF NOT EXIST "dist" (
    CALL :_log_error "Build do frontend nao encontrado!"
    CALL :_log_error "Execute 'npm run build' primeiro."
    GOTO ERROR
)
CALL :_log "Build do frontend encontrado."

REM Install PM2 globally
CALL :_log "Instalando PM2 globalmente..."
call npm install -g pm2
IF %ERRORLEVEL% NEQ 0 (
    CALL :_log_error "Falha ao instalar PM2. Continuando sem PM2."
) ELSE (
    CALL :_log "PM2 instalado com sucesso."
)

REM --- NGINX Configuration ---
CALL :_log "Configurando NGINX..."
SET "NGINX_PATH=C:\nginx"
SET "NGINX_EXE=!NGINX_PATH!\nginx.exe"
SET "NGINX_CONF_DIR=!NGINX_PATH!\conf"
SET "NGINX_CONF_FILE=!NGINX_CONF_DIR!\nginx.conf"
SET "PROJECT_ROOT=%~dp0.."
SET "FRONTEND_DIST_PATH=!PROJECT_ROOT!\dist"

IF NOT EXIST "!NGINX_EXE!" (
    CALL :_log_error "NGINX nao encontrado em !NGINX_PATH!\"
    CALL :_log_error "Por favor, baixe e extraia NGINX de: http://nginx.org/en/download.html"
    CALL :_log_error "Extraia para: !NGINX_PATH!\"
    CALL :_log_error "Continuando sem configurar NGINX."
    SET NGINX_CONFIGURED=false
) ELSE (
    CALL :_log "NGINX encontrado em !NGINX_PATH!."
    SET NGINX_CONFIGURED=true

    REM Backup original NGINX config
    IF EXIST "!NGINX_CONF_FILE!" (
        copy "!NGINX_CONF_FILE!" "!NGINX_CONF_FILE!.backup" >nul
        CALL :_log "Backup da configuracao NGINX original criado: !NGINX_CONF_FILE!.backup"
    )
    
    REM Create temporary NGINX config with dynamic path
    SET "TEMP_NGINX_CONF=!LOG_DIR!\temp_nginx.conf"
    CALL :_log "Gerando configuracao NGINX temporaria com caminho dinamico..."
    (
        FOR /F "usebackq delims=" %%L IN ("config\nginx.conf") DO (
            SET "LINE=%%L"
            SETLOCAL EnableDelayedExpansion
            SET "LINE=!LINE:__PROJECT_ROOT_DIST__=!FRONTEND_DIST_PATH!!"
            ECHO !LINE!
            ENDLOCAL
        )
    ) > "!TEMP_NGINX_CONF!"
    
    REM Copy new NGINX config
    copy "!TEMP_NGINX_CONF!" "!NGINX_CONF_FILE!" >nul
    IF %ERRORLEVEL% EQU 0 (
        CALL :_log "Configuracao NGINX atualizada com sucesso: !NGINX_CONF_FILE!"
    ) ELSE (
        CALL :_log_error "Falha ao copiar configuracao NGINX para !NGINX_CONF_FILE!."
        SET NGINX_CONFIGURED=false
    )
    del "!TEMP_NGINX_CONF!" >nul 2>&1

    IF "!NGINX_CONFIGURED!"=="true" (
        REM Test NGINX configuration
        CALL :_log "Testando configuracao NGINX..."
        cd "!NGINX_PATH!"
        nginx -t 2> "!LOG_DIR!\nginx_test_output.log"
        IF %ERRORLEVEL% EQU 0 (
            CALL :_log "Teste de configuracao NGINX: SUCESSO."
        ) ELSE (
            CALL :_log_error "Teste de configuracao NGINX: FALHA. Verifique !LOG_DIR!\nginx_test_output.log para detalhes."
            SET NGINX_CONFIGURED=false
        )
        cd "!PROJECT_ROOT!"
    )
)
CALL :_log ""

REM Configure firewall
CALL :_log "Configurando firewall..."
netsh advfirewall firewall add rule name="Playwright Hub HTTP" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
netsh advfirewall firewall add rule name="Playwright Hub Backend" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
CALL :_log "Regras de firewall configuradas para portas 80 e 3000."
CALL :_log ""

REM Create local configuration file (.env)
CALL :_log "Criando arquivo de configuracao local (.env)..."
(
ECHO # Configuracao Local - Playwright Hub
ECHO NODE_ENV=production
ECHO PORT=3000
ECHO LOG_LEVEL=info
ECHO LOG_FILE=logs\backend.log
) > .env
CALL :_log "Arquivo .env criado com sucesso."
CALL :_log ""

REM --- Finalization ---
CALL :_log "========================================"
CALL :_log "        INSTALACAO CONCLUIDA!"
CALL :_log "========================================"
CALL :_log ""

CALL :_log "Proximos passos:"
CALL :_log "1. Execute: scripts\start.bat"
CALL :_log "2. Acesse: http://localhost"
CALL :_log "3. API: http://localhost/api/health"
CALL :_log ""
CALL :_log "Para iniciar automaticamente:"
CALL :_log "- Backend: scripts\start-backend.bat"
CALL :_log "- NGINX: scripts\start-nginx.bat"
CALL :_log ""

REM Connectivity Test
CALL :_log "Realizando teste de conectividade (http://localhost)..."
curl -s http://localhost >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    CALL :_log "Teste de conectividade: SUCESSO. O frontend esta acessivel."
) ELSE (
    CALL :_log_error "Teste de conectividade: FALHA. O frontend pode nao estar acessivel. Verifique o NGINX e o backend."
)
CALL :_log ""

GOTO END

:ERROR
CALL :_log_error "========================================"
CALL :_log_error "        INSTALACAO FALHOU!"
CALL :_log_error "========================================"
CALL :_log_error "Verifique as mensagens de erro acima e o arquivo de log: !LOG_FILE!"
CALL :_log_error ""
EXIT /B 1

:END
CALL :_log "Pressione qualquer tecla para sair..."
PAUSE >nul