# KeepMark — 测试策略

> 范围：`extension/` 与 `spec/design/` 的验证方式。  
> 目标：让每次 UI 改动都有明确的验证路径，降低 AI 实现时遗漏边界状态的概率。

---

## 1. 测试层级

| 层级 | 对象 | 工具 | 负责人 | 何时运行 |
|------|------|------|--------|----------|
| 类型 / 编译 | `extension/` 全量 TypeScript | `npm run typecheck` | 开发者 / CI | 每次提交 |
| 构建 | 插件产物 | `npm run build` | 开发者 / CI | 涉及构建配置时 |
| 设计稿验证 | `spec/design/design.html` | 浏览器 + 人工走查 | 开发者 / AI | 改 UI 时 |
| 交互走查 | 各 Surface 的验收清单 | 人工按 `spec/ui/*.md` §5 勾选 | 开发者 / Reviewer | 改 UI 后 |
| 手动 E2E | 真实 Chrome 网页 + 侧栏 | Chrome 加载 `extension/dist/` | 发布前 | 发布前 |

---

## 2. 各面测试重点

### Popover

- 拖选单词后约 280ms 内出现 Popover。
- 拖选完整句子**不**出现 Popover，直接打开侧栏「学习」。
- 关闭「选中即翻译」后拖选不弹 Popover。
- 页面滚动时 Popover 跟随选区。
- 不同分辨率下 Popover 不超出视口。

### Side Panel 壳

- 切换 Tab 后刷新仍保持当前 Tab。
- 关闭开关时 Popover 自动关闭。
- 工具栏图标重新打开侧栏后落在上次 Tab。

### 学习 Tab

- 整句选中后自动进入加载态。
- API 失败时显示 Toast 并保持空态/加载态。
- 引用区用 `<strong>` 高亮 `selection`。

### 词库 Tab

- 学习成功后自动有数据。
- 点击 ☆ 不触发展开。
- 已留标词再次点击无网络请求。

---

## 3. 关键测试用例（完整句子判定）

```text
选区 "notwithstanding"                 → 词级，Popover
选区 "notwithstanding prior"             → 短语级，Popover
选区 "notwithstanding prior warnings."   → 句级，Side Panel 学习
选区 "The court ruled that..."（多句）   → 句级，Side Panel 学习
标题 "Contract Law Weekly"              → 短语级，Popover（sentence = 标题块）
按钮 "Learn more"                        → 短语级，Popover（sentence = 按钮文本）
```

---

## 4. 与后端联调

- 本地启动 `peter-sever/app/svc_keepmark` 后，配置 `extension/.env` 的 `VITE_API_BASE_URL`。
- 测试 `POST /v1/translate`、`POST /v1/grammar`、`PUT /v1/words/mark` 字段与类型约定一致。
- 错误码覆盖：400/409/503 等（见后端 `api.md`）。

---

## 5. CI 建议

```bash
cd extension
npm ci
npm run typecheck
npm run build
```

设计稿与 E2E 测试因涉及浏览器，建议本地运行或配 Playwright 后上 CI。
