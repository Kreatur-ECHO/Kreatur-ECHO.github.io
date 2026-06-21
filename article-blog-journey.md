# 从零手搓个人博客：一份完整的全栈实践报告

> 一台电脑，一个域名，几行代码。没有框架，没有构建工具，没有第三方评论服务。
> 上线 12 天，从 `index.html` 到一个五脏俱全的博客系统。

## 项目速览

| | |
|---|---|
| **线上地址** | [kreatur-echo.github.io](https://kreatur-echo.github.io/) |
| **技术栈** | HTML + CSS + JS（零框架）/ Node.js SCF / 腾讯云 COS |
| **代码量** | ~5000 行（前端 ~3500 + 后端 ~500 + 配置 ~1000） |
| **开发周期** | 12 天（2026-06-08 ~ 06-21），约 50+ 次提交 |

## 为什么不用框架？

这是这个项目最常被问到的问题。答案很简单：**我想知道自己能走多远**。

当你只用 HTML/CSS/JS 裸写一个博客时，你会被迫理解每一行代码。没有 `npm install` 来救场，没有 `create-react-app` 来生成脚手架。路由要自己写，状态要自己管，评论系统要从零设计。这个过程痛苦但扎实。

而且结果是值得的：**页面加载不到 300ms，无任何外部运行时依赖，GitHub Pages 一键部署**。

---

## 架构全景

```
blog/
├── index.html              # 单页入口，SPA 路由
├── css/
│   ├── themes.css           # 亮/暗主题变量（CSS 变量方案）
│   ├── style.css            # 全部布局和组件样式（~2500 行）
│   └── admin.css            # 管理面板样式
├── js/
│   ├── theme.js             # 主题管理器（亮/暗切换 + localStorage）
│   ├── github.js            # GitHub API 封装（含 Bearer Token 认证）
│   ├── renderer.js          # HTML 组件渲染器 + 排序/过滤逻辑
│   ├── comments.js          # 评论系统（API + 本地回退 + 点赞去重）
│   ├── effects.js           # Canvas 粒子系统 + 点击波纹
│   ├── admin.js             # 在线文章管理（GitHub API 直写）
│   └── main.js              # 主入口 + 事件绑定 + 音乐播放器
├── data/
│   ├── config.js            # 网站配置（单文件，改一处全局生效）
│   ├── posts.js             # 文章数据（JS 数组，可直接编辑）
│   └── comments.json        # 评论快照（GitHub Action 定时更新）
├── scf/
│   └── app.js               # SCF Web 函数完整代码（Node.js 18，6 个路由）
└── .github/workflows/
    ├── deploy.yml            # Pages 自动部署
    └── fetch-comments.yml    # 每 10 分钟抓取 Issue 评论
```

### 设计原则

1. **数据与逻辑分离**：`data/` 下是纯数据文件，`js/` 下只放逻辑
2. **配置集中化**：`data/config.js` 一个文件控制全站参数
3. **渐进增强**：核心功能不依赖 JS（如评论有 JSON 回退），JS 挂了也能看
4. **零外部依赖**：不仅是前端，SCF 后端也只用 Node.js 内置模块（`http`, `https`, `crypto`）

---

## 功能清单

### 📝 博客引擎
- SPA 哈希路由（`#`, `#post/<id>`, `#admin`）
- 文章排序（最新 / 最多浏览），星标置顶
- 标签溢出自动检测 + 裁剪
- 文章卡片固定高度 + 渐变遮罩渐隐
- Archive 时间线折叠
- 手机端独立响应式布局（640px 断点）

### 💬 评论 + 点赞
- 浏览器直连 GitHub Issues API，实时零延迟
- 本地 JSON 回退（GitHub Action 每 10 分钟维护）
- 双层点赞去重：前端 `localStorage` + 后端 SCF IP MD5
- 简易 Markdown 渲染

### 🎵 音乐播放器
- 右下角旋转黑胶唱片，展示网易云歌单封面
- Hover 弹出全部 5 首歌列表，当前播放紫色高亮
- 点击切换播放/暂停，列表循环自动切歌
- 72 根音柱可视化：低频暖紫 / 中频亮紫 / 高频冷蓝，播放时随机跳动
- 页面导航保持播放状态不中断
- 淡入淡出音量控制

### ✨ 视觉特效
- Canvas 粒子系统（鼠标跟随 + 点击波纹扩散）
- 手机端自动关闭 Canvas（`matchMedia` 检测，省电）
- 亮/暗主题切换（CSS 变量方案 + `localStorage`）

### 🛠️ 在线管理
- `#admin` 面板：GitHub API 直写，在线编辑/新增/删除文章
- 自动序列化 `posts.js`，表单验证非空
- 发布后自动刷新

### 📊 数据统计
- 全站访问计数（SCF + COS，每日 IP 去重）
- 单篇文章浏览计数
- 评论点赞计数

---

## 踩坑记录（技术亮点）

### 1. COS 签名：一个 hex 引发的血案

SCF 写 COS 需要自己做 HMAC-SHA1 签名。最坑的一点：

```js
// ❌ 错误：digest() 返回 Buffer，用作第二次 HMAC 的 key 会出错
const signKey = crypto.createHmac('sha1', SECRET_KEY)
  .update(keyTime).digest();

// ✅ 正确：digest('hex') 得到 hex 字符串
const signKey = crypto.createHmac('sha1', SECRET_KEY)
  .update(keyTime).digest('hex');
```

腾讯云 SDK 的 `signHeaders` 白名单只包含 `host`，不在白名单的头签了也会被拒。调试这个花了整整一下午。

### 2. IP 去重陷阱：代理链

`x-forwarded-for` 的值是 `客户端, 代理1, 代理2, 代理3`——如果你直接对整个字符串做 MD5，同一个用户每次请求都会因为代理层 IP 变化而生成不同的哈希，IP 去重完全失效。

```js
// ❌ 取了整个代理链
const ip = req.headers['x-forwarded-for'];

// ✅ 只取第一个真实客户端 IP
const ip = req.headers['x-forwarded-for'].split(',')[0].trim();
```

### 3. 网易云音乐：从 Cookie 地狱到公开歌单

这是整个项目最曲折的技术问题，值得展开讲讲。

**第一代（Cookie 方案）**：SCF 环境变量存 `MUSIC_U` Cookie，调用网易云 API 获取红心歌单。问题：Cookie 每 1-3 个月过期，需要手动更新。

**第二代（自动登录）**：实现 WeAPI 加密（AES-128-CBC + RSA BigInt pow-mod），Cookie 过期时自动手机号登录续期。写了 ~150 行加密代码。部署后发现：
- Cookie 返回 `-447`（反爬拦截）→ 修触发条件，从只匹配 `20001` 扩大到所有非 200 码
- 自动登录触发成功，但返回 `8821`（验证码拦截）→ SCF 服务器 IP 被网易云标记

**第三代（浏览器提取 Cookie）**：从用户浏览器复制 `MUSIC_U`，写本地脚本上传 COS。发现：Cookie 绑定 IP，SCF 服务器 IP 调用返回 `20001`。

**最终方案（公开歌单）**：用户新建普通公开歌单「BLOG」，SCF 无需 Cookie 直连 API。删除全部 ~145 行加密和登录代码，彻底摆脱认证维护。

```
          Cookie 方案        自动登录       浏览器提取      公开歌单
可靠性      ★★☆☆☆           ★☆☆☆☆           ★★☆☆☆         ★★★★★
维护成本   每月手动更新      零（理论）        每月手动         零
代码量     ~50 行           ~150 行          ~50 行          ~30 行
最终状态    ❌ 已废弃        ❌ 已废弃        ❌ 不可行        ✅ 当前方案
```

### 4. 切歌双重播放：三个并发 Bug 叠加

切换歌曲时两首歌同时播放。根因是三个问题叠加：

| 问题 | 位置 | 修复 |
|------|------|------|
| 弹出列表无防抖锁 | `popupEl click` | 加 `clickLock` 500ms |
| 旧 Audio 未彻底释放 | `switchToSong` | `pause()` → `src=''` → `load()` → `remove()` |
| 竞态条件 | 异步 fetch | `_switchSeq` 序列号，旧请求直接丢弃 |

### 5. 音柱可视化：Web Audio API 失效

原本想用 `AnalyserNode` 做真实频谱可视化。但网易云 CDN 的跨域策略导致 `createMediaElementSource` 静音，`captureStream` 也无数据。最终方案：`setInterval` 70ms 随机动画，播放启动/暂停 0.5s 渐出。虽然不是"真"频谱，但视觉效果足够好，且零 CPU 负担。

---

## 为什么 Serverless？

博客是静态的，但点赞、计数、音乐代理这些功能需要后端。传统方案是租服务器跑 Express，但：

| | 传统服务器 | SCF + COS |
|---|---|---|
| **月费** | ~¥50（最低配） | **¥0**（免费额度内） |
| **运维** | SSH、Nginx、HTTPS、监控 | 零运维 |
| **冷启动** | 无 | ~200ms（首次请求） |
| **扩缩容** | 手动 | 自动 |

SCF Web 函数 + COS 的组合刚好覆盖静态博客的全部后端需求。6 个路由，~400 行代码，零外部依赖，全部跑在 Node.js 内置模块上。

---

## 代码仓库

| 仓库 | 说明 |
|------|------|
| [Kreatur-ECHO.github.io](https://github.com/Kreatur-ECHO/Kreatur-ECHO.github.io) | 博客主仓库（前端 + SCF + 配置） |
| [scf-static-blog-backend](https://github.com/Kreatur-ECHO/scf-static-blog-backend) | SCF 云函数独立模板（可复用） |

---

## 技术文章

在搭建过程中写了两篇技术文章，都已发布在博客上：

- **[从零实现博客音乐播放系统](https://kreatur-echo.github.io/#post/music-player-from-scratch)** — 网易云 API 集成、SCF 代理、黑胶 UI、音柱可视化
- **[Serverless 实战：SCF + COS 给静态博客加后端](https://kreatur-echo.github.io/#post/scf-cos-serverless)** — COS 签名算法、IP 去重、JSON 裸读写

---

## 总结

这个项目证明了：**2026 年，不靠框架仍然能做出一个完整的、体验良好的博客系统**。

几个关键收获：
1. **Serverless 是静态网站后端的正确答案** — 零成本、零运维、按需扩容
2. **第三方服务的坑比想象的多** — 网易云的 Cookie 机制、COS 的签名细节、GitHub API 的速率限制
3. **"简单方案"往往最持久** — 最终放弃自动登录，用公开歌单，代码少了 80%，可靠性反而最高
4. **手写 CSS 不是倒退** — ~2500 行 CSS 覆盖了响应式、主题、动画、音柱、管理面板，但每个选择都经过了权衡，没有冗余

如果你也在考虑给静态博客加后端功能，或者好奇"纯原生到底能不能打"，希望这篇文章给了你一些参考。

---

*YEYU (Kreatur-ECHO), 2026-06-21*
*博客地址：https://kreatur-echo.github.io/*
