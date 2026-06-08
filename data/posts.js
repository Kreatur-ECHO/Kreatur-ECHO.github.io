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
    excerpt: '欢迎来到我的个人博客！这是我的第一篇文章。在这里，我将分享技术探索、项目心得以及日常思考。从零开始，用代码构建世界。',
    tags: ['Introduction', 'Blog', 'Life'],
    url: '#',
    featured: true,
  },
  {
    id: 'why-github',
    date: '2026-06-07',
    title: '为什么我选择在 GitHub 上构建一切',
    excerpt: 'GitHub 不仅仅是一个代码托管平台，它是全球最大的开发者社区。从开源协作到个人项目，GitHub 提供了无限可能。',
    tags: ['GitHub', 'Open Source', 'Dev'],
    url: '#',
    featured: false,
  },
  {
    id: 'new-beginning',
    date: '2026-06-06',
    title: '新账号，新开始',
    excerpt: '今天创建了这个 GitHub 账号 — Kreatur-ECHO。Kreatur 意为"创造物"，ECHO 意为"回声"。每一个创造都值得被听见。',
    tags: ['Journal', 'New Beginning'],
    url: '#',
    featured: false,
  },
];

// ---- 如果以后文章很多，可以取消下面这行的注释来反转顺序（最新的在前） ----
// BlogPosts.reverse();
