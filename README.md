# ai-toys

> 你的 **真实小项目** 总文件夹；用 **VibeCoding** 规范跟 Agent 协作开发。  
> **怎么说话 → [DEVELOP.md](./DEVELOP.md)** · **文件说明 → [GUIDE.md](./GUIDE.md)**

## 子项目（都是真项目，不是练习题）

| 项目 | 说明 | 入口 |
|------|------|------|
| [keepmark](./keepmark/) | **线上**英文阅读 Chrome 插件 + 后端 API | [keepmark/README.md](./keepmark/README.md) |
| [true-social](./true-social/) | 社媒运营 + K 线采集 | [true-social/docs/](./true-social/docs/) |

以后新项目也放这里；文档结构可参考 keepmark 的 `memory-bank/`。

## 根目录是什么

```
ai-toys/
├── DEVELOP.md          ★ 跟 Agent 说话（plan / go / fix）
├── GUIDE.md            各文件干啥
├── .cursor/rules/      Agent 自动遵守的规范
├── docs/vibecoding/    完整 SOP（备查）
├── keepmark/           真实项目
└── true-social/        真实项目
```

## 和 VibeCoding 的关系

- **ai-toys 根目录**：通用话术（DEVELOP）+ Agent 规则（`.mdc`）
- **每个子项目**：自己的代码 + `memory-bank/`（产品、API、架构、进度）
- 你在 **真实开发 keepmark** 的过程中，顺便练规范的 VibeCoding 流程

## 纪律

1. 一次只改一个子项目  
2. 大功能先 `keepmark plan` 再 `keepmark go 1`  
3. 改 API/产品前先更新 `memory-bank/` 里对应文档
