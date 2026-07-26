# KeepMark · 留标

> Chrome 插件：在英文网页选中即译、按需学习、☆ 留标。

## 代码在哪

| 部分 | 路径 |
|------|------|
| Chrome 插件 | [extension/](./extension/) |
| 前端规格 + 交互设计稿 | [spec/](./spec/) |
| API 契约 | [peter-sever/spec/svc_keepmark/api.md](../../../peter-sever/spec/svc_keepmark/api.md) |

## 本地开发

```bash
cd extension
npm install
npm run dev          # 或 npm run build
npm run typecheck
```

Chrome 加载 `extension/dist/`。API 默认见 `extension/shared/api-base.ts`（可配 `VITE_API_BASE_URL`）。

## 设计稿预览

```bash
# 方式 1：脚本启动（推荐）
./scripts/start-design-server.sh

# 方式 2：手动启动
cd spec/design && python3 -m http.server 9877 --bind 0.0.0.0
```

默认访问：
- 本地：`http://localhost:9877/design.html`
- 同局域网：`http://<本机IP>:9877/design.html`

### 绑定域名 keepmark.0xpeterlee.xyz

本地开发时，让域名指向本机：

```bash
sudo sh -c 'echo "127.0.0.1 keepmark.0xpeterlee.xyz" >> /etc/hosts'
```

然后访问：`http://keepmark.0xpeterlee.xyz:9877/design.html`

如果是真实域名（已拥有 0xpeterlee.xyz），把 DNS A 记录指向服务器 IP，将 `spec/design/` 下的文件部署到 Web 服务器（nginx / cdn），并直接访问 `https://keepmark.0xpeterlee.xyz/design.html`。

## 文档

1. [spec/architecture.md](./spec/architecture.md) — 前端总纲
2. [spec/ui/](./spec/ui/README.md) — 按界面面：Popover / 学习 / 词库
3. [spec/ui/design.md](./spec/ui/design.md) — 设计稿的 AI 可读规格
4. [spec/product.md](./spec/product.md) — 产品
5. API 契约：[peter-sever/spec/svc_keepmark/api.md](../../../peter-sever/spec/svc_keepmark/api.md)

## 结构

```text
keepmark/
├── spec/              # 前端规格 + 交互设计稿
│   ├── architecture.md
│   ├── ui/
│   ├── product.md
│   └── design/
├── extension/         # Chrome MV3 插件
├── AGENTS.md
└── README.md
```
