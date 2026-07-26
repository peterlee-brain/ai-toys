#!/usr/bin/env bash
# 启动 KeepMark 设计稿预览服务器
# 默认监听 9876 端口，可通过环境变量 PORT 覆盖
# 若要让 keepmark.0xpeterlee.xyz 指向本机，需要配置 /etc/hosts 或 DNS

set -euo pipefail

PORT="${PORT:-9877}"
HOST="${HOST:-0.0.0.0}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)/spec/design"

cd "$ROOT"

echo "Starting KeepMark design server on http://$HOST:$PORT"
echo "Design稿入口: http://$HOST:$PORT/design.html"
echo "若已配置 keepmark.0xpeterlee.xyz -> 127.0.0.1，则访问: http://keepmark.0xpeterlee.xyz:$PORT/design.html"

python3 -m http.server "$PORT" --bind "$HOST"
