@echo off
echo.
echo AVISO: este script roda apenas a extracao local da base.
echo Ele NAO executa build, git add, commit ou push.
echo Para o fluxo completo de atualizacao e publicacao, use:
echo   scripts\update.bat
echo.
cd /d "%~dp0"
uv run gerar_base_pc32.py
pause
