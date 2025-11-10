#!/bin/bash

# 时光星轨 · 启动脚本
# Our Universe - Romantic Photo Sphere Launcher

# 颜色定义
PURPLE='\033[0;35m'
PINK='\033[0;95m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 清空屏幕
clear

# 显示启动画面
echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║   ✨   时光星轨 · 我们的宇宙   ✨                          ║"
echo "║                                                              ║"
echo "║   在时间的无垠里，我们相遇，星辰为证，时光为鉴             ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# 检查Python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${PINK}❌ 未检测到Python，请安装Python后重试${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 正在启动本地服务器...${NC}"
echo -e "${WHITE}📂 项目目录: $(pwd)${NC}"
echo -e "${WHITE}🌐 访问地址: http://localhost:8080/index-romantic.html${NC}"
echo ""
echo -e "${PINK}💝 请确保浏览器支持WebGL以获得最佳体验${NC}"
echo -e "${PINK}💕 建议使用Chrome、Firefox或Safari${NC}"
echo ""

# 启动服务器
echo -e "${BLUE}✨ 正在编织我们的宇宙...${NC}"

# 检查端口是否被占用
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null; then
    echo -e "${PINK}⚠️  端口8080已被占用，尝试使用8081${NC}"
    PORT=8081
else
    PORT=8080
fi

# 启动HTTP服务器
$PYTHON_CMD -m http.server $PORT &
SERVER_PID=$!

# 等待服务器启动
sleep 2

# 打开浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open "http://localhost:$PORT/index-romantic.html"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:$PORT/index-romantic.html"
    else
        echo -e "${PINK}🔗 请手动访问: http://localhost:$PORT/index-romantic.html${NC}"
    fi
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    start "http://localhost:$PORT/index-romantic.html"
fi

# 显示成功信息
echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}║   ✨   服务器启动成功！   ✨                                ║${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}║   正在等待浏览器打开...                                     ║${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}║   如果浏览器未自动打开，请手动访问：                        ║${NC}"
echo -e "${PURPLE}║   ${WHITE}http://localhost:$PORT/index-romantic.html${PURPLE}            ║${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}║   ${PINK}💕 愿你们的爱情如宇宙般浩瀚，如星辰般永恒 💕${PURPLE}        ║${NC}"
echo -e "${PURPLE}║                                                              ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 等待用户输入
echo -e "${BLUE}按 Ctrl+C 停止服务器${NC}"

# 捕获Ctrl+C
trap "echo ''; echo -e '${PINK}💝 正在关闭服务器...${NC}'; kill $SERVER_PID; exit 0" INT

# 保持运行
wait $SERVER_PID
