# AGENTS.md — X 未回关按钮高亮

本目录是一个无构建步骤的 Manifest V3 Chrome 扩展。

## 启动检查

1. 读 [memory-bank/README.md](./memory-bank/README.md) 找到当前规格、计划与进度真源。
2. 产品与安全边界以 [memory-bank/design.md](./memory-bank/design.md) 为准。
3. 根目录 [PLAN.md](./PLAN.md) 仅保留 `0.1.0` 可见面板的历史实施记录，不代表当前验收要求。

## 工程约束

- 一次只修改 `x-non-followback` 子项目；根 `README.md` 的项目登记除外。
- 保持依赖为零，不增加构建链、后台服务或远程脚本。
- 权限不得超过 `storage` 和 `https://x.com/*`。
- 禁止自动滚动、点击、关注、取消关注或批量操作。
- 页面数据只能写入 `chrome.storage.local`，不得外发。
- 改关系识别、路由或缓存前先写失败测试。

## 质量门禁

```bash
node --test tests/*.test.js
node --check src/core.js
node --check src/panel.js
node --check src/content.js
node -e "JSON.parse(require('node:fs').readFileSync('manifest.json', 'utf8'))"
git diff --check
```

安全能力检查：

```bash
rg -n "fetch\(|XMLHttpRequest|WebSocket|sendBeacon|chrome\.tabs|chrome\.cookies|\.click\(|scroll(To|By|IntoView)?\(" src manifest.json
```

该命令应无匹配。真实 X 验收必须由用户在已登录 Chrome 中加载扩展后完成。
