# ai-toys

> 你的 **真实小项目** 总文件夹；用 **VibeCoding** 规范跟 Agent 协作开发。  
> **怎么说话 → [DEVELOP.md](./DEVELOP.md)** · **文件说明 → [GUIDE.md](./GUIDE.md)**

## 子项目（都是真项目，不是练习题）

| 项目 | 说明 | 入口 |
|------|------|------|
| [web_value](./web_value/) | 股票财报、股本、分红与 K 线展示页面 | [web_value/](./web_value/) |
| [true-social](./true-social/) | 社媒运营 + K 线采集 | [true-social/docs/](./true-social/docs/) |
| [x-non-followback](./x-non-followback/) | 只读扫描 X Following，点亮未回关按钮，并在 Following 按钮左侧逐个标记序号 | [x-non-followback/README.md](./x-non-followback/README.md) |

KeepMark（Chrome 插件 + 学习站）已迁至 [`../keepmark/`](../keepmark/)。

以后新项目也放这里。

## 根目录是什么

```
ai-toys/
├── DEVELOP.md          ★ 跟 Agent 说话（plan / go / fix）
├── GUIDE.md            各文件干啥
├── .cursor/rules/      Agent 自动遵守的规范
├── docs/vibecoding/    完整 SOP（备查）
└── true-social/        真实项目
```

## 和 VibeCoding 的关系

- **ai-toys 根目录**：通用话术（DEVELOP）+ Agent 规则（`.mdc`）
- **每个子项目**：自己的代码 + `memory-bank/`（产品、API、架构、进度）

## 纪律

1. 一次只改一个子项目  
2. 大功能先 plan 再 go
3. 改 API/产品前先更新 `memory-bank/` 里对应文档
