/**
 * ============================================================
 *  Component Renderer — 根据数据渲染 HTML 组件
 * ============================================================
 * 所有 DOM 生成逻辑集中在这里
 * 修改某个区块的 HTML 结构只需改对应函数
 */

const Renderer = (() => {
  // ---- 导航栏 ----
  function renderNavbar(config) {
    const brandHTML = config.site.name
      .split('')
      .map((ch, i) => (i === 1 ? `<span class="accent">${ch}</span>` : ch))
      .join('');

    const linksHTML = config.nav
      .map(item => {
        const target = item.external ? ' target="_blank" rel="noopener"' : '';
        return `<li><a href="${item.href}"${target}>${item.label}</a></li>`;
      })
      .join('');

    return `
    <nav class="navbar" id="navbar">
      <div class="navbar-inner">
        <a href="#" class="nav-brand">${brandHTML}</a>
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="18" x2="20" y2="18"/>
          </svg>
        </button>
        <ul class="nav-links" id="navLinks">
          ${linksHTML}
          <li><button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">🌙</button></li>
        </ul>
      </div>
    </nav>`;
  }

  // ---- Hero 区块 ----
  function renderHero(config) {
    return `
    <section class="hero fade-in fade-in-1" id="about">
      <img
        class="hero-avatar"
        src="${config.author.avatar}"
        alt="${config.author.name} avatar"
        width="120" height="120"
        onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%236c63ff%22 width=%22100%22 height=%22100%22 rx=%2250%22/><text x=%2250%22 y=%2255%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2240%22 font-family=%22sans-serif%22>Y</text></svg>'"
      />
      <h1 class="hero-name">${config.author.name}</h1>
      <p class="hero-username">
        <a href="https://github.com/${config.github.username}" target="_blank" rel="noopener">@${config.github.username}</a>
      </p>
      <p class="hero-bio">${config.author.bio}</p>
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="stat-num" id="statRepos">-</div>
          <div class="stat-label">Repositories</div>
        </div>
        <div class="hero-stat">
          <div class="stat-num" id="statFollowers">-</div>
          <div class="stat-label">Followers</div>
        </div>
        <div class="hero-stat">
          <div class="stat-num" id="statFollowing">-</div>
          <div class="stat-label">Following</div>
        </div>
        <div class="hero-stat">
          <div class="stat-num" id="statJoined">-</div>
          <div class="stat-label">Joined</div>
        </div>
      </div>
    </section>`;
  }

  // ---- 博客文章区块 ----
  function renderBlogSection(posts) {
    const cardsHTML = posts
      .map(post => {
        const tagsHTML = post.tags.map(t => `<span class="post-tag">${t}</span>`).join('');
        const featuredClass = post.featured ? ' featured' : '';
        return `
        <article class="post-card${featuredClass}">
          <div class="post-date">${post.date}</div>
          <h3 class="post-title">${post.title}</h3>
          <p class="post-excerpt">${post.excerpt}</p>
          <div class="post-tags">${tagsHTML}</div>
        </article>`;
      })
      .join('');

    return `
    <section class="section fade-in fade-in-2" id="blog">
      <h2 class="section-title">📝 Latest Posts</h2>
      <div class="posts-grid">
        ${cardsHTML}
      </div>
    </section>`;
  }

  // ---- Projects 区块（容器，内容由 GitHub API 动态填充）----
  function renderProjectsSection() {
    return `
    <section class="section fade-in fade-in-3" id="projects">
      <h2 class="section-title">🚀 Projects</h2>
      <div class="repos-grid" id="reposContainer">
        ${GitHubAPI.renderLoading()}
      </div>
    </section>`;
  }

  // ---- 归档时间线区块 ----
  function renderArchiveSection(posts) {
    const itemsHTML = posts
      .map(post => `
        <div class="timeline-item">
          <div class="timeline-date">${post.date}</div>
          <div class="timeline-title"><a href="${post.url}">${post.title}</a></div>
        </div>`)
      .join('');

    return `
    <section class="section fade-in fade-in-4" id="archive">
      <h2 class="section-title">📚 Archive</h2>
      <div class="timeline">
        ${itemsHTML}
      </div>
    </section>`;
  }

  // ---- 页脚 ----
  function renderFooter(config) {
    const linksHTML = config.footerLinks
      .map(item => `<a href="${item.href}">${item.label}</a>`)
      .join('');

    return `
    <footer class="footer">
      <div class="footer-links">${linksHTML}</div>
      <p>${config.footerText}</p>
    </footer>`;
  }

  // ---- 留言区 ----
  function renderCommentsSection() {
    if (typeof Comments !== 'undefined' && Comments.renderSection) {
      return Comments.renderSection();
    }
    return '';
  }

  // ---- 右侧快速跳转侧边栏 ----
  function renderSidebar(config) {
    const items = config.nav
      .filter(item => !item.external)
      .map(item => {
        const id = item.href.replace('#', '');
        return `<button class="sidebar-dot" data-target="${item.href}" data-section="${id}">
          <span class="sidebar-label">${item.label}</span>
        </button>`;
      })
      .join('');

    return `
    <nav class="sidebar" id="sidebar" aria-label="Page sections">
      <div class="sidebar-inner">
        ${items}
      </div>
    </nav>`;
  }

  // ---- Back to Top 按钮 ----
  function renderBackToTop() {
    return `<button class="back-to-top" id="backToTop" aria-label="Back to top">↑</button>`;
  }

  return {
    renderNavbar,
    renderHero,
    renderBlogSection,
    renderProjectsSection,
    renderArchiveSection,
    renderCommentsSection,
    renderSidebar,
    renderFooter,
    renderBackToTop,
  };
})();
