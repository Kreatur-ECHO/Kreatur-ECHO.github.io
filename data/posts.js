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
 *   - url:      文章链接 (格式: #post/{id})
 *   - featured: true 表示置顶/精选文章
 *   - content:  文章正文 (HTML 格式)
 * ============================================================
 */

const BlogPosts = [
  {
    id: 'hello-world',
    date: '2026-06-08',
    title: 'Hello, World! — 博客的第一篇文章',
    excerpt: '欢迎来到我的个人博客！这篇文章记录了我搭建这个博客的完整过程——从选择技术栈到模块化架构设计，以及部署到 GitHub Pages 的经验总结。从零开始，用代码构建世界。',
    tags: ['Introduction', 'Blog', 'GitHub Pages'],
    url: '#post/hello-world',
    featured: true,
    content: `
      <p>你好，世界！欢迎来到我的个人博客。</p>
      
      <h2>为什么建立这个博客</h2>
      <p>在这个信息爆炸的时代，拥有一个属于自己的空间来记录思考、分享知识变得尤为重要。与其依赖第三方平台，不如自己动手，从零搭建一个完全由自己掌控的博客。</p>
      <p>这个博客的目标很简单：<strong>记录成长、分享知识、连接同好。</strong></p>
      
      <h2>技术选型</h2>
      <p>在选择技术方案时，我遵循了一个基本原则：<strong>保持简单</strong>。没有使用 React、Vue 或任何前端框架，而是回归最基础的技术栈：</p>
      <ul>
        <li><strong>HTML</strong> — 页面结构</li>
        <li><strong>CSS</strong> — 视觉样式与主题系统</li>
        <li><strong>JavaScript</strong> — 模块化的交互逻辑</li>
        <li><strong>GitHub Pages</strong> — 免费、稳定的静态托管</li>
      </ul>
      <p>这种"纯原生"方案的优点是零依赖、加载快、维护成本低。不需要 npm install、不需要 webpack 配置、不需要担心框架版本过期。</p>
      
      <h2>模块化架构设计</h2>
      <p>虽然是纯原生 JS，但我设计了一套清晰的模块化架构：</p>
      <ul>
        <li><strong>data/config.js</strong> — 网站配置中心，改一个文件就能调整全局</li>
        <li><strong>data/posts.js</strong> — 文章数据，增删改文章只需编辑这个数组</li>
        <li><strong>js/renderer.js</strong> — 组件渲染器，所有 HTML 生成逻辑集中管理</li>
        <li><strong>js/theme.js</strong> — 主题管理器，亮暗切换 + 系统跟随</li>
        <li><strong>js/effects.js</strong> — Canvas 粒子特效</li>
        <li><strong>js/main.js</strong> — 主入口，组装所有模块</li>
      </ul>
      
      <h2>部署流程</h2>
      <p>推送代码到 GitHub 仓库的 main 分支，GitHub Pages 会自动构建和部署。整个过程不到一分钟，非常流畅。</p>
      
      <h2>未来计划</h2>
      <p>这个博客会持续迭代。计划中的功能包括：文章标签筛选、RSS 订阅、搜索功能等。如果你有任何建议，欢迎在留言板告诉我！</p>
      
      <p>感谢你的到访，希望你能在这里找到有用的内容 🚀</p>
      
      
      
      
      
      
      
      
      
    `,
  },
  {
    id: 'modular-frontend',
    date: '2026-06-08',
    title: '纯原生 JS 实现模块化前端架构',
    excerpt: '不依赖任何框架，如何用原生 JavaScript 构建一个模块化、可维护的博客？本文分享 CSS 变量主题系统、组件渲染器模式、数据与视图分离的设计思路，以及 localStorage 持久化方案。',
    tags: ['JavaScript', 'Architecture', 'CSS'],
    url: '#post/modular-frontend',
    featured: false,
    content: `
      <p>前端框架让开发变得更高效，但也带来了复杂性。对于个人博客这类相对简单的项目，纯原生 JS 完全可以胜任，甚至更加灵活。</p>
            <p>本文将分享我是如何用原生 JavaScript 构建一个模块化、可维护的博客架构。</p>
      
            <h2>1. 数据与视图分离</h2>
            <p>框架的核心价值之一是数据驱动视图。在原生 JS 中，我们可以通过简单的模式来实现这一点：</p>
            <ul>
              <li>所有数据存储在独立的 JS 对象中（<code>config.js</code>、<code>posts.js</code>）</li>
              <li>渲染函数接收数据，返回 HTML 字符串</li>
              <li>数据变化时，重新调用渲染函数更新 DOM</li>
            </ul>
            <p>这种模式虽然简单，但非常有效。修改配置不需要碰渲染逻辑，反之亦然。</p>
      
            <h2>2. CSS 变量主题系统</h2>
            <p>使用 CSS Custom Properties（变量）实现主题切换是这个博客最优雅的设计之一：</p>
            <pre><code>:root[data-theme="light"] {
        --color-bg-primary: #ffffff;
        --color-text-primary: #1a1a2e;
        --color-accent: #6c63ff;
      }
      
      :root[data-theme="dark"] {
        --color-bg-primary: #0f0f1a;
        --color-text-primary: #e8e8f0;
        --color-accent: #8b83ff;
      }</code></pre>
            <p>切换主题只需要修改 <code>document.documentElement</code> 上的一个属性，所有使用这些变量的元素自动响应。不需要重新渲染任何 DOM。</p>
      
            <h2>3. 组件渲染器模式</h2>
            <p>用一个 <code>Renderer</code> 对象集中管理所有 HTML 生成逻辑：</p>
            <pre><code>const Renderer = {
        renderNavbar(config) { /* 返回导航栏 HTML */ },
        renderHero(config)   { /* 返回 Hero HTML */ },
        renderBlog(posts)    { /* 返回文章列表 HTML */ },
      };</code></pre>
            <p>每个函数接收数据、返回字符串。调用方只关心"我要渲染什么"，不关心"怎么渲染"。</p>
      
            <h2>4. IIFE 模块隔离</h2>
            <p>使用立即执行函数表达式（IIFE）创建模块作用域，避免全局变量污染：</p>
            <pre><code>const ThemeManager = (() => {
        // 私有变量和函数
        let currentTheme = 'light';
      
        function apply(theme) { /* ... */ }
      
        // 公开 API
        return { init, toggle, apply };
      })();</code></pre>
      
            <h2>结语</h2>
            <p>不需要框架也能写出结构清晰的代码。关键在于遵循好的设计原则：分离关注点、单一职责、数据驱动。这些原则比任何框架都重要。</p>
      
      
      
      
    `,
  },
  {
    id: 'why-github',
    date: '2026-06-07',
    title: '为什么我选择在 GitHub 上构建一切',
    excerpt: 'GitHub 不仅仅是一个代码托管平台，它是全球最大的开发者社区。从开源协作到 CI/CD，从 Pages 到 Actions，GitHub 生态为个人开发者提供了无限可能。',
    tags: ['GitHub', 'Open Source', 'Dev Tools'],
    url: '#post/why-github',
    featured: false,
    content: `
      <p>作为一名开发者，选择一个可靠的平台来托管代码、构建项目、部署应用至关重要。对我来说，GitHub 不仅仅是一个代码仓库——它是一个完整的开发生态系统。</p>
      
      <h2>不只是代码托管</h2>
      <p>很多人把 GitHub 等同于"代码的网盘"，但实际上它提供的能力远超存储：</p>
      <ul>
        <li><strong>版本控制</strong> — Git 让你可以追溯每一次修改</li>
        <li><strong>协作工具</strong> — Issues、Pull Requests、Code Review</li>
        <li><strong>项目看板</strong> — 轻量级项目管理</li>
        <li><strong>讨论区</strong> — 社区交流</li>
      </ul>
      
      <h2>GitHub Pages — 静态网站的最佳归宿</h2>
      <p>对于个人博客、项目文档、作品集这类静态网站，GitHub Pages 是完美的选择：</p>
      <ul>
        <li>免费托管，支持自定义域名</li>
        <li>自动构建部署（push 即上线）</li>
        <li>全球 CDN 加速</li>
        <li>HTTPS 自动配置</li>
      </ul>
      <p>这个博客就完全托管在 GitHub Pages 上，零成本、零维护负担。</p>
      
      <h2>GitHub Actions — 自动化一切</h2>
      <p>Actions 是我最喜欢的功能。这个博客的留言系统就靠它驱动：每 10 分钟自动抓取 Issue 评论，生成静态 JSON，前端直接读取。不需要自己的服务器，不需要数据库，一个 Action 就搞定了。</p>
      
      <h2>开源的力量</h2>
      <p>GitHub 上有数以亿计的开源项目。从学习别人的代码，到贡献自己的项目，GitHub 让全球开发者连接在一起。这也是为什么我把所有项目都放在 GitHub 上——开放、透明、协作。</p>
      
      <p>如果你还没有 GitHub 账号，强烈建议注册一个。它可能会改变你构建软件的方式。</p>
      
      
      
      
      
      
      
      
      
    `,
  },
  {
    id: 'canvas-effects',
    date: '2026-06-07',
    title: 'Canvas 交互特效实战：粒子系统与点击波纹',
    excerpt: '用 HTML5 Canvas 给网页添加鼠标跟随粒子效果和点击波纹扩散动画。从 requestAnimationFrame 渲染循环到缓动函数，手把手实现丝滑的 60fps 特效。',
    tags: ['Canvas', 'Animation', 'JavaScript'],
    url: '#post/canvas-effects',
    featured: false,
    content: `
            <p>网页特效是提升用户体验的重要手段。适当的动画不仅让页面更有生命力，还能引导用户的注意力。本文分享如何用 Canvas 实现两个经典的交互特效。</p>
      
            <h2>1. 鼠标跟随粒子系统</h2>
            <p>核心思路：在 Canvas 上维护一组粒子（通常 30-50 个），每个粒子有一个目标位置（鼠标坐标），通过缓动函数让它们平滑跟随。</p>
      
            <h3>粒子数据结构</h3>
            <pre><code>{
        x: 0, y: 0,          // 当前位置
        tx: 0, ty: 0,        // 目标位置（鼠标坐标）
        size: Math.random() * 3 + 1,  // 随机大小
        opacity: Math.random() * 0.5 + 0.3, // 随机透明度
      }</code></pre>
      
            <h3>渲染循环</h3>
            <pre><code>function animate() {
        ctx.clearRect(0, 0, w, h);  // 清空画布
      
        particles.forEach(p => {
          // 缓动：每帧向目标移动一定比例
          p.x += (p.tx - p.x) * 0.08;
          p.y += (p.ty - p.y) * 0.08;
      
          // 绘制粒子
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = \`rgba(108, 99, 255, \${p.opacity})\`;
          ctx.fill();
        });
      
        requestAnimationFrame(animate);
      }</code></pre>
      
            <h2>2. 点击波纹扩散</h2>
            <p>用户点击时，在点击位置创建一个"波纹"——一个逐渐扩大并淡出的圆。多个波纹可以同时存在，互不干扰。</p>
      
            <h3>波纹对象</h3>
            <pre><code>{
        x, y,              // 点击坐标
        radius: 0,         // 当前半径
        maxRadius: 40,     // 最大半径
        opacity: 0.6,      // 当前透明度
      }</code></pre>
      
            <h3>更新逻辑</h3>
            <pre><code>ripples.forEach(r => {
        r.radius += 1.5;           // 半径增长
        r.opacity -= 0.02;         // 逐渐透明
      });
      // 移除已消失的波纹
      ripples = ripples.filter(r => r.opacity > 0);</code></pre>
      
            <h2>性能优化</h2>
            <ul>
              <li>粒子数量控制在 40 以内</li>
              <li>使用 <code>requestAnimationFrame</code> 而非 <code>setInterval</code></li>
              <li>Canvas 尺寸响应窗口大小，但只在 resize 时重建</li>
              <li>鼠标静止时降低粒子更新频率</li>
            </ul>
      
            <p>这些特效只用不到 100 行代码，却能显著提升页面的精致感。你也可以试试看！</p>
          
      
      
      
      
      
      
      
      
    `,
  },
  {
    id: 'css-theming',
    date: '2026-06-06',
    title: 'CSS 自定义属性打造多主题系统',
    excerpt: '利用 CSS Custom Properties（变量）实现暗色/亮色主题切换，以及如何设计一个可扩展的主题架构。只需修改变量值就能创建全新视觉风格，告别硬编码颜色。',
    tags: ['CSS', 'Design System', 'Dark Mode'],
    url: '#post/css-theming',
    featured: false,
    content: `
            <p>暗色模式已经成为现代网站的标配。但一个好的主题系统不应该只是"黑和白"的切换——它应该是一个可扩展的设计变量体系。</p>
      
            <h2>CSS 变量的优势</h2>
            <p>在 CSS 变量出现之前，实现主题切换通常需要：</p>
            <ul>
              <li>Sass/Less 变量编译（无法运行时切换）</li>
              <li>用 JS 批量修改样式（性能差、维护难）</li>
              <li>加载不同的 CSS 文件（多一次网络请求）</li>
            </ul>
            <p>CSS Custom Properties 解决了所有这些问题：它们是动态的、可继承的、运行时可修改的。</p>
      
            <h2>设计变量层级</h2>
            <p>一个好的主题系统应该有清晰的变量命名和层级：</p>
            <pre><code>/* 语义化变量 */
      --color-bg-primary        /* 主背景 */
      --color-bg-secondary      /* 次背景 */
      --color-surface           /* 卡片/面板背景 */
      --color-text-primary      /* 主文字 */
      --color-text-secondary    /* 次文字 */
      --color-text-muted        /* 弱化文字 */
      --color-accent            /* 强调色 */
      --color-accent-glow       /* 强调色光晕 */
      --color-border            /* 边框 */
      --color-surface-hover     /* 悬停背景 */</code></pre>
      
            <h2>双主题实现</h2>
            <pre><code>/* 亮色主题（默认） */
      :root,
      [data-theme="light"] {
        --color-bg-primary: #fafafa;
        --color-surface: #ffffff;
        --color-text-primary: #1a1a2e;
        --color-accent: #6c63ff;
      }
      
      /* 暗色主题 */
      [data-theme="dark"] {
        --color-bg-primary: #0f0f1a;
        --color-surface: #1a1a2e;
        --color-text-primary: #e8e8f0;
        --color-accent: #8b83ff;
      }</code></pre>
      
            <h2>JS 切换逻辑</h2>
            <pre><code>function toggle() {
        const current = document.documentElement.dataset.theme;
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        localStorage.setItem('theme', next);
      }</code></pre>
      
            <h2>扩展性</h2>
            <p>如果需要添加更多主题（比如"暖色"、"高对比度"等），只需要新增一组变量值，无需改动任何组件代码。这就是 CSS 变量的力量——<strong>定义一次，处处生效。</strong></p>
          
      
      
      
      
      
      
      
      
    `,
  },
  {
    id: 'new-beginning',
    date: '2026-06-06',
    title: '新账号，新开始 — Kreatur-ECHO 的诞生',
    excerpt: 'Kreatur 意为"创造物"，ECHO 意为"回声"。每一个创造都值得被听见，每一个想法都值得被记录。这是这个账号的起点，也是未来无数项目的种子。',
    tags: ['Journal', 'Personal'],
    url: '#post/new-beginning',
    featured: false,
    content: `
      <p>2025 年，我创建了这个新的 GitHub 账号：<strong>Kreatur-ECHO</strong>。</p>
      
      <h2>名字的由来</h2>
      <p><strong>Kreatur</strong> 来自德语 "Kreatur"，意为"创造物、生物"。对我而言，每一个代码仓库都像是一个有生命的小创造——它们在不断迭代中成长，承载着创造者的思想和情感。</p>
      <p><strong>ECHO</strong> 意为"回声"。我相信每一个创造都应该被听见，每一个想法都值得留下回响。互联网是最大的回音壁，而代码是我们说话的方式。</p>
      
      <h2>为什么是新账号</h2>
      <p>这不是我的第一个 GitHub 账号，但这是我决定认真对待的一个。之前的账号杂乱无章，各种实验性项目混合在一起。这次我希望：</p>
      <ul>
        <li>每个项目都有清晰的 README 和文档</li>
        <li>代码质量和可维护性放在首位</li>
        <li>持续输出，而不是一次性提交后荒废</li>
        <li>构建一个连贯的、有主题的项目体系</li>
      </ul>
      
      <h2>YEYU 的由来</h2>
      <p>YEYU 是我的个人代号。这个名字代表着我对创造和分享的态度——不追求完美，但追求真实。没有什么高深的含义，只是一个程序员在互联网上的小小印记。</p>
      
      <h2>未来的方向</h2>
      <p>这个账号将主要围绕以下方向：</p>
      <ul>
        <li><strong>前端开发</strong> — 探索 Web 技术的边界</li>
        <li><strong>创意编程</strong> — 用代码创造视觉体验</li>
        <li><strong>工具开发</strong> — 构建提升效率的小工具</li>
        <li><strong>开源贡献</strong> — 回馈社区</li>
      </ul>
      
      <p>这是一个新的开始。感谢你来见证。</p>
      <p>—— YEYU</p>
      
      
      
      
      
      
      
      
      
    `,
  },
  {
    id: 'test',
    date: '2026-06-09',
    title: 'test',
    excerpt: 'test',
    tags: ['test'],
    url: '#post/test',
    featured: true,
    content: `
      test
      
      
      
    `,
  },
  {
    id: 'test2',
    date: '2026-06-09',
    title: 'test2',
    excerpt: 'test2',
    tags: ['test'],
    url: '#post/test2',
    featured: false,
    content: `
      test2
      
    `,
  },
  {
    id: 'test3',
    date: '2026-06-10',
    title: 'test3',
    excerpt: 'test3',
    tags: ['test'],
    url: '#post/test3',
    featured: false,
    content: `
      test3
    `,
  },
  {
    id: 'music-system',
    date: '2026-06-11',
    title: '从零实现博客音乐播放系统 — SCF代理+黑胶唱片+在线播放',
    excerpt: '为个人博客集成网易云音乐API，用腾讯云SCF做无服务器代理，调用at38.cn聚合搜索获取可播放音源，前端纯CSS黑胶唱片动画，支持列表循环播放、自动切歌、状态图标等完整音乐体验。',
    tags: ['Music', 'SCF', 'JavaScript', 'CSS'],
    url: '#post/music-system',
    featured: true,
    content: `
      <p>博客有了，留言有了，特效也有了——但总觉得少了点什么。一个个人主页，如果能展示自己最近在听的音乐，甚至直接在线播放，那该多好？于是花了一天时间，从零搭建了一套完整的音乐系统。</p>

      <h2>架构总览</h2>
      <p>整个系统涉及四个环节：</p>
      <ul>
        <li><strong>网易云音乐 API</strong> — 获取我最近红心（喜欢的）歌曲</li>
        <li><strong>腾讯云 SCF 云函数</strong> — 无服务器代理，封装 API 调用 + 缓存</li>
        <li><strong>at38.cn 聚合搜索</strong> — 跨平台搜索可播放的 MP3 音源</li>
        <li><strong>前端黑胶唱片 UI</strong> — 纯 CSS 动画 + HTML5 Audio 播放</li>
      </ul>
      <p>数据流：<code>浏览器 → SCF → 网易云/at38.cn → 前端渲染播放</code></p>

      <h2>Step 1: 获取最近喜欢的歌</h2>
      <p>网易云没有官方公开 API，但有不少社区逆向的接口。我找到两个关键端点：</p>
      <ul>
        <li><strong>/api/user/playlist</strong> — 获取用户歌单列表，找到「喜欢的音乐」(specialType=5)</li>
        <li><strong>/api/playlist/detail</strong> — 获取歌单内歌曲，按红心时间倒序排列</li>
      </ul>
      <p>这些接口需要登录态 Cookie (<code>MUSIC_U</code>)，我用 SCF 环境变量存储，服务端代理调用，前端无感知。</p>
      <p>缓存策略：每天凌晨 4 点刷新一次到 COS，避免频繁请求触发风控。</p>

      <h3>SCF 核心代码（节选）</h3>
      <pre><code>// 每天凌晨 4 点刷新缓存
const now = new Date();
const today4am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4).getTime();
if (cached && cached.updatedAt > today4am) {
  return cached; // 今天已刷新过，直接返回缓存
}
// 请求网易云
const result = await fetchRecentSongsFromNetease();
await writeJSON('recent-song.json', result);
return result;</code></pre>

      <h2>Step 2: 搜索可播放音源</h2>
      <p>网易云 API 只返回歌曲信息，不提供直接播放链接。这时需要借助第三方音源搜索。</p>
      <p>我使用了 <strong>at38.cn</strong>——一个聚合搜索站点，覆盖 QQ 音乐、酷狗等多个平台。关键词格式为<code>歌名 歌手名</code>，搜索后解析 HTML 提取第一首歌曲的播放链接和封面。</p>

      <pre><code>// SCF /music-play 路由
const url = 'https://www.at38.cn/?keyword=' + encodeURIComponent(keyword);
const html = await fetch(url).then(r => r.text());
// 正则解析音乐卡片
const playUrl = html.match(/src="([^"]*action=play[^"]*)"/)[1];
return { found: true, audioUrl: playUrl };</code></pre>

      <p><strong>踩坑记录</strong>：at38.cn 是服务端渲染页面，返回的是完整 HTML 而非 JSON。SCF 需要手动解析 DOM 字符串。而且音频播放地址是 302 重定向到 QQ 音乐 CDN，所以前端 Audio 标签可以直接加载，不经过 SCF 流量。</p>

      <h2>Step 3: 黑胶唱片 UI</h2>
      <p>右下角的旋转黑胶是整系统的视觉核心。实现要点：</p>
      <ul>
        <li>外圈用多层 <code>box-shadow</code> 模拟黑胶纹理</li>
        <li>紫色边框呼应主题色 (<code>var(--color-accent)</code>)</li>
        <li>中心 50px 圆形区域显示专辑封面</li>
        <li>播放时旋转 (<code>animation: vinylSpin 4.4s linear infinite</code>)，暂停静止</li>
        <li>hover 0.2s 后弹出完整播放列表，JS 管理 hover 状态（不用 CSS :hover 避免旋转干扰）</li>
      </ul>

      <pre><code>/* 黑胶旋转动画 */
@keyframes vinylSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.vinyl-disc {
  animation: vinylSpin 4.4s linear infinite;
  animation-play-state: paused; /* 默认静止 */
}</code></pre>

      <h2>Step 4: 交互设计</h2>
      <ul>
        <li><strong>点击黑胶</strong>：播放 / 暂停切换，有 100ms 冷却防连点误触</li>
        <li><strong>播放列表</strong>：黑胶 hover 弹出全部 5 首，当前歌曲紫色高亮</li>
        <li><strong>点击列表歌曲</strong>：切换黑胶封面 + 搜索播放该歌曲（不再跳转网易云）</li>
        <li><strong>自动循环</strong>：歌曲播完自动切下一首，5 首循环，搜不到音源自动跳过</li>
        <li><strong>状态图标</strong>：半透明白色播放/暂停图标（32px），hover 显示，状态切换 1.5s 淡入淡出</li>
        <li><strong>进入页面</strong>：自动播放最近喜欢的歌（浏览器允许时）</li>
      </ul>

      <h2>技术亮点与踩坑</h2>

      <h3>坑1：弹出列表跟随黑胶旋转</h3>
      <p>最初把 popup 放在 <code>.vinyl-disc</code> 内部，作为旋转元素的子节点，自然跟着转。解决方案：外包一层 <code>.vinyl-wrapper</code>，popup 和 disc 同级，各自独立控制。</p>

      <h3>坑2：黑胶点击无效</h3>
      <p>起初有两个 click 监听器同时挂在黑胶上：一个跳转网易云页面，一个控制播放。先注册的打开新窗口，后注册的播放被拦截。最后合并为一个统一 handler，有音源就播放/暂停，没有才跳转。</p>

      <h3>坑3：网易云歌单 API 在 SCF 返回空</h3>
      <p>从本地 curl 测试正常，部署到 SCF 后 playlist 列表为空。排查发现 SCF 的出口 IP 可能被网易云降级处理（Cookie 验证更严格）。解决方案：跳过歌单查找步骤，直接用本地测试时得到的 liked playlist ID (2488546807) 调 detail API。</p>

      <h3>坑4：音量与自动播放策略</h3>
      <p>浏览器自动播放限制很严格——Chrome 要求用户先与页面交互。首次访问时自动播放会被拦截（<code>.play()</code> 返回 rejected Promise），catch 忽略即可。后续用 <code>musicAudio.volume = 0.19</code> 保持低音量不打扰。</p>

      <h2>总结</h2>
      <p>这套音乐系统的核心思路是<strong>「借力」</strong>：不自己爬数据、不存音乐文件、不做流媒体服务，而是作为"胶水层"把网易云（歌曲数据）+ at38.cn（音源搜索）+ QQ 音乐（CDN 流）串联起来。SCF 只负责代理请求和缓存，前端只负责渲染和播放，各司其职。</p>
      <p>整个系统零外部前端依赖，纯原生 JS + CSS 实现。SCF 代码也只用 Node.js 内置模块。总共新增约 200 行 SCF 代码和 300 行前端代码。</p>
      <p>后续可以扩展的方向：自定义域名解决梯子阻断问题、播放进度条、歌词显示。</p>
    `,
  }
];
