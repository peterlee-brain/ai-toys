# web_ondo

左右对照展示 **Binance RWA** 与 **OKX** 的 Ondo 代币 K 线，对接本地 `svc_ondo`。

## 依赖

- 本机 `svc_ondo` 已启动（默认 `http://127.0.0.1:8040`）
- 已同步至少一只标的的 1m（当前测试常用 `NVDAon`）

## 启动

```bash
cd web_ondo
npm install
npm run dev
```

浏览器打开：http://127.0.0.1:5174

Vite 把 `/v1/*` 代理到 `8040`。若直连后端，可复制 `.env.example` 为 `.env` 并设置 `VITE_API_BASE`。

## 用到的 API

| 能力 | 路径 |
|---|---|
| 资产列表 | `GET /v1/ondo/assets` |
| 市场状态 | `GET /v1/ondo/market/status` |
| 币安 K 线 | `GET /v1/ondo/klines/binance` |
| OKX K 线 | `GET /v1/ondo/klines/okx` |

图表库：[`klinecharts`](https://klinecharts.com/) v10。页面每 60s 自动刷新；更高周期由后端从 1m 聚合。
