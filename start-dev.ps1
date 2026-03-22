# Polyphony AI Web - 快速启动脚本
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Polyphony AI Web - 快速启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] 检查依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "正在安装依赖..." -ForegroundColor Green
    npm install
} else {
    Write-Host "依赖已安装" -ForegroundColor Green
}

Write-Host ""
Write-Host "[2/3] 启动开发服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "浏览器将自动打开 http://localhost:3000" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow
Write-Host ""

npm run dev
