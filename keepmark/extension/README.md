# KeepMark Extension

Chrome 浏览器插件（Manifest V3），**演示版 · 本地 mock 数据**，无需后端。

## 功能（当前 demo）

- 在任意英文网页 **拖选文字** → 约 300ms 后自动弹出翻译 Popover
- Popover：**语法** / **☆ 留标** / **关闭**
- **Side Panel**：语法讲解 + 句内词库（降噪规则与 ui-preview 一致）
- 数据保存在 `chrome.storage.local`

试试选中：`notwithstanding`、`proliferation`

## 本地加载（推荐）

```bash
cd extension
npm install
npm run build
```

1. 打开 Chrome：`chrome://extensions`
2. 开启右上角 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择目录：`extension/dist/chrome-mv3`

**重要：** 修改代码后需重新 `npm run build`，并在 `chrome://extensions` 点击扩展的 **刷新** 按钮，然后 **刷新测试网页**（F5）。

## 测试页面

请在 **http/https 英文网页** 上测试（如 Wikipedia、BBC）。以下页面 **不支持**：

- `chrome://` 开头（含扩展管理页）
- 未勾选「允许访问文件网址」时的本地 `file://` 文件

## 仍无 Popover？

1. 点击扩展图标 → 确认 **「选中即翻译」** 开关为蓝色（开启）
2. F12 打开开发者工具 → Console 看是否有 `[KeepMark]` 或报错
3. 在扩展详情页点 **「重新加载」**，再刷新网页
4. 右键选中文本 → 试 **KeepMark · 翻译选中文本**

## 快捷键

| 快捷键 | 作用 |
|--------|------|
| `Alt+G` | 打开语法 Side Panel |
| `Alt+S` | 留标当前选中词 |
| `Esc` | 关闭 Popover |

## 目录

```
extension/
├── entrypoints/     # background / content / popup / sidepanel
├── shared/          # mock 词典、storage、业务逻辑
├── assets/styles/   # UI 样式
├── docs/            # ui-spec.md、ui-preview.html（静态预览）
└── dist/            # build 产物（gitignore）
```

UI 静态预览（非插件）：用浏览器打开 `docs/ui-preview.html`。
