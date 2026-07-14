# KeepMark — 架构

> 最后更新：2026-07-11

## 定位

**线上产品**：Chrome 插件读英文网页 + 后端翻译/语法/词库 API。

## 仓库布局

```
keepmark/                          ai-toys 子项目
├── extension/                     插件（WXT + TS）
└── memory-bank/                   文档

peter-sever/app/svc_keepmark/      后端（Go + Kratos + Kimi）
```

## Extension 模块

| 模块 | 职责 |
|------|------|
| content | 选词、Popover、语境 |
| background | 代理 API 请求 |
| popup / sidepanel | 设置、语法、词库 |
| shared/api* | 与后端契约一致 |

## 数据流

```
选词 → content → background → POST /v1/translate（线上 API）
                            → peter-sever/svc_keepmark → Kimi
```

## 关键决策

| 决策 | 理由 |
|------|------|
| 文档集中在 memory-bank | VibeCoding 单一上下文 |
| 后端独立在 peter-sever | 与插件分仓部署 |
