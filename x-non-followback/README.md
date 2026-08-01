# X 未回关置顶

一个本地、只读的 Chrome 扩展。你在自己的 X Following 页面正常向下滚动时，它会收集已经加载的账号，并把没有“关注了你 / Follows you”标记的账号集中显示在右上角面板。

## 安装

1. 在 Chrome 地址栏打开 `chrome://extensions`。
2. 打开右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择 `ai-toys/x-non-followback` 目录。
5. 登录 X，打开自己的 `https://x.com/<你的账号>/following`。

修改源码后，在 `chrome://extensions` 中点击本扩展的刷新按钮，再刷新 X 页面。

## 使用

1. 打开自己账号的 Following 页面，右上角会出现“未回关”面板。
2. 正常向下滚动列表；“已扫描”和“未回关”数量会随已加载账号增加。
3. 点击结果中的“打开”可在新标签页查看账号资料，由你自己决定是否取消关注。
4. “暂停扫描”会停止读取新卡片；“继续扫描”会恢复。
5. “清空”需要连续点击两次，只会删除当前 X 账号的本地扫描缓存，并保持暂停。

扫描结果按 X 账号分别保存在 `chrome.storage.local`。刷新页面后可以恢复，但它始终只代表你已经滚动加载过的卡片；扩展无法凭空读取尚未加载的完整 Following 列表。

## 安全边界

- 只请求 `storage` 与 `https://x.com/*` 权限。
- 不要求密码、OAuth、Cookie 或 API Token。
- 不包含后台进程、外部服务、远程脚本、广告或遥测。
- 不调用 X API，也不发送 `fetch`、XHR、WebSocket 或 Beacon 请求。
- 不自动滚动、点击、关注或取消关注。
- 不提供批量取消关注按钮。

这是第三方本地扩展，并非 X 官方产品。虽然它只读页面且不自动操作账号，仍建议安装前直接查看 `manifest.json` 与 `src/` 源码。

## 支持范围

- Chrome 桌面版，Manifest V3。
- X 页面语言：英文、简体中文、繁体中文。
- 只在当前登录账号自己的 `/following` 页面扫描；打开其他人的 Following 页面不会启动。
- 依赖 X 当前的 `data-testid="UserCell"` 和侧栏个人资料链接。回关文案必须在卡片中显示为独立一行；如果 X 修改页面结构，扩展会在连续多轮无法解析卡片时暂停并提示。

## 常见问题

### 页面没有出现面板

确认当前 URL 是你自己的 `https://x.com/<账号>/following`，并在扩展管理页检查该扩展是否允许访问 `x.com`。首次加载或更新扩展后刷新 X 页面。

### 所有人都显示为未回关

先暂停扫描，不要依据结果集中操作。确认 X 卡片仍显示“关注了你 / Follows you”文字；如果 X 更改了文案或结构，需要更新 `src/core.js` 的关系识别规则。

### 提示本地缓存读取、保存或清空失败

扩展会暂停扫描并保留当前页面中的结果，避免把旧缓存覆盖成空数据。确认扩展仍有本地存储权限后点击“继续扫描”重试；读取失败时会重新恢复缓存，保存失败时会重试当前页面结果。

### 怎样扫描全部账号

保持页面打开并手动滚动到列表底部。扩展刻意不提供自动滚动，以降低自动化行为和账号受限风险。

## 开发与验证

无需安装依赖或构建：

```bash
node --test tests/*.test.js
node --check src/core.js
node --check src/panel.js
node --check src/content.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'))"
```

视觉夹具位于 `tests/manual-fixture.html`，可用任意本地静态服务器打开。
