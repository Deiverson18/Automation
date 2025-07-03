@echo off
TITLE Inicializacao do Sistema Playwright Hub
COLOR 0B

ECHO ========================================
ECHO    PLAYWRIGHT HUB - INICIALIZACAO
ECHO ========================================
ECHO.

REM Verificar se esta executando como administrador
net session >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [AVISO] Recomendado executar como Administrador para melhor funcionamento.
    ECHO.
)

ECHO [INFO] Iniciando servicos...
ECHO.

REM Verificar se o backend ja esta rodando
ECHO [CHECK] Verificando se backend ja esta ativo...
netstat -an | findstr :3000 >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [INFO] Backend ja esta rodando na porta 3000.
) ELSE (
    ECHO [STEP] Iniciando backend...
    
    REM Tentar usar PM2 primeiro
    pm2 -v >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        ECHO [INFO] Usando PM2 para gerenciar o backend...
        pm2 start config\pm2.config.js
        IF %ERRORLEVEL% EQU 0 (
            ECHO [OK] Backend iniciado com PM2.
        ) ELSE (
            ECHO [AVISO] Falha ao usar PM2, iniciando diretamente...
            GOTO START_DIRECT
        )
    ) ELSE (
        :START_DIRECT
        ECHO [INFO] Iniciando backend diretamente...
        cd backend
        start "Playwright Hub Backend" cmd /k "npm start"
        cd ..
        ECHO [OK] Backend iniciado em nova janela.
        
        REM Aguardar o backend inicializar
        ECHO [INFO] Aguardando backend inicializar...
        timeout /t 5 /nobreak >nul
    )
)

REM Verificar se NGINX ja esta rodando
ECHO [CHECK] Verificando se NGINX ja esta ativo...
tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [INFO] NGINX ja esta rodando.
) ELSE (
    IF EXIST "C:\nginx\nginx.exe" (
        ECHO [STEP] Iniciando NGINX...
        cd C:\nginx
        start "" nginx.exe
        cd %~dp0..
        
        REM Aguardar NGINX inicializar
        timeout /t 3 /nobreak >nul
        
        REM Verificar se NGINX iniciou corretamente
        tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
        IF %ERRORLEVEL% EQU 0 (
            ECHO [OK] NGINX iniciado com sucesso.
        ) ELSE (
            ECHO [ERRO] Falha ao iniciar NGINX.
            ECHO Verifique os logs em: C:\nginx\logs\error.log
        )
    ) ELSE (
        ECHO [AVISO] NGINX nao encontrado em C:\nginx\
        ECHO O sistema funcionara apenas na porta 3000.
    )
)

ECHO.
ECHO [INFO] Verificando status dos servicos...

REM Verificar backend
netstat -an | findstr :3000 >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] Backend ativo na porta 3000
) ELSE (
    ECHO [ERRO] Backend nao esta respondendo na porta 3000
)

REM Verificar NGINX
netstat -an | findstr :80 >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] NGINX ativo na porta 80
) ELSE (
    ECHO [AVISO] NGINX nao esta respondendo na porta 80
)

ECHO.
ECHO ========================================
ECHO         SISTEMA INICIADO!
ECHO ========================================
ECHO.
ECHO URLs de acesso:
ECHO - Principal: http://localhost
ECHO - Dashboard: http://localhost/dashboard
ECHO - API: http://localhost/api/health
ECHO - Backend direto: http://localhost:3000
ECHO.
ECHO Comandos uteis:
ECHO - Parar: scripts\stop.bat
ECHO - Reiniciar: scripts\restart.bat
ECHO - Status: scripts\status.bat
ECHO - Logs: scripts\logs.bat
ECHO.

REM Tentar abrir o navegador
ECHO [INFO] Abrindo navegador...
start http://localhost

ECHO.
ECHO Pressione qualquer tecla para sair...
PAUSE >nul