@echo off
TITLE Teste de Instalacao
COLOR 0E

ECHO ========================================
ECHO    TESTE DE INSTALACAO
ECHO ========================================
ECHO.

ECHO [TEST] Verificando Node.js...
node -v
IF %ERRORLEVEL% NEQ 0 (
    ECHO [FAIL] Node.js nao encontrado
) ELSE (
    ECHO [PASS] Node.js OK
)

ECHO [TEST] Verificando NPM...
npm -v
IF %ERRORLEVEL% NEQ 0 (
    ECHO [FAIL] NPM nao encontrado
) ELSE (
    ECHO [PASS] NPM OK
)

ECHO [TEST] Verificando NGINX...
IF EXIST "C:\nginx\nginx.exe" (
    ECHO [PASS] NGINX encontrado
) ELSE (
    ECHO [FAIL] NGINX nao encontrado
)

ECHO [TEST] Verificando build do frontend...
IF EXIST "dist\index.html" (
    ECHO [PASS] Frontend build OK
) ELSE (
    ECHO [FAIL] Frontend build nao encontrado
)

ECHO [TEST] Verificando dependencias do backend...
IF EXIST "backend\node_modules" (
    ECHO [PASS] Dependencias do backend OK
) ELSE (
    ECHO [FAIL] Dependencias do backend nao encontradas
)

ECHO.
ECHO Teste concluido!
PAUSE