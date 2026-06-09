# YEYU's Blog — 项目配置记录

> 保存日期：2026-06-09
> 仓库：https://github.com/Kreatur-ECHO/Kreatur-ECHO.github.io
> 线上地址：https://kreatur-echo.github.io/

---

## 一、腾讯云 SCF 云函数（点赞 + 访问计数）

### 基本信息

| 项目 | 值 |
|------|-----|
| 函数名称 | `blog-like` |
| 函数类型 | **Web 函数** |
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

### 路由接口

| 方法 | 路径 | 功能 | 存储文件 |
|------|------|------|----------|
| GET | `/` | 读取所有点赞计数 | `likes.json` |
| POST | `/` (body: `{"comment_id":"..."}`) | 点赞（IP 去重） | `likes.json` |
| GET | `/visits` | 读取累计访问数 | `visits.json` |
| POST | `/visits` (body: `{"visit":true}`) | 记录访问（每日 IP 去重） | `visits.json` |

### SCF 代码位置

SCF 控制台 → `blog-like` → `app.js`

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

### 存储文件

| 文件 | 内容 | 读写方式 |
|------|------|----------|
| `likes.json` | 点赞数据 `{"commentId": count, "commentId:IP": 1}` | SCF 写，前端读 |
| `visits.json` | 访问数据 `{"total": N, "days": {"2026-06-09": {"IP": 1}}}` | SCF 写，前端读 |

### COS 控制台

https://console.cloud.tencent.com/cos/bucket

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
| `.github/workflows/fetch-comments.yml` | 每 10 分钟拉取 Issue #2 评论到 `data/comments.json`（备用，现在前端从 API 直读） |

---

## 五、前端架构

```
blog/
├── index.html
├── css/
│   ├── themes.css      # 主题变量
│   ├── style.css       # 布局和组件样式
│   └── admin.css       # 管理面板样式
├── js/
│   ├── theme.js        # 亮/暗主题切换
│   ├── github.js       # GitHub API 封装
│   ├── renderer.js     # HTML 组件渲染
│   ├── comments.js     # 留言板 + 点赞（SCF）
│   ├── effects.js      # Canvas 粒子特效
│   ├── admin.js        # 管理面板（#admin）
│   └── main.js         # 主入口 + 路由 + 访问计数
├── data/
│   ├── config.js       # 网站配置（含 likesApi）
│   ├── posts.js        # 博客文章数据
│   └── comments.json   # 评论备份（Action 维护）
└── .github/workflows/
    ├── deploy.yml
    └── fetch-comments.yml
```

### 关键 URL 配置 (`data/config.js`)

```js
likesApi: 'https://1441674200-buqu8i9sqn.ap-guangzhou.tencentscf.com',
reactionsToken: 'REACTIONS_TOKEN_PLACEHOLDER',  // 部署时由 Action 替换
```

---

## 六、功能列表

| 功能 | 实现方式 |
|------|----------|
| 博客文章 | `data/posts.js` 静态数据 |
| 文章管理 | `#admin` → GitHub API 直接提交 |
| 留言板 | GitHub Issues API (#2) 直读 |
| 点赞 | SCF → COS `likes.json`，IP 去重 |
| 访问计数 | SCF → COS `visits.json`，每日 IP 去重 |
| 主题切换 | CSS 变量 + localStorage |
| 粒子特效 | Canvas + requestAnimationFrame |
| 头像轨道球 | CSS animation rotate + translateX |
| Hero 飘星 | CSS background-image + radial-gradient 动画 |

---

## 七、如果需要迁移/重建

1. **COS**：新建 bucket，改 SCF 代码里的 `BUCKET` 和 `REGION`
2. **SCF**：新建 Web 函数 Node.js 18，粘贴 `app.js`，配环境变量，开公网+CORS
3. **前端**：改 `data/config.js` 里的 `likesApi` 为新 SCF URL
4. **GitHub**：确保 Secrets 里有 `REACTIONS_TOKEN`
