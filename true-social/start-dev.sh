#!/bin/bash

# 快速开发：后端 + 前端（不强制 Docker；Mongo/Redis 需自行可用）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 启动 true-social（开发模式）..."
echo ""

echo "🔨 构建后端..."
cd "$PROJECT_DIR/backend"
/usr/local/go/bin/go build -o svc-kline ./cmd/svc-kline
echo -e "${GREEN}✅ 后端构建完成${NC}"

echo ""
echo "📡 启动后端服务..."

if lsof -ti:8080 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  后端已在 8080 端口运行${NC}"
else
    cd "$PROJECT_DIR/backend"
    ./svc-kline -conf configs/config.yaml &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ 后端已启动 (PID: $BACKEND_PID)${NC}"

    echo "⏳ 等待后端就绪..."
    for i in {1..15}; do
        if curl -s "http://127.0.0.1:8080/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 后端服务已就绪${NC}"
            break
        fi
        sleep 1
    done
fi

echo ""
echo "🎨 启动前端..."
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

echo ""
echo -e "${GREEN}===============================================${NC}"
echo -e "${GREEN}🎉 开发环境就绪${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo "  📱 前端: http://127.0.0.1:5173"
echo "  📡 后端: http://127.0.0.1:8080"
echo "  📚 文档: $PROJECT_DIR/docs/README.md"
echo ""
echo -e "${YELLOW}按 Ctrl+C 退出${NC}"
echo ""

cleanup() {
    echo ""
    echo "🛑 正在停止..."
    if [ -n "${BACKEND_PID:-}" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
        echo "  ✅ 后端已停止"
    fi
    echo -e "${GREEN}👋 已退出${NC}"
}
trap cleanup INT EXIT

npm run dev
