@echo off
echo ========================================
echo Polyphony AI Web - 快速启动
echo ========================================
echo.

echo [1/3] 检查依赖...
cd /d "%~dp0"
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
) else (
    echo 依赖已安装
)

echo.
echo [2/3] 启动开发服务器...
echo.
echo 浏览器将自动打开 http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

call npm run dev
