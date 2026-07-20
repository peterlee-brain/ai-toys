#!/bin/bash

# 若后端未运行则编译并启动，然后启动前端

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "🚀 启动 true-social..."

if ! curl -s "http://127.0.0.1:8080/api/health" > /dev/null 2>&1; then
    echo "📡 启动后端..."
    cd "$BACKEND_DIR"
    /usr/local/go/bin/go build -o svc-kline ./cmd/svc-kline
    ./svc-kline -conf configs/config.yaml &
    sleep 2
else
    echo "✅ 后端已在运行"
fi

echo "🎨 启动前端..."
cd "$FRONTEND_DIR"
trap 'kill $(jobs -p) 2>/dev/null; exit' INT
npm run dev
