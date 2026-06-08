/**
 * ============================================================
 *  Blog Posts Data — 在这里增删改博客文章
 * ============================================================
 * 每篇文章的属性:
 *   - id:       唯一标识符（用于 URL hash / 锚点）
 *   - date:     发布日期 (YYYY-MM-DD)
 *   - title:    文章标题
 *   - excerpt:  文章摘要（在卡片上显示，3行以内最佳）
 *   - tags:     标签数组
 *   - url:      文章链接（如果是外部链接填写完整 URL；内部文章用 #）
 *   - featured: true 表示置顶/精选文章
 * ============================================================
 */

const BlogPosts = [
  {
    id: 'hello-world',
    date: '2026-06-08',
    title: 'Hello, World! — 博客的第一篇文章',
    excerpt: '欢迎来到我的个人博客！这篇文章记录了我搭建这个博客的完整过程——从选择技术栈到模块化架构设计，以及部署到 GitHub Pages 的经验总结。从零开始，用代码构建世界。',
    tags: ['Introduction', 'Blog', 'GitHub Pages'],
    url: '#',
    featured: true,
  },
  {
    id: 'modular-frontend',
    date: '2026-06-08',
    title: '纯原生 JS 实现模块化前端架构',
    excerpt: '不依赖任何框架，如何用原生 JavaScript 构建一个模块化、可维护的博客？本文分享 CSS 变量主题系统、组件渲染器模式、数据与视图分离的设计思路，以及 localStorage 持久化方案。',
    tags: ['JavaScript', 'Architecture', 'CSS'],
    url: '#',
    featured: true,
  },
  {
    id: 'why-github',
    date: '2026-06-07',
    title: '为什么我选择在 GitHub 上构建一切',
    excerpt: 'GitHub 不仅仅是一个代码托管平台，它是全球最大的开发者社区。从开源协作到 CI/CD，从 Pages 到 Actions，GitHub 生态为个人开发者提供了无限可能。这篇文章聊聊我的选择和思考。',
    tags: ['GitHub', 'Open Source', 'Dev Tools'],
    url: '#',
    featured: false,
  },
  {
    id: 'canvas-effects',
    date: '2026-06-07',
    title: 'Canvas 交互特效实战：粒子系统与点击波纹',
    excerpt: '用 HTML5 Canvas 给网页添加鼠标跟随粒子效果和点击波纹扩散动画。从 requestAnimationFrame 渲染循环到缓动函数，手把手实现丝滑的 60fps 特效。',
    tags: ['Canvas', 'Animation', 'JavaScript'],
    url: '#',
    featured: false,
  },
  {
    id: 'css-theming',
    date: '2026-06-06',
    title: 'CSS 自定义属性打造多主题系统',
    excerpt: '利用 CSS Custom Properties（变量）实现暗色/亮色主题切换，以及如何设计一个可扩展的主题架构。只需修改变量值就能创建全新视觉风格，告别硬编码颜色。',
    tags: ['CSS', 'Design System', 'Dark Mode'],
    url: '#',
    featured: false,
  },
  {
    id: 'new-beginning',
    date: '2026-06-06',
    title: '新账号，新开始 — Kreatur-ECHO 的诞生',
    excerpt: 'Kreatur 意为"创造物"，ECHO 意为"回声"。每一个创造都值得被听见，每一个想法都值得被记录。这是这个账号的起点，也是未来无数项目的种子。',
    tags: ['Journal', 'Personal'],
    url: '#',
    featured: false,
  },
];
