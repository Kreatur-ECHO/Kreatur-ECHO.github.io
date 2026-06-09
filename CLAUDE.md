# YEYU's Blog

## 项目概览
- 个人博客：https://kreatur-echo.github.io/
- GitHub 账号：Kreatur-ECHO (用户 YEYU)
- 纯原生 HTML/CSS/JS，零框架依赖，模块化架构
- 托管于 GitHub Pages，仓库 Kreatur-ECHO.github.io

## 文件结构
```
blog/
├── index.html              # 入口页面
├── css/
│   ├── themes.css           # 主题变量（颜色/字体/圆角）
│   └── style.css            # 布局和组件样式
├── js/
│   ├── theme.js             # 主题管理器（亮/暗切换）
│   ├── github.js            # GitHub API 模块
│   ├── renderer.js          # HTML 组件渲染器
│   ├── comments.js          # 留言板（直接拉 GitHub API，回退读 data/comments.json）
│   ├── effects.js           # 鼠标粒子 + 点击波纹特效
│   └── main.js              # 主入口（组装页面 + 事件绑定）
├── data/
│   ├── config.js            # 网站配置（作者/GitHub/导航/区块开关）
│   ├── posts.js             # 博客文章数据
│   └── comments.json        # 评论数据（由 GitHub Action 定时更新）
└── .github/workflows/
    └── fetch-comments.yml   # 每10分钟从 Issue #2 抓取评论
```

## 关键设计决策
1. **评论系统**：前端直接从 GitHub Issues API 拉取（实时零延迟），本地 JSON 作回退，GitHub Action 维护静态副本
2. **模块化**：配置 / 数据 / 渲染 / 逻辑完全分离
3. **主题切换**：CSS 变量方案，支持亮/暗模式
4. **特效**：Canvas 粒子系统 + 点击波纹

## 常见操作
- 增删博客文章 → 编辑 data/posts.js
- 改网站配置 → 编辑 data/config.js
- 换主题颜色 → 编辑 css/themes.css
- 改布局样式 → 编辑 css/style.css
- 改区块 HTML → 编辑 js/renderer.js
- 留言功能 → 基于 GitHub Issue #2
- 手动触发评论刷新 → Actions 页面运行 fetch-comments workflow

## 部署
- 推送 main 分支自动部署 GitHub Pages
- 本地预览：直接打开 index.html
