@echo off
TITLE Teste de Conectividade HTTPS
COLOR 0B

ECHO ========================================
ECHO    TESTE DE CONECTIVIDADE HTTPS
ECHO ========================================
ECHO.

ECHO [TEST] Testando conectividade HTTPS...
ECHO.

REM Testar HTTPS local
ECHO [CHECK] Testando https://localhost...
curl -k -s -o nul -w "Status: %%{http_code} - Tempo: %%{time_total}s\n" https://localhost
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] HTTPS localhost acessivel
) ELSE (
    ECHO [FAIL] HTTPS localhost inacessivel
)

ECHO.

REM Testar HTTPS rede local
ECHO [CHECK] Testando https://192.168.0.19...
curl -k -s -o nul -w "Status: %%{http_code} - Tempo: %%{time_total}s\n" https://192.168.0.19
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] HTTPS rede local acessivel
) ELSE (
    ECHO [FAIL] HTTPS rede local inacessivel
)

ECHO.

REM Testar redirecionamento HTTP
ECHO [CHECK] Testando redirecionamento HTTP para HTTPS...
curl -s -o nul -w "Status: %%{http_code} - Redirect: %%{redirect_url}\n" http://localhost
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] Redirecionamento HTTP funcionando
) ELSE (
    ECHO [FAIL] Redirecionamento HTTP nao funcionando
)

ECHO.

REM Verificar certificado
ECHO [CHECK] Verificando certificado SSL...
IF EXIST "C:\nginx\ssl\nginx-selfsigned.crt" (
    ECHO [OK] Certificado encontrado
    powershell -Command "& {$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('C:\nginx\ssl\nginx-selfsigned.crt'); Write-Host 'Valido ate:' $cert.NotAfter; Write-Host 'Emitido para:' $cert.Subject}"
) ELSE (
    ECHO [FAIL] Certificado nao encontrado
)

ECHO.

REM Verificar portas
ECHO [CHECK] Verificando portas abertas...
netstat -an | findstr :443 >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] Porta 443 (HTTPS) ativa
) ELSE (
    ECHO [FAIL] Porta 443 (HTTPS) inativa
)

netstat -an | findstr :80 >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] Porta 80 (HTTP) ativa
) ELSE (
    ECHO [FAIL] Porta 80 (HTTP) inativa
)

ECHO.

REM Verificar processos NGINX
ECHO [CHECK] Verificando processos NGINX...
tasklist /fi "imagename eq nginx.exe" | findstr nginx >nul
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] NGINX rodando
    tasklist /fi "imagename eq nginx.exe"
) ELSE (
    ECHO [FAIL] NGINX nao esta rodando
)

ECHO.
ECHO ========================================
ECHO        TESTE CONCLUIDO
ECHO ========================================
ECHO.
ECHO Para acessar o sistema:
ECHO 1. Abra o navegador
ECHO 2. Acesse: https://192.168.0.19
ECHO 3. Aceite o certificado autoassinado
ECHO 4. O sistema deve carregar normalmente
ECHO.

PAUSE