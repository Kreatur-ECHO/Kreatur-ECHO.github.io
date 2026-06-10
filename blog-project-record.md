# YEYU's Blog — 项目配置记录

> 最后更新：2026-06-11
> 仓库：https://github.com/Kreatur-ECHO/Kreatur-ECHO.github.io
> 线上地址：https://kreatur-echo.github.io/

---

## 一、腾讯云 SCF 云函数（点赞 + 访问计数 + 文章浏览）

### 基本信息

| 项目 | 值 |
|------|-----|
| 函数名称 | `blog-like` |
| 函数类型 | **Web 函数**（HTTP Server 模式，监听 **9000 端口**） |
| 地域 | **广州 (ap-guangzhou)** |
| 运行环境 | **Node.js 18.15** |
| 公网 URL | `https://1441674200-buqu8i9sqn.ap-guangzhou.tencentscf.com` |
| 内网 URL | `https://1441674200-buqu8i9sqn.in.ap-guangzhou.tencentscf.com` |

### 函数 URL 配置

| 选项 | 值 |
|------|-----|
| 公网访问 | ✅ 启用 |
| 内网访问 | ✅ 启用 |
| CORS | ✅ 启用 |
| Allow-Origin | `*` |
| Allow-Methods | GET, POST, OPTIONS |
| Allow-Headers | `*` |
| 授权类型 | 开放 |
| 参数兼容 | 启用 |

### 环境变量

| Key | Value |
|-----|-------|
| `SECRET_ID` | `AKID****` (见腾讯云 CAM 控制台) |
| `SECRET_KEY` | `****` (见腾讯云 CAM 控制台) |
| `NETEASE_UID` | `1654774015` |
| `NETEASE_COOKIE` | `MUSIC_U=****`（网易云登录态，有效期 1-3 月） |

### 路由接口（2026-06-10 最新）

| 方法 | 路径 | 功能 | 存储文件 | 鉴权 |
|------|------|------|----------|------|
| GET | `/` | 读取所有点赞计数 | `likes.json` | 公开 |
| POST | `/` (body: `{"comment_id":"..."}`) | 点赞（IP 去重，每 IP 每评论仅一次） | `likes.json` | COS 签名 |
| GET | `/visits` | 读取累计访问数 | `visits.json` | 公开 |
| POST | `/visits` (body: `{"visit":true}`) | 记录访问（每日 IP 去重） | `visits.json` | COS 签名 |
| GET | `/article-views` | 读取所有文章浏览计数 | `article-views.json` | 公开 |
| POST | `/article-views` (body: `{"article_id":"..."}`) | 文章浏览+1（每日 IP 去重） | `article-views.json` | COS 签名 |
| GET | `/recent-song` | 读取最近喜欢的 5 首歌 | `recent-song.json` | 公开 |
| GET | `/music-play?keyword=歌名+歌手` | 代理 at38.cn 搜索可播放音源 | — | 公开 |

### COS 存储文件格式

**`likes.json`**：
```json
{
  "4655251347": 2,
  "4655251347:<md5_ip>": 1
}
```
- 顶层 key 为 comment_id，值为累计点赞数
- `comment_id:md5_ip` 格式的 key 标记该 IP 已点赞（用于去重）

**`visits.json`**：
```json
{
  "total": 7,
  "days": {"2026-06-09": {"<ip>": 1, "<md5_ip>": 1}}
}
```

**`article-views.json`**：
```json
{
  "hello-world": {
    "count": 3,
    "days": {"2026-06-09": {"<md5_ip>": 1}}
  }
}
```

### SCF 代码位置

本地：`C:\Users\a2476\blog\scf\app.js`
SCF 控制台：https://console.cloud.tencent.com/scf → `blog-like` → 函数代码

### SCF 关键实现细节

1. **Web Function HTTP Server 模式**：使用 Node.js 内置 `http` 模块监听 9000 端口，不是 `exports.main_handler`
2. **零外部依赖**：仅使用 Node.js 内置模块 (`http`, `https`, `crypto`)
3. **COS 签名算法**：

   ```js
   // FormatString = [Method, Pathname, Params, Headers, ''].join('\n')
   const formatString = ['put', '/article-views.json', '', 'host=<COS_HOST>', ''].join('\n');
   const formatHash = crypto.createHash('sha1').update(formatString).digest('hex');

   // StringToSign = ['sha1', KeyTime, Hash, ''].join('\n')
   const stringToSign = ['sha1', keyTime, formatHash, ''].join('\n');

   // ⚠️ SignKey 必须是 hex 字符串（不是 Buffer）！
   const signKey = crypto.createHmac('sha1', SECRET_KEY).update(keyTime).digest('hex');

   // Signature = HMAC-SHA1(SignKey, StringToSign)
   const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');

   // Authorization header
   const auth = `q-sign-algorithm=sha1&q-ak=${SECRET_ID}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`;
   ```
   - **关键**：`signKey` 用 `.digest('hex')` 得到 hex 字符串，再作为第二次 HMAC 的 key
   - **关键**：只签 `host` 头（SDK 白名单规则），不签 `content-type`
   - **关键**：FormatString 末尾多一个空元素（与 cos-nodejs-sdk-v5 一致）

4. **IP 提取**（2026-06-10 修复）：

   ```js
   function getClientIP(req) {
     const xff = req.headers['x-forwarded-for'];
     // ⚠️ 只取逗号前第一个 IP（真实客户端），忽略代理链
     const ip = (typeof xff === 'string' ? xff.split(',')[0].trim() : '')
       || req.headers['x-real-ip']
       || (req.socket && req.socket.remoteAddress)
       || '0.0.0.0';
     return ip;
   }
   ```
   - 之前取整个 `x-forwarded-for` 值（含代理链），导致每次请求 MD5 不同，IP 去重失效

### SCF 部署方式

1. 打开 `C:\Users\a2476\blog\scf\app.js` → 全选复制
2. SCF 控制台 → `blog-like` → 函数代码 → 粘贴覆盖 → 点击「部署」

---

## 二、腾讯云 COS 对象存储

### 基本信息

| 项目 | 值 |
|------|-----|
| Bucket 名称 | `blog-likes-1234567890-1441674200` |
| APPID | `1441674200` |
| 地域 | 广州 (ap-guangzhou) |
| 访问权限 | **公有读私有写** |
| 数据冗余 | 单 AZ |
| Endpoint | `blog-likes-1234567890-1441674200.cos.ap-guangzhou.myqcloud.com` |

### 存储文件

| 文件 | 内容 | 读写方式 |
|------|------|----------|
| `likes.json` | 点赞数据 | SCF 写（需签名），前端/公开读 |
| `visits.json` | 访问数据 | SCF 写（需签名），前端/公开读 |
| `article-views.json` | 文章浏览数据 | SCF 写（需签名），前端/公开读 |

---

## 三、API 密钥

| 项目 | 值 |
|------|-----|
| SecretId | `AKID****` (见腾讯云 CAM 控制台) |
| SecretKey | `****` (见腾讯云 CAM 控制台) |

密钥管理：https://console.cloud.tencent.com/cam/capi

---

## 四、GitHub 仓库

| 项目 | 值 |
|------|-----|
| 账号 | Kreatur-ECHO |
| 仓库 | Kreatur-ECHO.github.io |
| Pages 地址 | https://kreatur-echo.github.io/ |

### Admin Token

GitHub Fine-grained Token：https://github.com/settings/tokens?type=beta
- 名称：`blog-admin`
- Repository：仅 `Kreatur-ECHO/Kreatur-ECHO.github.io`
- Permissions：**Contents → Read and Write**

### GitHub Actions 工作流

| 文件 | 功能 |
|------|------|
| `.github/workflows/deploy.yml` | 部署到 Pages，注入 REACTIONS_TOKEN，刷新 comments.json |
| `.github/workflows/fetch-comments.yml` | 每 10 分钟拉取 Issue #2 评论到 `data/comments.json`（备用） |

### 本地操作流程

```bash
cd C:\Users\a2476\blog

# 编辑代码后
git add -A
git commit -m "描述"
git pull --rebase   # 先拉取远程（管理面板可能产生了新提交）
git push

# 如果 rebase 冲突，解决冲突后：
git add data/posts.js
git rebase --continue
git push
```

---

## 五、前端架构

```
blog/
├── index.html            # 入口（缓存版本号 v7~v14）
├── css/
│   ├── themes.css        # 主题变量（v6）
│   ├── style.css         # 布局和组件样式（v12）
│   └── admin.css         # 管理面板样式（v6）
├── js/
│   ├── theme.js          # 亮/暗主题切换（v7）
│   ├── github.js         # GitHub API 封装（v7）
│   ├── renderer.js       # HTML 组件渲染 + 排序逻辑（v14）
│   ├── comments.js       # 留言板 + 点赞localStorage去重（v12）
│   ├── effects.js        # Canvas 粒子特效（v7）
│   ├── admin.js          # 管理面板 #admin（v7）
│   └── main.js           # 主入口 + 路由 + 浏览API（v14）
├── data/
│   ├── config.js         # 网站配置 + likesApi（v7）
│   ├── posts.js          # 博客文章数据（v9）
│   └── comments.json     # 评论备份（Action 维护）
├── scf/
│   ├── app.js            # SCF 完整代码
│   └── article-views-route.js  # 增量路由参考
└── .github/workflows/
    ├── deploy.yml
    └── fetch-comments.yml
```

### 关键 URL 配置 (`data/config.js`)

```js
likesApi: 'https://1441674200-buqu8i9sqn.ap-guangzhou.tencentscf.com',
```

---

## 六、功能列表与实现细节

### 6.1 评论点赞系统

| 层级 | 机制 | 实现文件 |
|------|------|----------|
| 前端渲染 | `likedByMe` Set + `localStorage('blog_liked_comments')` 记住已点赞评论 | `js/comments.js` |
| 前端防重复 | 点击已点赞按钮拦截 + "已赞过" 红色提示气泡（1s动画，0.3s淡入淡出，2s冷却） | `js/comments.js` |
| 前端样式 | 未点赞=空心大拇指，已点赞=红色实心大拇指 | `css/style.css` |
| 后端去重 | SCF 检查 `comment_id:md5(ip)` 是否已存在 | `scf/app.js` |

- 前端用 class `already-liked` 而非 `disabled` 属性（Firefox 兼容性）
- `localStorage` key: `blog_liked_comments`，值为 JSON 数组 `["commentId1","commentId2",...]`

### 6.2 文章浏览计数

| 步骤 | 动作 |
|------|------|
| 首页加载 | `GET /article-views` 获取所有文章浏览数据 |
| 文章详情页 | `POST /article-views {article_id: "..."}` 记录浏览 |
| 后端存储 | COS `article-views.json`，每日 IP 去重（md5） |

### 6.3 文章排序栏

| 选项 | 排序规则 |
|------|----------|
| **最新** | 按 `date` 降序 |
| **最多浏览** | 按 `article-views` 计数降序，相同则按日期降序 |

- **星标文章始终置顶**：`featured: true` 的文章先排（内部按所选排序），非星标排后面
- 排序切换即时重渲染（`js/renderer.js` → `sortPosts()`）

### 6.4 文章卡片折叠

| 项目 | 值 |
|------|------|
| 初始显示 | 前 **6 篇** |
| 展开按钮 | 「显示全部 (N)」→ 「收起」 |
| 实现方式 | `.post-card-hidden` class（`display:none`），展开加 `.expanded`（`display:flex`） |
| 关键细节 | 隐藏卡片直接作为 `.posts-grid` 子元素，不用 wrapper，保证 grid 正常排版 |

### 6.5 Archive 时间线折叠

| 项目 | 值 |
|------|------|
| 初始显示 | 前 **10 条** |
| 不满阈值 | 按钮不出现 |
| 展开按钮 | 「显示全部 (N)」→ 「收起」 |
| 实现方式 | `.timeline-hidden` class（`display:none`），展开 `display:inline` |

### 6.6 空白文章过滤

- `renderer.js` → `filterNonBlank()`：过滤 `title` 和 `content` 都为空的文章
- `admin.js` → `serializePostsFile()`：保存时同样过滤
- `admin.js` → `collectFormData()`：表单验证 title/content 非空

### 6.7 其他功能

| 功能 | 实现 |
|------|------|
| 博客文章 | `data/posts.js` 静态数据，含 8 篇文章（hello-world⭐, test⭐, test2⭐, modular-frontend, why-github, canvas-effects, css-theming, new-beginning） |
| 文章管理 | `#admin` → GitHub API 直接提交 |
| 留言板 | GitHub Issues API (#2) 直读，3 条评论 |
| 访问计数 | SCF → COS `visits.json`，每日 IP 去重 |
| 主题切换 | CSS 变量 + localStorage |
| 粒子特效 | Canvas + requestAnimationFrame |

### 6.8 网易云音乐集成（2026-06-10）

| 层级 | 机制 | 实现文件 |
|------|------|----------|
| SCF 路由 | `/recent-song` — 调用网易云 API 拉取「羽_Kreatur喜欢的音乐」歌单前 5 首 | `scf/app.js` |
| SCF 路由 | `/music-play?keyword=` — 代理 at38.cn 搜索可播放音源 | `scf/app.js` |
| COS 缓存 | `recent-song.json`，每天凌晨 4 点刷新一次 | — |
| 前端渲染 | 右下角固定黑胶唱片，展示最近喜欢的第 1 首封面 | `js/renderer.js` |
| 前端数据 | `loadRecentSong()` → 更新黑胶封面 + 构建弹出列表 | `js/main.js` |
| 音乐播放 | `switchToSong()` → at38.cn 搜音源 → `<audio>` 播放 | `js/main.js` |
| 播放控制 | 点击黑胶切换播放/暂停；播放时旋转，暂停停止 | `js/main.js` |
| 列表循环 | 歌曲播完自动切下一首，5 首循环 | `js/main.js` |
| 弹出列表 | 黑胶 hover 0.2s 后向上弹出全部 5 首，当前播放紫色高亮 | `css/style.css` |
| 状态图标 | 半透明白色播放/暂停图标（32px），hover 显示，状态切换 1.5s 淡入淡出 | `css/style.css` |
| 切换歌曲 | 点击列表歌曲切换黑胶封面 + 搜索播放该歌曲 | `js/main.js` |

- SCF `/music-play` 不经过 COS，直接代理请求 at38.cn 并解析 HTML 返回 JSON
- 网易云 Cookie (`MUSIC_U`) 保存在 SCF 环境变量，有效期约 1-3 个月
- 前端 `<audio>` 直接从 QQ 音乐 CDN 拉流，不经过 SCF/COS

### 6.9 侧边栏回顶按钮（2026-06-10）

| 屏幕 | 行为 |
|------|------|
| 桌面 (>1024px) | 回顶按钮集成在右侧快捷跳转栏底部（分隔线下方），独立按钮隐藏 |
| 手机/平板 (≤1024px) | 侧边栏隐藏，独立回顶按钮显示在原位置 |

- 侧边栏回顶按钮使用 SVG 箭头代替默认圆点
- 点击滚动到顶部 `behavior: smooth`

---

## 七、已知问题与修复记录

| 日期 | 问题 | 原因 | 修复 |
|------|------|------|------|
| 06-10 | COS 写入 403 | SECRET_KEY 版本不一致（SignKey 用了 Buffer 而非 hex string） | 改用 `.digest('hex')` |
| 06-10 | COS 签名不匹配 | 签了 `content-type` 头（不在 SDK 白名单） | 只签 `host` 头 |
| 06-10 | 点赞 IP 去重失效 | `x-forwarded-for` 取了整个代理链 | `split(',')[0].trim()` |
| 06-10 | 已点赞按钮 Firefox 不响应 | `disabled` 属性阻止点击事件冒泡 | 改用 class `already-liked` |
| 06-10 | 展开卡片排版错乱 | `display:contents` 兼容问题 | 直接给 `<a>` 加 class |
| 06-10 | 展开卡片大小不一致 | `display:block` 覆盖了 `display:flex` | 改为 `display:flex` |
| 06-10 | 手机端缺少适配 | 仅 768px 断点，卡片竖向过大 | 新增 640px 断点：扁平列表卡片 + Hero 压缩 + Canvas 关闭 |
| 06-10 | Hero 变形几何体 | 3D 线框效果不理想 | 已移除 |
| 06-10 | GitHub API 403 限流 → 评论不更新 | 3 个未认证 API 调用共享 60/hr 配额 | github.js + comments.js 加 Bearer token 认证 (5000/hr) |
| 06-10 | 网易云歌单 API 返回空 | SCF IP 调用 `/user/playlist` 时 Cookie 登录态无效 | 跳过查找，直接用已知 liked playlist ID `2488546807` |
| 06-10 | 弹出列表跟随黑胶旋转 | popup 是 rotating disc 的子元素 | 外包 `.vinyl-wrapper`，popup 与 disc 同级 |
| 06-10 | 黑胶点击无法播放 | 两个 click 监听器冲突（网易云跳转 vs 播放） | 合并为统一 handler，有音源播放、无音源跳转 |
| 06-10 | 二次点击暂停无效 | `playing` 变量未在 audio 事件中更新 | play/pause/ended 事件中更新 `playing` 状态 |

---

## 八、迁移/重建清单

1. **COS**：新建 bucket（公有读私有写），无需改 SCF 代码（bucket 名在代码中）
2. **SCF**：
   - 新建 Web 函数 Node.js 18，粘贴 `scf/app.js`
   - 配环境变量 `SECRET_ID` + `SECRET_KEY` + `NETEASE_UID` + `NETEASE_COOKIE`
   - 开公网 URL + CORS（`*`）
   - ⚠️ 必须是 **Web 函数**（HTTP Server），不是事件函数
3. **前端**：改 `data/config.js` 里的 `likesApi` 为新 SCF URL
4. **GitHub**：确保 Secrets 里有 `REACTIONS_TOKEN`

---

## 九、缓存版本号一览（index.html）

| 文件 | 版本 | 用途 |
|------|------|------|
| `css/themes.css` | v=6 | 主题变量 |
| `css/style.css` | v=25 | 布局样式 |
| `css/admin.css` | v=6 | 管理面板 |
| `data/config.js` | v=7 | 网站配置 |
| `data/posts.js` | v=9 | 文章数据 |
| `js/theme.js` | v=7 | 主题切换 |
| `js/github.js` | v=8 | GitHub API |
| `js/renderer.js` | v=19 | 组件渲染 |
| `js/comments.js` | v=13 | 留言+点赞 |
| `js/effects.js` | v=10 | 粒子特效 |
| `js/admin.js` | v=7 | 管理面板 |
| `js/main.js` | v=28 | 主入口 |
