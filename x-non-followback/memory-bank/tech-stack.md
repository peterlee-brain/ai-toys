# 技术栈

- Chrome Extension Manifest V3
- 原生 JavaScript（无打包、无框架、无运行时依赖）
- 原生 CSS
- `chrome.storage.local`
- `MutationObserver`
- Node.js 内置 `node:test`

## 兼容与依赖策略

- 目标为当前 Chrome 桌面版。
- 不支持移动端 X App。
- 不使用 X API、OAuth、后台 service worker 或第三方服务。
- 不从 CDN 加载代码、字体、图片或样式。
- 测试和语法检查只需要 Node.js，不需要 `npm install`。
