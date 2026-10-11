@echo off
set "PATH=%~dp0tools\node;%PATH%"
call "%~dp0tools\node\npm.cmd" %*
