# Bird CLI（`bird`）使用文档

> **最后更新：** 2026-05-13  
> **凭证状态：** ✅ 有效

## 简介

[`@steipete/bird`](https://www.npmjs.com/package/@steipete/bird) 提供命令行 **`bird`**：通过浏览器 Cookie（或 CLI 传入的 `auth_token` / `ct0`）访问 X/Twitter 的 **非公开 GraphQL Web 接口**，可读写时间线、书签等。**不需要 X Developer API Key。**

```bash
npm install -g @steipete/bird
# 或一次性运行（推荐与 CI 对齐版本号）
npx --yes @steipete/bird@latest whoami
```

```json
{
  authToken: 'e06a9522803c16b3af59adefbb9496cbca160d61',
  ct0: '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f',
}
```

手动获取：在浏览器登录 [x.com](https://x.com) 后，开发者工具 → Application → Cookies 中读取 `auth_token`、`ct0`。Cookie 会过期，需定期更新。


## 命令一览表
| 命令 | 说明 | 示例 |
|------|------|------|
| `help [command]` | 子命令帮助 | `bird help read` |
| `query-ids` | 查看或刷新缓存的 GraphQL query id | `bird query-ids --fresh` |
| `tweet <text>` | 发送新推文（写操作，慎用） | `bird tweet "hello"` |
| `reply <id-or-url> <text>` | 回复推文（写操作） | `bird reply 123… "ok"` |
| `read <tweet-id-or-url>` | 读取单条推文 | `bird read 1901234567890123456 --json` |
| `replies <tweet-id-or-url>` | 某推文的回复列表 | `bird replies 190… --json` |
| `thread <tweet-id-or-url>` | 完整对话线程 | `bird thread 190… --json` |
| `search <query>` | 搜索推文 | `bird search "比特币" --json` |
| `mentions` | 提及（默认当前登录用户；可用 `--user`） | `bird mentions --json` |
| `bookmarks` | 书签列表（支持文件夹、分页等） | `bird bookmarks --json` |
| `unbookmark <…>` | 取消书签（写操作） | `bird unbookmark 190…` |
| `follow` / `unfollow` | 关注 / 取关（写操作） | `bird follow steipete` |
| `lists` | 自己的 Lists（含 `--member-of` 等） | `bird lists --json` |
| `list-timeline <list-id-or-url>` | 某 List 时间线 | `bird list-timeline 123456 --json` |
| `home` | 主页时间线（`--following` 可切「正在关注」） | `bird home --json` |
| `following` / `followers` | 关注列表 / 粉丝列表（`--user` 查他人） | `bird following --json` |
| `likes` | 点赞列表 | `bird likes --json` |
| `whoami` | 当前凭证对应账号 | `bird whoami` |
| `about <username>` | 账号地区/来源等元数据（非完整 Profile） | `bird about XXY177 --json` |
| `user-tweets <handle>` | 用户时间线 | `bird user-tweets XXY177 --json` |
| `news` / `trending` | Explore 相关资讯/趋势（多 tab、AI 过滤等） | `bird news --ai-only -n 10 --json` |
| `check` | 检查当前可用凭证来源 | `bird check` |

### 快捷方式

```bash
# 读取单条推文（read 的简写）
bird 2040035686104150479 --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
bird https://x.com/user/status/2072894882629448131 --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

## 命令详解（含 2026-05-13 最新执行结果）

以下 JSON 为 **2026-05-13 最新执行结果**，凭证有效。

### 1. whoami - 检查当前登录账号

**命令：**
```bash
bird whoami \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（2026-05-13）：**
```
📍 CLI argument
🙋 @0xziheng (好奇的子恒)
🪪 777044373028483073
⚙️ graphql
🔑 CLI argument
```

---

### 2. read - 读取单条推文详情

**命令：**
```bash
bird read 2073624652417814653 --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
普通文件格式
{
  "id": "2036870207730573382",
  "text": "跟一个香港朋友聊天，也是一样的逻辑，他眼里，香港那么多七八十岁还在开出租车的老人，是真的热爱工作，才去开出租车上班，大陆的都是因为迫于生计，只能出去干活。。。😂。我是想不明白这个逻辑的。",
  "createdAt": "Wed Mar 25 18:17:55 +0000 2026",
  "replyCount": 6,
  "retweetCount": 3,
  "likeCount": 10,
  "conversationId": "2036870207730573382",
  "author": {
    "username": "XXY177",
    "name": "夏雪宜"
  },
  "authorId": "1691056639804399616"
}
文章格式
{
  "id": "2040035686104150479",
  "text": "Circle投研分析-001\n\nxxx",
  "createdAt": "Fri Apr 03 11:56:24 +0000 2026",
  "replyCount": 0,
  "retweetCount": 1,
  "likeCount": 4,
  "conversationId": "2040035686104150479",
  "author": {
    "username": "0xpeterlee",
    "name": "耐心的Peter"
  },
  "authorId": "1717372691270053888",
  "article": {
    "title": "Circle投研分析-001",
    "previewText": "一、价值定位\nCircle是什么？\n美元在数字世界的合规化、可编程、全球可触达的清算层与分发网络。\n1. 解决什么问题？\n根本痛点：传统美元体系与数字经济的断层\n维度 链下传统金融 链上原生金融 断层表现     时空限制"
  }
}
```

### 3. user-tweets - 获取指定用户的推文
todo：确定长文会是什么样
**命令：**
```bash
bird user-tweets BTCdayu --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2054383775422009614",
    "text": "罗老师，快别光做播客了！\n\nAI时代属于你的机会来了，立刻做AI语音输入法，入口级机会（跨APP、跨客户端）。\n\n直立行走解放了双手，让猴子变成了人\n手机捆绑了双手，让人变成对着屏幕呵呵笑的傻逼\nAI输入法将再度解放人类双手！\n\n现在的全是垃圾，最好的产品经理最大的AI机会来了。\n\n期待更多交流。@luoyonghao",
    "createdAt": "Wed May 13 02:10:35 +0000 2026",
    "replyCount": 9,
    "retweetCount": 0,
    "likeCount": 13,
    "conversationId": "2054383775422009614",
    "author": {
      "username": "BTCdayu",
      "name": "宇十一"
    },
    "authorId": "1403881130802225152"
  }
  // ... 更多推文，共返回约 15 条
]
```

> 注：完整返回约 15 条推文，包含长文、图片、引用推文等多种类型。

---

### 4. home - 主页时间线 (For You)

**命令：**
```bash
bird home --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：** 返回主页时间线约 20 条推文，包含 BTCdayu、Colin Wu、Elon Musk、XXY177 等关注用户的推文。

> 注：内容较多，此处省略完整 JSON。包含文本、图片、视频、引用推文等多种类型。

---

### 5. search - 搜索推文

**命令：**
```bash
bird search "比特币" -n 3 --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2054392140202156070",
    "text": "秋の抢庄牌九开云无畏契约真人体育朝のこ百比特币速盈娱乐家乐乐C虚拟币老虎机彩票BA鱼体网赌投欧冠注育と棋牌であ德甲世界杯る亚洲杯。...",
    "createdAt": "Wed May 13 02:43:49 +0000 2026",
    "author": {
      "username": "4ksve",
      "name": "a"
    },
    "authorId": "2040460510026731520"
  },
  {
    "id": "2054391849448870141",
    "text": "#BitMart币市 今日市场快讯｜行情概览...",
    "createdAt": "Wed May 13 02:42:40 +0000 2026",
    "author": {
      "username": "BitMart_zh",
      "name": "BitMart 币市"
    },
    "authorId": "1614893244701343744"
  },
  {
    "id": "2054391525233381857",
    "text": "巴西今天批了比特币挖矿液冷设备进口税豁免...",
    "createdAt": "Wed May 13 02:41:23 +0000 2026",
    "author": {
      "username": "w_USDT_",
      "name": "柠檬橘子"
    },
    "authorId": "1681721607788834816"
  }
]
```

---

### 6. mentions - 获取提及当前用户的推文

**命令：**
```bash
bird mentions --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2037070387293597749",
    "text": "@0xziheng 互相不知道",
    "createdAt": "Thu Mar 26 07:33:21 +0000 2026",
    "author": {
      "username": "XXY177",
      "name": "夏雪宜"
    },
    "authorId": "1691056639804399616"
  }
  // ... 共 4 条提及
]
```

---

### 7. replies - 获取某推文的回复列表

**命令：**
```bash
bird replies 2036870207730573382 --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：** 返回 5 条回复。

---

### 8. thread - 获取完整对话线程

**命令：**
```bash
bird thread 2036870207730573382 --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：** 返回 6 条（原推文 + 5 条回复）。

---

### 9. bookmarks - 获取书签推文

**命令：**
```bash
bird bookmarks --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
[
  {
    "id": "2031005479548461162",
    "text": "https://t.co/X2gLVgVPXz",
    "createdAt": "Mon Mar 09 13:53:35 +0000 2026",
    "replyCount": 5,
    "retweetCount": 1,
    "likeCount": 19,
    "author": {
      "username": "0xpeterlee",
      "name": "耐心的Peter"
    },
    "authorId": "1717372691270053888"
  }
]
```

---

### 10. likes - 获取点赞的推文

**命令：**
```bash
bird likes --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：** 返回约 15 条点赞的推文，包含 0xpeterlee、范冰冰、XXY177、BTCdayu 等用户的内容。

---

### 11. following - 获取关注列表

**命令：**
```bash
bird following --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：** 返回约 40 个关注账号，包括：
- XXY177（夏雪宜）、BTCdayu（宇十一）、范冰冰、Elon Musk
- 华春莹、赵立坚、新华社、BBC 中文、纽约时报中文
- NASA、奥巴马、特朗普、比尔·盖茨、SpaceX
- 币圈账号：Bitwux、Dahuzi_eth、Justin Sun 等

> 注：完整列表包含用户名、简介、粉丝数、关注数、是否蓝 V 等信息。

---

### 12. followers - 获取粉丝列表

**命令：**
```bash
bird followers --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
[
  {
    "id": "1142505181948628993",
    "username": "BTcdayuus",
    "name": "大宇……………",
    "followersCount": 2591,
    "followingCount": 2575,
    "isBlueVerified": false
  },
  {
    "id": "777045102296379392",
    "username": "YongjieQiu",
    "name": "邱邱邱",
    "followersCount": 2,
    "followingCount": 7,
    "isBlueVerified": false
  }
]
```

---

### 13. lists - 获取自己的 Twitter Lists

**命令：**
```bash
bird lists --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
[]
```

> 注：没有创建 Lists，返回空数组。

---

### 14. list-timeline - 获取某个 List 的推文

**命令：**
```bash
bird list-timeline 123456 --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

> 注：需要先知道 List ID，可通过 `bird lists` 获取。

---

### 15. about - 获取用户账户信息

**命令：**
```bash
bird about XXY177 --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
{
  "accountBasedIn": "East Asia",
  "source": "East Asia App Store",
  "createdCountryAccurate": true,
  "locationAccurate": false,
  "learnMoreUrl": "https://help.twitter.com/managing-your-account/about-twitter-verified-accounts"
}
```

---

### 16. trending - 获取 AI 推荐的热门话题

**命令：**
```bash
bird trending --json \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果（JSON）：**
```json
[
  {
    "id": "twitter://trending/2054378381488300503",
    "headline": "Rubio Wears Maduro's Famous Tracksuit on Air Force One",
    "category": "AI · Other",
    "postCount": 19000
  },
  {
    "id": "twitter://trending/2053954443079766091",
    "headline": "Senate Committee Advances CLARITY Act Draft for Crypto Regulation",
    "category": "AI · News",
    "timeAgo": "1 day ago",
    "postCount": 58000
  },
  {
    "id": "twitter://trending/2054301924892049606",
    "headline": "Ronaldo's Al Nassr Heartbroken by Late Own Goal in Riyadh Derby",
    "category": "AI · Sports",
    "timeAgo": "6 hours ago",
    "postCount": 100000
  }
]
```

> 注：共返回约 10 条趋势话题。

---

### 17. check - 检查认证状态

**命令：**
```bash
bird check \
  --auth-token 'e06a9522803c16b3af59adefbb9496cbca160d61' \
  --ct0 '9a6224f82758588ac32868d2a56a2e04c549093a7a48fa1546ea635c18775a9a6952b2cba539d1f7654549154f1a0b1b4698d2f2300520084d58a1c7964afa5203e9c8caaec7e94061cb272043df660f'
```

**返回结果：**
```
ℹ️ Credential check
────────────────────────────────────────
✅ auth_token: e06a952280...
✅ ct0: 9a6224f827...
📍 CLI argument

✅ Ready to tweet!
```

---

## 常用选项（全局与子命令）

| 选项 | 说明 | 示例 |
|------|------|------|
| `--json` | 结构化 JSON 输出 | `bird home --json` |
| `--json-full` | 带 `_raw` 原始响应 | `bird bookmarks --json-full` |
| `-n`, `--count` | 条数上限 | `bird user-tweets XXY177 -n 10 --json` |
| `--max-pages` | 分页上限 | `bird replies 190… --max-pages 3 --json` |
| `--auth-token` / `--ct0` | 显式传入 Cookie | 脚本、与后端 `pkg/bird` 一致 |
| `--cookie-source` | 浏览器 Cookie 来源 | `bird --cookie-source chrome whoami` |
| `--chrome-profile` | Chrome/Chromium 配置 | 见 `bird --help` |
| `--firefox-profile` | Firefox profile 名 | 见 `bird --help` |
| `--timeout` | 请求超时（毫秒） | `bird --timeout 30000 home` |
| `--plain` / `--no-emoji` / `--no-color` | 稳定/无表情/无颜色输出 | CI 日志 |
| `--quote-depth` | 引用推嵌套深度 | 见 `bird --help` |

## 合规与风险说明

通过 Cookie 访问 X 数据未使用官方 API，需自行评估 [X 开发者条款](https://developer.x.com) 与账号安全；勿将 `auth_token` / `ct0` 写入仓库或对外文档。**写操作**（`tweet`、`reply`、`follow` 等）有封号与滥用风险，生产环境请谨慎启用。

## 附录

- **[bird-cli-test-output.txt](./bird-cli-test-output.txt)**：各子命令 `help` 的完整实测输出。
- **[bird-cli-integration-tests.md](./bird-cli-integration-tests.md)**：带鉴权时的集成测试矩阵。
- **`./.bird-credentials.env.example`**：凭证环境变量模板（**勿**把真实值写回 `bird-cli.md`）。
