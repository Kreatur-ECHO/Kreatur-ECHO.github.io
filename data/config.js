/**
 * ============================================================
 *  Site Configuration — 修改这里的配置来更改网站基本信息
 * ============================================================
 * 修改指南:
 *   - site.name:        网站名称（显示在导航栏和标题）
 *   - site.title:       页面标题（浏览器标签页）
 *   - site.description: 网站描述（SEO meta）
 *   - site.lang:        语言代码
 *   - site.url:         网站部署后的 URL
 *   - author:           作者信息
 *   - github:           GitHub 账户信息
 *   - sections:         控制哪些区块显示/隐藏，调整顺序
 * ============================================================
 */

const SiteConfig = {
  // ---- 网站基本信息 ----
  site: {
    name: 'YEYU',
    title: 'YEYU - Personal Blog',
    description: "YEYU's personal blog — Thoughts, code, and creativity.",
    lang: 'zh-CN',
    url: 'https://Kreatur-ECHO.github.io',
    favicon: '',
  },

  // ---- 作者信息 ----
  author: {
    name: 'YEYU',
    bio: 'Developer, creator, and lifelong learner. Building things that matter.',
    avatar: 'https://avatars.githubusercontent.com/u/291270204?v=4',
  },

  // ---- 社交链接 ----
  // icon: 填入 SVG 内联代码或使用预设名 (github / twitter / mail / website)
  // 留空或删除某个对象即不显示
  social: [
    {
      icon: 'github',
      label: 'GitHub',
      url: 'https://github.com/Kreatur-ECHO',
    },
    {
      icon: 'qq',
      label: 'QQ',
      url: 'tencent://AddContact/?fromId=45&fromSubId=1&subcmd=all&uin=2476484290',
      qq: '2476484290',
    },
    // 示例: 将来添加其他平台，取消注释即可
    // { icon: 'twitter',  label: 'Twitter', url: 'https://twitter.com/yourname' },
    // { icon: 'mail',     label: 'Email',   url: 'mailto:you@example.com' },
  ],

  // ---- GitHub 账户 ----
  github: {
    username: 'Kreatur-ECHO',
    apiUrl: 'https://api.github.com/users/Kreatur-ECHO',
    reposApiUrl: 'https://api.github.com/users/Kreatur-ECHO/repos',
    reposPerPage: 6,
    reposSort: 'updated',
  },

  // ---- 区块配置 ----
  // enabled: true/false 控制显示/隐藏
  // order: 数字越小越靠前
  sections: {
    hero:    { enabled: true,  order: 1 },
    blog:    { enabled: true,  order: 2 },
    projects:{ enabled: true,  order: 3 },
    archive: { enabled: true,  order: 4 },
    comments:{ enabled: true,  order: 5 },
  },

  // ---- 导航菜单 ----
  nav: [
    { label: 'About',     href: '#about' },
    { label: 'Blog',      href: '#blog' },
    { label: 'Projects',  href: '#projects' },
    { label: 'Guestbook', href: '#comments' },
    { label: 'GitHub ↗',  href: 'https://github.com/Kreatur-ECHO', external: true },
  ],

  // ---- 页脚链接 ----
  footerLinks: [
    { label: 'GitHub',  href: 'https://github.com/Kreatur-ECHO' },
    { label: 'About',   href: '#about' },
    { label: 'Blog',    href: '#blog' },
    { label: 'Projects',href: '#projects' },
  ],

  // ---- 页脚版权 ----
  footerText: '© 2026 YEYU. Built with ❤️ and deployed on GitHub Pages.',
};
