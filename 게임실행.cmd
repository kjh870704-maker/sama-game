@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 이상을 먼저 설치해 주세요.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci --cache .npm-cache
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo 사마의전을 시작합니다. 이 창을 닫으면 게임 서버가 종료됩니다.
call npm run dev -w @sama/web -- --open
if errorlevel 1 pause
