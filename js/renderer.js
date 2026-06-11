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

  // ---- Social icon SVGs ----
  const SOCIAL_ICONS = {
    github: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
    twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    mail: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 4L12 13 2 4"/></svg>',
    website: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    qq: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  };

  // ---- Hero 区块 ----
  function renderHero(config) {
    // 社交图标
    const socialHTML = (config.social || [])
      .filter(s => s.url && s.icon)
      .map(s => {
        const svg = SOCIAL_ICONS[s.icon] || s.icon;
        const qqAttr = s.qq ? ` data-action="qq" data-qq="${s.qq}"` : '';
        const targetAttr = s.qq ? '' : ' target="_blank" rel="noopener"';
        return `<a href="${s.url}" class="hero-social-link"${targetAttr} title="${s.label || ''}"${qqAttr}>${svg}</a>`;
      })
      .join('');

    return `
    <section class="hero fade-in fade-in-1" id="about">
      <div class="hero-avatar-wrapper">
        <img
          class="hero-avatar"
          src="${config.author.avatar}"
          alt="${config.author.name} avatar"
          width="120" height="120"
          onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%236c63ff%22 width=%22100%22 height=%22100%22 rx=%2250%22/><text x=%2250%22 y=%2255%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2240%22 font-family=%22sans-serif%22>Y</text></svg>'"
        />
      </div>
      <h1 class="hero-name">${config.author.name}</h1>
      <p class="hero-username">
        <a href="https://github.com/${config.github.username}" target="_blank" rel="noopener">@${config.github.username}</a>
      </p>
      <p class="hero-bio">${config.author.bio}</p>
      ${socialHTML ? `<div class="hero-social">${socialHTML}</div>` : ''}
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
        <div class="hero-stat">
          <div class="stat-num" id="statVisits">-</div>
          <div class="stat-label">Visits</div>
        </div>
      </div>
    </section>`;
  }

  // ---- 辅助：过滤空白文章（标题和正文都为空） ----
  function filterNonBlank(posts) {
    return posts.filter(p => (p.title || '').trim() || (p.content || '').trim());
  }

  // ---- 辅助：文章排序 ----
  // 星标文章始终置顶；星标和非星标各自按当前模式排序
  function sortPosts(posts, mode, articleViews) {
    const featured = posts.filter(p => p.featured);
    const normal = posts.filter(p => !p.featured);

    const sortFn = (mode === 'popular')
      ? (a, b) => {
          const va = (articleViews[a.id] && articleViews[a.id].count) || 0;
          const vb = (articleViews[b.id] && articleViews[b.id].count) || 0;
          if (vb !== va) return vb - va;
          return new Date(b.date) - new Date(a.date);
        }
      : (a, b) => new Date(b.date) - new Date(a.date);

    featured.sort(sortFn);
    normal.sort(sortFn);

    return [...featured, ...normal];
  }

  // ---- 博客文章区块 ----
  function renderBlogSection(posts, sortMode, articleViews) {
    const validPosts = filterNonBlank(posts);

    // 排序
    const sorted = sortPosts(validPosts, sortMode || 'latest', articleViews || {});

    const renderCard = post => {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      let tags = post.tags;
      let tagsHTML;
      if (isMobile && tags.length > 2) {
        tagsHTML = tags.slice(0, 2).map(t => `<span class="post-tag">${t}</span>`).join('')
          + '<span class="post-tag post-tag-more">...</span>';
      } else {
        tagsHTML = tags.map(t => `<span class="post-tag">${t}</span>`).join('');
      }
      const featuredClass = post.featured ? ' featured' : '';

      if (isMobile) {
        return `
        <a href="${post.url}" class="post-card-link" data-post-id="${post.id}">
          <article class="post-card${featuredClass}">
            <h3 class="post-title">${post.title}</h3>
            <p class="post-excerpt">${post.excerpt}</p>
            <div class="post-meta-row">
              <div class="post-tags">${tagsHTML}</div>
              <div class="post-date">${post.date}</div>
            </div>
          </article>
        </a>`;
      }

      return `
        <a href="${post.url}" class="post-card-link" data-post-id="${post.id}">
          <article class="post-card${featuredClass}">
            <div class="post-date">${post.date}</div>
            <h3 class="post-title">${post.title}</h3>
            <p class="post-excerpt">${post.excerpt}</p>
            <div class="post-tags">${tagsHTML}</div>
          </article>
        </a>`;
    };

    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const INITIAL_COUNT = isMobile ? 4 : 6;
    const hasMore = sorted.length > INITIAL_COUNT;
    const visibleCards = sorted.slice(0, INITIAL_COUNT).map(renderCard).join('');
    const hiddenCards = hasMore
      ? sorted.slice(INITIAL_COUNT).map(p => renderCard(p).replace('post-card-link', 'post-card-link post-card-hidden')).join('')
      : '';

    return `
    <section class="section fade-in fade-in-2" id="blog">
      <div class="section-header-row">
        <h2 class="section-title">📝 Latest Posts</h2>
        <div class="posts-sort-bar" id="postsSortBar">
          <button class="sort-btn${(sortMode || 'latest') === 'latest' ? ' active' : ''}" data-sort="latest">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            最新
          </button>
          <button class="sort-btn${(sortMode || 'latest') === 'popular' ? ' active' : ''}" data-sort="popular">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            最多浏览
          </button>
        </div>
      </div>
      <div class="posts-grid" id="postsGrid">
        ${visibleCards}
        ${hiddenCards}
      </div>
      ${hasMore ? `
      <div class="posts-show-all-wrap">
        <button class="posts-show-all-btn" id="showAllBtn">
          显示全部 <span class="show-all-count">(${sorted.length - INITIAL_COUNT})</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>` : ''}
    </section>`;
  }

  // ---- 文章详情页 ----
  function renderPostDetail(post) {
    const tagsHTML = post.tags.map(t => `<span class="post-tag">${t}</span>`).join('');
    return `
    <article class="post-detail fade-in fade-in-1">
      <a href="#" class="post-detail-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        返回首页
      </a>
      <header class="post-detail-header">
        <div class="post-date">${post.date}</div>
        <h1 class="post-detail-title">${post.title}</h1>
        <div class="post-tags">${tagsHTML}</div>
      </header>
      <div class="post-body">${post.content}</div>
    </article>`;
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
    const validPosts = filterNonBlank(posts);
    const ARCHIVE_COUNT = window.matchMedia('(max-width: 640px)').matches ? 6 : 10;
    const hasMore = validPosts.length > ARCHIVE_COUNT;
    const visibleItems = validPosts.slice(0, ARCHIVE_COUNT);
    const hiddenItems = validPosts.slice(ARCHIVE_COUNT);

    const renderItem = p => `
        <div class="timeline-item">
          <div class="timeline-date">${p.date}</div>
          <div class="timeline-title"><a href="${p.url}">${p.title}</a></div>
        </div>`;

    const visibleHTML = visibleItems.map(renderItem).join('');
    const hiddenHTML = hasMore
      ? hiddenItems.map(p => `<span class="timeline-hidden" style="display:none">${renderItem(p)}</span>`).join('')
      : '';

    return `
    <section class="section fade-in fade-in-4" id="archive">
      <h2 class="section-title">📚 Archive</h2>
      <div class="timeline" id="archiveTimeline">
        ${visibleHTML}
        ${hiddenHTML}
      </div>
      ${hasMore ? `
      <div class="posts-show-all-wrap">
        <button class="posts-show-all-btn" id="archiveShowAllBtn">
          显示全部 <span class="show-all-count">(${hiddenItems.length})</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>` : ''}
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
        <div class="sidebar-divider"></div>
        <button class="sidebar-dot sidebar-top" id="sidebarBackToTop" aria-label="回到顶部">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
          <span class="sidebar-label">回到顶部</span>
        </button>
      </div>
    </nav>`;
  }

  // ---- Back to Top 按钮（移动端/文章页备用） ----
  function renderBackToTop() {
    return `<button class="back-to-top" id="backToTop" aria-label="Back to top">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
    </button>`;
  }

  // ---- 黑胶唱片（右下角音乐图标） ----
  function renderMusicDisc() {
    const defaultCover = 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<rect width="100" height="100" rx="50" fill="%236c63ff"/>' +
      '<text x="50" y="62" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="48" font-weight="700" font-family="sans-serif">♪</text>' +
      '</svg>'
    );
    // 72 根音柱，5° 间隔，无间隙环绕黑胶
    // 0°-115° 低频暖紫 / 120°-235° 中频亮紫 / 240°-355° 高频冷蓝
    var barCount = 72;
    var barClasses = [];
    for (var i = 0; i < barCount; i++) {
      if (i < 24) barClasses.push('bass');
      else if (i < 48) barClasses.push('mid');
      else barClasses.push('treble');
    }
    var barsHTML = '';
    for (var j = 0; j < barCount; j++) {
      var angle = j * (360 / barCount);
      barsHTML += '<div class="vinyl-bar ' + barClasses[j] + '" style="transform: rotate(' + angle.toFixed(1) + 'deg) translateY(var(--bar-gap, -30px))"></div>';
    }
    // 回顶按钮（内置于黑胶上方，共享同一图层）
    var backToTopHTML = '<button class="back-to-top" id="backToTop" aria-label="Back to top">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>' +
      '</button>';

    return `
    <div class="vinyl-wrapper" id="musicDiscWrap">
      <div class="vinyl-bars">${barsHTML}</div>
      <div class="vinyl-disc" id="musicDisc" title="最近在听">
        <div class="vinyl-center">
          <img class="vinyl-cover" src="${defaultCover}" alt="music" width="22" height="22" />
        </div>
      </div>
      <div class="vinyl-state-icon" id="vinylStateIcon"></div>
      ${backToTopHTML}
    </div>`;
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
    renderMusicDisc,
    renderPostDetail,
  };
})();
