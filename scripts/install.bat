@echo off
TITLE Instalacao Playwright Hub
COLOR 0A

ECHO ========================================
ECHO   PLAYWRIGHT HUB - INSTALACAO
ECHO ========================================
ECHO.

REM Verificar privilegios de administrador
net session >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] Execute como Administrador!
    ECHO Clique com botao direito e selecione "Executar como administrador"
    PAUSE
    EXIT /B 1
)

ECHO [OK] Privilegios de administrador verificados
ECHO.

REM Verificar Node.js
ECHO [CHECK] Verificando Node.js...
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] Node.js nao encontrado!
    ECHO Baixe e instale Node.js v18 de: https://nodejs.org
    PAUSE
    EXIT /B 1
)
FOR /F "tokens=*" %%i IN ('node -v') DO ECHO [OK] Node.js %%i encontrado

REM Verificar NPM
ECHO [CHECK] Verificando NPM...
npm -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] NPM nao encontrado!
    PAUSE
    EXIT /B 1
)
FOR /F "tokens=*" %%i IN ('npm -v') DO ECHO [OK] NPM %%i encontrado
ECHO.

REM Criar diretorios necessarios
ECHO [STEP] Criando diretorios...
IF NOT EXIST "logs" mkdir logs
IF NOT EXIST "temp" mkdir temp
IF NOT EXIST "backup" mkdir backup
ECHO [OK] Diretorios criados

REM Instalar dependencias do backend
ECHO [STEP] Instalando dependencias do backend...
cd backend
call npm install --silent
IF %ERRORLEVEL% NEQ 0 (
    ECHO [ERRO] Falha ao instalar dependencias do backend!
    cd ..
    PAUSE
    EXIT /B 1
)
cd ..
ECHO [OK] Dependencias do backend instaladas

REM Verificar build do frontend
ECHO [STEP] Verificando build do frontend...
IF NOT EXIST "dist" (
    ECHO [ERRO] Build do frontend nao encontrado!
    ECHO Execute 'npm run build' primeiro
    PAUSE
    EXIT /B 1
)
ECHO [OK] Build do frontend encontrado

REM Instalar PM2
ECHO [STEP] Instalando PM2...
call npm install -g pm2 --silent
IF %ERRORLEVEL% NEQ 0 (
    ECHO [AVISO] Falha ao instalar PM2, continuando...
) ELSE (
    ECHO [OK] PM2 instalado
)

REM Configurar NGINX
ECHO [STEP] Configurando NGINX...
SET "NGINX_PATH=C:\nginx"
SET "PROJECT_ROOT=%~dp0.."

IF NOT EXIST "%NGINX_PATH%\nginx.exe" (
    ECHO [AVISO] NGINX nao encontrado em %NGINX_PATH%
    ECHO Baixe NGINX de: http://nginx.org/en/download.html
    ECHO Extraia para: %NGINX_PATH%
    ECHO Sistema funcionara apenas na porta 3000
    SET NGINX_OK=false
) ELSE (
    ECHO [OK] NGINX encontrado

    REM Verificar se SSL foi configurado
    IF NOT EXIST "%NGINX_PATH%\ssl\nginx-selfsigned.crt" (
        ECHO [INFO] Certificados SSL nao encontrados
        ECHO [INFO] Executando configuracao SSL...
        call scripts\setup-ssl.bat
        IF %ERRORLEVEL% NEQ 0 (
            ECHO [ERRO] Falha na configuracao SSL
            SET NGINX_OK=false
            GOTO SKIP_NGINX
        )
    ) ELSE (
        ECHO [OK] Certificados SSL encontrados
    )

    REM Backup da configuracao original
    IF EXIST "%NGINX_PATH%\conf\nginx.conf" (
        copy "%NGINX_PATH%\conf\nginx.conf" "%NGINX_PATH%\conf\nginx.conf.backup" >nul 2>&1
    )

    REM Criar configuracao personalizada
    SET "DIST_PATH=%PROJECT_ROOT%\dist"
    SET "DIST_PATH=%DIST_PATH:\=/%"
    
    ECHO [INFO] Caminho do frontend: %DIST_PATH%
    
    powershell -Command "(Get-Content 'config\nginx.conf') -replace '__PROJECT_ROOT_DIST__', '%DIST_PATH%' | Set-Content 'temp\nginx.conf'"
    
    ECHO [INFO] Conteudo da configuracao gerada:
    ECHO ----------------------------------------
    type temp\nginx.conf | findstr "root"
    ECHO ----------------------------------------
    
    REM Copiar nova configuracao
    copy "temp\nginx.conf" "%NGINX_PATH%\conf\nginx.conf" >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        ECHO [OK] Configuracao NGINX atualizada
        
        REM Testar configuracao
        cd "%NGINX_PATH%"
        nginx -t >nul 2>&1
        IF %ERRORLEVEL% EQU 0 (
            ECHO [OK] Configuracao NGINX valida
            
            REM Parar NGINX se estiver rodando
            tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
            IF %ERRORLEVEL% EQU 0 (
                ECHO [INFO] Parando NGINX existente...
                nginx -s quit >nul 2>&1
                timeout /t 3 /nobreak >nul
            )
            
            REM Iniciar NGINX
            ECHO [INFO] Iniciando NGINX com configuracao HTTPS...
            start "" nginx.exe
            timeout /t 3 /nobreak >nul
            
            REM Verificar se NGINX iniciou
            tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
            IF %ERRORLEVEL% EQU 0 (
                ECHO [OK] NGINX iniciado com configuracao HTTPS
                SET NGINX_OK=true
            ) ELSE (
                ECHO [ERRO] Falha ao iniciar NGINX
                ECHO [INFO] Verificando logs de erro...
                IF EXIST "logs\error.log" type logs\error.log | findstr /C:"[error]" | tail -5
                SET NGINX_OK=false
            )
            
        ) ELSE (
            ECHO [ERRO] Configuracao NGINX invalida
            ECHO [INFO] Testando configuracao...
            nginx -t
            SET NGINX_OK=false
        )
        cd "%PROJECT_ROOT%"
    ) ELSE (
        ECHO [ERRO] Falha ao copiar configuracao NGINX
        SET NGINX_OK=false
    )
    
    del "temp\nginx.conf" >nul 2>&1
)

:SKIP_NGINX

REM Configurar firewall
ECHO [STEP] Configurando firewall...
netsh advfirewall firewall add rule name="Playwright Hub HTTP" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
netsh advfirewall firewall add rule name="Playwright Hub HTTPS" dir=in action=allow protocol=TCP localport=443 >nul 2>&1
netsh advfirewall firewall add rule name="Playwright Hub Backend" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
ECHO [OK] Firewall configurado

REM Criar arquivo .env
ECHO [STEP] Criando configuracao local...
(
ECHO NODE_ENV=production
ECHO PORT=3000
ECHO LOG_LEVEL=info
ECHO LOG_FILE=logs\backend.log
ECHO HTTPS_ENABLED=true
ECHO SSL_CERT_PATH=C:\nginx\ssl\nginx-selfsigned.crt
ECHO SSL_KEY_PATH=C:\nginx\ssl\nginx-selfsigned.key
) > .env
ECHO [OK] Arquivo .env criado

ECHO.
ECHO ========================================
ECHO      INSTALACAO CONCLUIDA!
ECHO ========================================
ECHO.

IF "%NGINX_OK%"=="true" (
    ECHO [INFO] Sistema configurado com NGINX HTTPS
    ECHO.
    ECHO URLs de acesso:
    ECHO - HTTPS Local: https://localhost
    ECHO - HTTPS Rede: https://192.168.0.19
    ECHO - HTTP (redireciona): http://localhost
    ECHO - HTTP Rede (redireciona): http://192.168.0.19
    ECHO.
    ECHO [INFO] Testando conectividade HTTPS...
    timeout /t 3 /nobreak >nul
    curl -k -s https://localhost >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        ECHO [OK] HTTPS local acessivel
    ) ELSE (
        ECHO [AVISO] HTTPS local pode nao estar acessivel ainda
    )
    
    ECHO.
    ECHO IMPORTANTE:
    ECHO - O navegador mostrara aviso de certificado autoassinado
    ECHO - Clique em "Avancado" e "Continuar para o site"
    ECHO - O certificado e valido por 1 ano
    
) ELSE (
    ECHO [INFO] Sistema configurado sem NGINX
    ECHO Acesse: http://localhost:3000
)

ECHO.
ECHO Proximos passos:
ECHO 1. Execute: scripts\start.bat
ECHO 2. Verifique: scripts\status.bat
ECHO 3. Logs: scripts\logs.bat
ECHO.

PAUSE