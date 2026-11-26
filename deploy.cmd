@echo off
rem 把这个 fork 的改动部署到已安装的 ccdrawu 插件目录
rem 用法：双击，或在 Claude Code 里跑  deploy.cmd
setlocal enabledelayedexpansion

set "CD=%CLAUDE_CONFIG_DIR%"
if "%CD%"=="" set "CD=%USERPROFILE%\.claude"
set "PLUGIN=%CD%\plugins\cache\ccdrawu\ccdrawu\1.4.2"

if not exist "%PLUGIN%" (
  echo 找不到已安装的插件目录：
  echo   %PLUGIN%
  echo 先装一次： claude plugin install ccdrawu@ccdrawu
  exit /b 1
)

echo 目标：%PLUGIN%
copy /Y "%~dp0.claude-plugin\plugin.json" "%PLUGIN%\.claude-plugin\plugin.json" >nul || goto :fail
xcopy "%~dp0hooks" "%PLUGIN%\hooks\" /E /I /Y /Q >nul || goto :fail
xcopy "%~dp0types" "%PLUGIN%\types\" /E /I /Y /Q >nul || goto :fail
echo 完成。
echo 现在到 Claude Code 里执行  /reload-plugins
exit /b 0

:fail
echo 部署失败。
exit /b 1
