@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BASH_EXE="

if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe"
if not defined BASH_EXE if exist "%ProgramFiles%\Git\usr\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\usr\bin\bash.exe"
if not defined BASH_EXE if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles(x86)%\Git\bin\bash.exe"
if not defined BASH_EXE if exist "%ProgramFiles(x86)%\Git\usr\bin\bash.exe" set "BASH_EXE=%ProgramFiles(x86)%\Git\usr\bin\bash.exe"
if not defined BASH_EXE if exist "%LocalAppData%\Programs\Git\bin\bash.exe" set "BASH_EXE=%LocalAppData%\Programs\Git\bin\bash.exe"
if not defined BASH_EXE if exist "%LocalAppData%\Programs\Git\usr\bin\bash.exe" set "BASH_EXE=%LocalAppData%\Programs\Git\usr\bin\bash.exe"

if not defined BASH_EXE (
    for /f "delims=" %%I in ('where bash 2^>nul') do (
        set "BASH_EXE=%%I"
        goto run_update
    )
)

:run_update
if not defined BASH_EXE (
    echo ERRO: nao foi possivel localizar o bash do Git for Windows.
    echo Instale o Git for Windows ou ajuste o PATH para incluir bash.exe.
    exit /b 1
)

"%BASH_EXE%" "%SCRIPT_DIR%update.sh"
set "EXIT_CODE=%ERRORLEVEL%"
exit /b %EXIT_CODE%
