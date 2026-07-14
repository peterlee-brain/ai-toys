# KeepMark — 技术栈

> 最后更新：2026-07-11

## Extension

| 层级 | 选型 |
|------|------|
| 运行时 | Chrome Extension MV3 |
| 语言 | TypeScript |
| 构建 | WXT + Vite |
| API 客户端 | `extension/shared/api*.ts` → 线上 REST |

## 后端（peter-sever）

| 层级 | 选型 |
|------|------|
| 服务 | `app/svc_keepmark` |
| 框架 | Go + Kratos |
| AI | Kimi（翻译、语法） |
| 数据库 | 见 memory-bank/data-model.md |

## 验证

```bash
cd keepmark/extension && npm run typecheck && npm run build
cd peter-sever/app/svc_keepmark && go test ./...
```
