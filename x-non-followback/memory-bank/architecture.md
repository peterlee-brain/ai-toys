# 架构

## 组件

- `src/core.js`：纯逻辑。识别 Following 路由、个人资料链接和中英文回关标记；解析卡片快照；校验、合并和筛选缓存状态。
- `src/panel.js`：只负责固定面板的 DOM 与交互，不读取 X 页面、不访问存储。
- `src/content.js`：验证“自己的 Following 页面”，读取 X 已加载的用户卡片，协调本地存储、扫描生命周期和面板。
- `src/styles.css`：所有选择器均限定在 `#x-non-followback-root` 下，避免污染 X 页面。

## 数据流

```text
用户手动滚动
  → X 加载 UserCell
  → content.js 生成有限快照
  → core.js 解析并按 handle 去重
  → chrome.storage.local 按当前账号保存
  → panel.js 只渲染 followsBack=false 的账号
```

## 页面生命周期

扩展通过 X 侧栏的 `AppTabBar_Profile_Link` 识别登录账号，并与当前 `/following` URL 比较。只有两者一致才创建运行时和面板。X 单页路由变化时，文档观察器重新检查上下文；离开自己的 Following 页面会断开卡片观察器、写入待保存状态并销毁面板。

用户卡片可能被 X 的虚拟列表复用，因此扫描器用 `WeakMap` 保存“DOM 节点 → 当前内容签名”。节点内容换成新账号或稍后补上回关标记时会重新解析，完全相同的内容不会重复处理。

## 故障边界

- 连续五个 `UserCell` 无法解析 handle 时暂停扫描，避免把页面结构变化静默转成错误结果。
- 缓存带版本和 owner handle；版本或账号不匹配时返回空状态。
- 清空动作需要面板内二次点击，只删除当前账号缓存，并保持暂停。
- 面板所有账号数据用 `textContent` 和重建后的 `https://x.com/<handle>` 链接渲染。
