# true-social

> 社媒运营工具 + Binance 1 分钟 K 线采集服务

## 项目结构

```
true-social/
├── frontend/     # Vite + React 前端（社媒监控面板）
├── backend/      # Go 后端（K 线采集、REST API）
├── agent/        # AI Agent 说明
├── docs/         # 产品、架构、API 文档
├── kline.md      # K 线采集系统架构方案
├── docker-compose.yml
├── start-dev.sh  # 本地开发一键启动
└── start.sh      # 生产启动脚本
```

## 快速开始

```bash
# 复制环境变量模板
cp .env.example .env

# 本地开发（需 Docker 提供 MongoDB / Redis）
./start-dev.sh
```

## 文档

- [产品定义](./docs/product.md)
- [文档索引](./docs/README.md)
- [K 线采集架构](./kline.md)
