@echo off
TITLE Backup do Sistema Playwright Hub
COLOR 0D

ECHO ========================================
ECHO     PLAYWRIGHT HUB - BACKUP
ECHO ========================================
ECHO.

SET BACKUP_DATE=%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%
SET BACKUP_TIME=%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
SET BACKUP_DIR=backup\%BACKUP_DATE%_%BACKUP_TIME%

ECHO [INFO] Criando backup em: %BACKUP_DIR%
ECHO.

REM Criar diretorio de backup
IF NOT EXIST "backup" mkdir backup
mkdir "%BACKUP_DIR%"

REM Backup de configuracoes
ECHO [STEP] Fazendo backup das configuracoes...
xcopy "config" "%BACKUP_DIR%\config" /E /I /Q
xcopy ".env" "%BACKUP_DIR%\" /Q 2>nul

REM Backup de scripts customizados
ECHO [STEP] Fazendo backup dos scripts...
xcopy "scripts" "%BACKUP_DIR%\scripts" /E /I /Q

REM Backup de logs importantes
ECHO [STEP] Fazendo backup dos logs...
IF EXIST "logs" xcopy "logs" "%BACKUP_DIR%\logs" /E /I /Q

REM Backup do package.json
ECHO [STEP] Fazendo backup dos package.json...
copy "backend\package.json" "%BACKUP_DIR%\backend-package.json" >nul
copy "package.json" "%BACKUP_DIR%\frontend-package.json" >nul 2>nul

REM Criar arquivo de informacoes do backup
ECHO [STEP] Criando arquivo de informacoes...
(
ECHO Backup criado em: %DATE% %TIME%
ECHO Sistema: Playwright Hub
ECHO Versao: 1.0.0
ECHO.
ECHO Conteudo do backup:
ECHO - Configuracoes (config/)
ECHO - Scripts (scripts/)
ECHO - Logs (logs/)
ECHO - Package.json files
ECHO.
ECHO Para restaurar:
ECHO scripts\restore.bat %BACKUP_DATE%_%BACKUP_TIME%
) > "%BACKUP_DIR%\backup-info.txt"

ECHO.
ECHO ========================================
ECHO        BACKUP CONCLUIDO!
ECHO ========================================
ECHO.
ECHO Local: %BACKUP_DIR%
ECHO.
ECHO Para restaurar este backup:
ECHO scripts\restore.bat %BACKUP_DATE%_%BACKUP_TIME%
ECHO.

PAUSE