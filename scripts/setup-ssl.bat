@echo off
TITLE Configuracao SSL para Nginx
COLOR 0A

ECHO ========================================
ECHO   CONFIGURACAO SSL PARA NGINX
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

REM Verificar se OpenSSL esta disponivel
ECHO [CHECK] Verificando OpenSSL...
openssl version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    ECHO [INFO] OpenSSL nao encontrado, tentando usar certificado do Windows...
    GOTO WINDOWS_CERT
) ELSE (
    FOR /F "tokens=*" %%i IN ('openssl version') DO ECHO [OK] %%i encontrado
    GOTO OPENSSL_CERT
)

:OPENSSL_CERT
ECHO [STEP] Criando certificado SSL com OpenSSL...

REM Criar diretorio SSL no Nginx
SET "NGINX_PATH=C:\nginx"
IF NOT EXIST "%NGINX_PATH%\ssl" mkdir "%NGINX_PATH%\ssl"

REM Gerar chave privada
ECHO [INFO] Gerando chave privada...
openssl genrsa -out "%NGINX_PATH%\ssl\nginx-selfsigned.key" 2048

REM Gerar certificado autoassinado
ECHO [INFO] Gerando certificado autoassinado...
openssl req -new -x509 -key "%NGINX_PATH%\ssl\nginx-selfsigned.key" -out "%NGINX_PATH%\ssl\nginx-selfsigned.crt" -days 365 -subj "/C=BR/ST=SP/L=SaoPaulo/O=PlaywrightHub/OU=IT/CN=192.168.0.19/emailAddress=admin@playwright.local"

ECHO [OK] Certificado SSL criado com sucesso
GOTO CONFIGURE_FIREWALL

:WINDOWS_CERT
ECHO [STEP] Criando certificado SSL com PowerShell...

REM Criar diretorio SSL no Nginx
SET "NGINX_PATH=C:\nginx"
IF NOT EXIST "%NGINX_PATH%\ssl" mkdir "%NGINX_PATH%\ssl"

REM Usar PowerShell para criar certificado autoassinado
powershell -Command "& {$cert = New-SelfSignedCertificate -DnsName '192.168.0.19', 'localhost' -CertStoreLocation 'cert:\LocalMachine\My' -KeyAlgorithm RSA -KeyLength 2048 -Provider 'Microsoft Enhanced RSA and AES Cryptographic Provider' -NotAfter (Get-Date).AddYears(1); $pwd = ConvertTo-SecureString -String 'nginx123' -Force -AsPlainText; Export-PfxCertificate -Cert $cert -FilePath 'C:\nginx\ssl\nginx-cert.pfx' -Password $pwd; $certPath = 'C:\nginx\ssl\nginx-selfsigned.crt'; $keyPath = 'C:\nginx\ssl\nginx-selfsigned.key'; $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert); [System.IO.File]::WriteAllBytes($certPath, $certBytes); $rsa = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert); $keyBytes = $rsa.ExportRSAPrivateKey(); $keyPem = [System.Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks); $keyContent = '-----BEGIN RSA PRIVATE KEY-----' + [Environment]::NewLine + $keyPem + [Environment]::NewLine + '-----END RSA PRIVATE KEY-----'; [System.IO.File]::WriteAllText($keyPath, $keyContent)}"

IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] Certificado SSL criado com PowerShell
) ELSE (
    ECHO [ERRO] Falha ao criar certificado SSL
    PAUSE
    EXIT /B 1
)

:CONFIGURE_FIREWALL
ECHO [STEP] Configurando firewall para HTTPS...

REM Adicionar regra para porta 443
netsh advfirewall firewall add rule name="Playwright Hub HTTPS" dir=in action=allow protocol=TCP localport=443 >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] Regra de firewall para porta 443 adicionada
) ELSE (
    ECHO [AVISO] Falha ao adicionar regra de firewall
)

REM Verificar se as regras existem
ECHO [INFO] Verificando regras de firewall...
netsh advfirewall firewall show rule name="Playwright Hub HTTP" >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    ECHO [OK] Regra HTTP (porta 80) configurada
) ELSE (
    ECHO [INFO] Adicionando regra HTTP...
    netsh advfirewall firewall add rule name="Playwright Hub HTTP" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
)

ECHO.
ECHO [STEP] Verificando certificados criados...
IF EXIST "%NGINX_PATH%\ssl\nginx-selfsigned.crt" (
    ECHO [OK] Certificado encontrado: %NGINX_PATH%\ssl\nginx-selfsigned.crt
) ELSE (
    ECHO [ERRO] Certificado nao encontrado!
)

IF EXIST "%NGINX_PATH%\ssl\nginx-selfsigned.key" (
    ECHO [OK] Chave privada encontrada: %NGINX_PATH%\ssl\nginx-selfsigned.key
) ELSE (
    ECHO [ERRO] Chave privada nao encontrada!
)

ECHO.
ECHO ========================================
ECHO      CONFIGURACAO SSL CONCLUIDA!
ECHO ========================================
ECHO.
ECHO Certificados criados em: %NGINX_PATH%\ssl\
ECHO.
ECHO Proximos passos:
ECHO 1. Execute: scripts\install.bat
ECHO 2. Acesse: https://192.168.0.19
ECHO 3. Aceite o certificado autoassinado no navegador
ECHO.
ECHO IMPORTANTE: O navegador mostrara um aviso de seguranca
ECHO pois o certificado e autoassinado. Clique em "Avancado"
ECHO e depois "Continuar para 192.168.0.19 (nao seguro)"
ECHO.

PAUSE