# 新开子项目（参考 keepmark）

> keepmark 是 **线上真实项目**；其 `memory-bank/` + `.cursor/rules/` 结构可供 **以后新项目** 参考。

## keepmark 现有结构（可参考）

```
keepmark/
├── extension/         # 或 backend/、frontend/ 等代码
├── memory-bank/       # 产品、API、架构、进度
├── PLAN.md
├── AGENTS.md
└── .cursor/rules/
```

## 新开一个项目时

1. 在 `ai-toys/` 下新建目录
2. 复制 keepmark 的 `memory-bank/`、`.cursor/rules/` 骨架
3. 在根 [README.md](../../README.md) 子项目表登记
4. 用 DEVELOP 话术：`新项目名 plan` → `go 1`

## 与 ai-toys 根目录

| ai-toys/ | 每个子项目/ |
|----------|-------------|
| DEVELOP、SOP、通用 .mdc | 代码 + memory-bank + 专用 .mdc |
