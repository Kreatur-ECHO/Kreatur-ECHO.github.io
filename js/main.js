/**
 * ============================================================
 *  Main Entry — 初始化 & 事件绑定 & 哈希路由
 * ============================================================
 */

(function () {
  'use strict';

  // ---- 主题初始化（全局，仅一次） ----
  ThemeManager.init();
  ThemeManager.listenSystem();
  ThemeManager.updateToggleIcon();

  // ---- 检查必需的全局变量 ----
  if (typeof SiteConfig === 'undefined') {
    console.error('[Blog] SiteConfig not found. Make sure data/config.js is loaded before js/main.js');
    return;
  }
  if (typeof BlogPosts === 'undefined') {
    console.error('[Blog] BlogPosts not found. Make sure data/posts.js is loaded before js/main.js');
    return;
  }

  const app = document.getElementById('app');
  let currentView = null; // 'home' | 'post'

  // ---- 排序状态 ----
  let postSortMode = 'latest'; // 'latest' | 'popular'
  let articleViews = {};       // { "article-id": { count: N, days: {...} } }

  // ---- API 地址 ----
  const VISITS_API = (typeof SiteConfig !== 'undefined' && SiteConfig.likesApi)
    ? SiteConfig.likesApi + '/visits' : '';
  const ARTICLE_VIEWS_API = (typeof SiteConfig !== 'undefined' && SiteConfig.likesApi)
    ? SiteConfig.likesApi + '/article-views' : '';

  // ---- 哈希路由 ----
  function routeFromHash() {
    const hash = window.location.hash;

    // 管理面板
    if (hash === '#admin') {
      renderAdminPage();
      return;
    }

    // 文章详情
    const postMatch = hash.match(/^#post\/(.+)$/);
    if (postMatch) {
      const postId = postMatch[1];
      const post = BlogPosts.find(p => p.id === postId);
      if (post) {
        renderPostPage(post);
      } else {
        window.location.hash = '';
      }
      return;
    }

    // 主页：如果已经在主页，只滚动到锚点，不重渲染
    if (currentView === 'home') {
      scrollToHash(hash);
      return;
    }

    // 首次加载 → 回到顶部；导航切换 → 滚动到锚点
    const isInitialLoad = (currentView === null);
    renderHomePage();
    if (!isInitialLoad) {
      setTimeout(() => scrollToHash(hash), 50);
    }
  }

  function scrollToHash(hash) {
    if (!hash) return;
    const id = hash.replace('#', '');
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // 初始路由
  routeFromHash();

  // 监听哈希变化（带防抖，快速连续点击只执行最后一次）
  let routeDebounce = null;
  window.addEventListener('hashchange', () => {
    clearTimeout(routeDebounce);
    routeDebounce = setTimeout(() => {
      if (currentView === 'admin') {
        if (typeof Admin !== 'undefined') Admin.destroy();
      }
      routeFromHash();
    }, 80);
  });

  // ============================================================
  //  主页渲染
  // ============================================================
  function renderHomePage() {
    // 离开文章页时清理
    if (currentView === 'post') {
      // 文章页没有需要特殊清理的
    }
    currentView = 'home';

    const sectionBuilders = {
      hero:    () => Renderer.renderHero(SiteConfig),
      blog:    () => Renderer.renderBlogSection(BlogPosts, postSortMode, articleViews),
      projects:() => Renderer.renderProjectsSection(),
      archive: () => Renderer.renderArchiveSection(BlogPosts),
      comments:() => Renderer.renderCommentsSection(),
    };

    const enabledSections = Object.entries(SiteConfig.sections)
      .filter(([_, cfg]) => cfg.enabled)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([name]) => name);

    const sectionsHTML = enabledSections
      .map(name => (sectionBuilders[name] ? sectionBuilders[name]() : ''))
      .join('\n');

    app.innerHTML = `
      ${Renderer.renderNavbar(SiteConfig)}
      <main>
        ${sectionsHTML}
      </main>
      ${Renderer.renderSidebar(SiteConfig)}
      ${Renderer.renderFooter(SiteConfig)}
      ${Renderer.renderBackToTop()}
    `;

    // ---- 事件绑定 ----
    bindHomeEvents();
    initSidebarScrollSpy();
    initQQButton();
    loadGitHubData();
    loadVisitCount();
    loadArticleViews();

    // ---- 留言模块 ----
    if (typeof Comments !== 'undefined') {
      Comments.init();
      Comments.bindEvents();
    }

    // ---- 鼠标特效 ----
    if (typeof CursorEffects !== 'undefined') {
      CursorEffects.init();
    }

    // 回到顶部
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ============================================================
  //  文章详情页渲染
  // ============================================================
  function renderPostPage(post) {
    // 离开主页时清理特效
    if (currentView === 'home') {
      if (typeof CursorEffects !== 'undefined') {
        CursorEffects.destroy();
      }
    }
    currentView = 'post';

    app.innerHTML = `
      ${Renderer.renderNavbar(SiteConfig)}
      <main>
        ${Renderer.renderPostDetail(post)}
      </main>
      ${Renderer.renderFooter(SiteConfig)}
      ${Renderer.renderBackToTop()}
    `;

    // 绑定主题等通用事件
    bindCommonEvents();

    // 记录文章浏览
    recordArticleView(post.id);

    // 回到顶部
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // ============================================================
  //  管理面板渲染
  // ============================================================
  function renderAdminPage() {
    // 离开主页时清理特效
    if (currentView === 'home') {
      if (typeof CursorEffects !== 'undefined') {
        CursorEffects.destroy();
      }
    }
    currentView = 'admin';

    if (typeof Admin !== 'undefined') {
      Admin.init();
    } else {
      app.innerHTML = '<div style="text-align:center;padding:4rem;color:var(--color-text-muted);">管理模块加载失败，请刷新页面重试。</div>';
    }
  }

  // ============================================================
  //  事件绑定
  // ============================================================

  /** 主页特有事件 */
  function bindHomeEvents() {
    bindCommonEvents();
    bindBlogSortBar();
    bindShowAll();
    // 主页额外的特定逻辑在 initSidebarScrollSpy / initQQButton / loadGitHubData 中
  }

  /** 通用事件（主页和文章页共享） */
  function bindCommonEvents() {
    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        ThemeManager.toggle();
        ThemeManager.updateToggleIcon();
      });
    }

    // 移动端导航
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
      });
      navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
      });
    }

    // 回到顶部
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
      window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 500);
      });
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 导航栏阴影
    const navbar = document.getElementById('navbar');
    if (navbar) {
      window.addEventListener('scroll', () => {
        navbar.classList.toggle('shadow', window.scrollY > 50);
      });
    }
  }

  // ============================================================
  //  侧边栏滚动监听（仅主页）
  // ============================================================
  function initSidebarScrollSpy() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const dots = sidebar.querySelectorAll('.sidebar-dot');
    if (dots.length === 0) return;

    const sectionEls = [];
    dots.forEach(dot => {
      const id = dot.dataset.section;
      const el = document.getElementById(id);
      if (el) sectionEls.push({ id, el, dot });
    });

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActive();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    function updateActive() {
      const scrollY = window.scrollY + 120;

      const heroEl = document.getElementById('about');
      if (!heroEl) return;

      if (window.scrollY < heroEl.offsetTop) {
        sidebar.classList.remove('visible');
        dots.forEach(d => d.classList.remove('active'));
        return;
      }
      sidebar.classList.add('visible');

      let activeId = null;
      for (let i = sectionEls.length - 1; i >= 0; i--) {
        if (sectionEls[i].el.offsetTop <= scrollY) {
          activeId = sectionEls[i].id;
          break;
        }
      }

      dots.forEach(d => {
        d.classList.toggle('active', d.dataset.section === activeId);
      });
    }

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const target = document.querySelector(dot.dataset.target);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    updateActive();
  }

  // ============================================================
  //  GitHub 数据加载（仅主页）
  // ============================================================
  async function loadGitHubData() {
    const username = SiteConfig.github.username;
    const fb = SiteConfig.github.fallback || {};

    if (fb.public_repos != null) setStat('statRepos', fb.public_repos);
    if (fb.followers != null)    setStat('statFollowers', fb.followers);
    if (fb.following != null)    setStat('statFollowing', fb.following);
    if (fb.created_at)           setStat('statJoined', fb.created_at.slice(0, 4));

    try {
      const user = await GitHubAPI.fetchUser(username);

      setStat('statRepos', user.public_repos ?? fb.public_repos ?? 0);
      setStat('statFollowers', user.followers ?? fb.followers ?? 0);
      setStat('statFollowing', user.following ?? fb.following ?? 0);
      // Joined 年份用 config fallback，不被 API 覆盖（固定值，不需实时更新）
    } catch (err) {
      console.warn('[Blog] Failed to fetch GitHub user data:', err);
      setStat('statRepos', fb.public_repos ?? '?');
      setStat('statFollowers', fb.followers ?? '?');
      setStat('statFollowing', fb.following ?? '?');
      setStat('statJoined', (fb.created_at || '').slice(0, 4) || '?');
    }

    const reposContainer = document.getElementById('reposContainer');
    if (!reposContainer) return;

    try {
      const repos = await GitHubAPI.fetchRepos(username, {
        sort: SiteConfig.github.reposSort,
        perPage: SiteConfig.github.reposPerPage,
      });

      if (!repos || repos.length === 0) {
        reposContainer.innerHTML = GitHubAPI.renderEmpty();
      } else {
        reposContainer.innerHTML = repos.map(GitHubAPI.renderRepoCard).join('');
      }
    } catch (err) {
      console.warn('[Blog] Failed to fetch GitHub repos:', err);
      reposContainer.innerHTML = GitHubAPI.renderError(username);
    }
  }

  function setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ============================================================
  //  累计访问计数（SCF + COS）
  // ============================================================
  async function loadVisitCount() {
    if (!VISITS_API) return;
    try {
      // 记录本次访问（每日每 IP 去重）
      await fetch(VISITS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit: true }),
      });
      // 获取累计数
      const res = await fetch(VISITS_API);
      if (res.ok) {
        const data = await res.json();
        setStat('statVisits', data.total ?? '?');
      }
    } catch (err) {
      console.warn('[Blog] Failed to load visit count:', err);
    }
  }

  // ============================================================
  //  文章浏览计数（SCF + COS）+ 排序
  // ============================================================
  async function loadArticleViews() {
    if (!ARTICLE_VIEWS_API) return;
    try {
      const res = await fetch(ARTICLE_VIEWS_API + '?t=' + Date.now());
      if (res.ok) {
        articleViews = await res.json();
      }
    } catch (err) {
      console.warn('[Blog] Failed to load article views:', err);
    }
  }

  async function recordArticleView(articleId) {
    if (!ARTICLE_VIEWS_API || !articleId) return;
    try {
      await fetch(ARTICLE_VIEWS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_id: articleId }),
      });
    } catch (err) {
      console.warn('[Blog] Failed to record article view:', err);
    }
  }

  function bindBlogSortBar() {
    const sortBar = document.getElementById('postsSortBar');
    if (!sortBar) return;

    sortBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.sort-btn');
      if (!btn) return;
      const newMode = btn.dataset.sort;
      if (postSortMode === newMode) return;

      postSortMode = newMode;

      // 更新按钮状态
      sortBar.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 重新渲染博客区块
      const blogSection = document.getElementById('blog');
      if (!blogSection) return;

      // 重建整个 blog section
      const newHTML = Renderer.renderBlogSection(BlogPosts, postSortMode, articleViews);
      const temp = document.createElement('div');
      temp.innerHTML = newHTML;
      const newSection = temp.firstElementChild;
      if (newSection) {
        blogSection.parentNode.replaceChild(newSection, blogSection);
        // 重新绑定排序事件
        bindBlogSortBar();
        bindShowAll();
      }
    });
  }

  function bindShowAll() {
    const btn = document.getElementById('showAllBtn');
    if (!btn) return;

    const hiddenCards = document.querySelectorAll('.post-card-hidden');

    btn.addEventListener('click', () => {
      const isOpen = btn.dataset.open === 'true';

      if (isOpen) {
        // 收起
        hiddenCards.forEach(el => { el.style.display = 'none'; });
        btn.dataset.open = 'false';
        btn.innerHTML = `显示全部 <span class="show-all-count">(${hiddenCards.length})</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
      } else {
        // 展开
        hiddenCards.forEach(el => { el.style.display = 'contents'; });
        btn.dataset.open = 'true';
        btn.innerHTML = `收起
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 15 12 9 18 15"/></svg>`;
      }
    });
  }

  // ============================================================
  //  QQ 按钮（仅主页 Hero 区域）
  // ============================================================
  function initQQButton() {
    var qqLink = document.querySelector('[data-action="qq"]');
    if (!qqLink) return;

    var qqNumber = qqLink.getAttribute('data-qq');
    var popup = null;
    var hideTimer = null;
    var isHoveringPopup = false;
    var isHoveringBtn = false;

    function showPopup() {
      if (popup) return;
      popup = document.createElement('div');
      popup.className = 'qq-popup';
      popup.innerHTML =
        '<div class="qq-popup-arrow"></div>' +
        '<p class="qq-popup-title">QQ 号</p>' +
        '<div class="qq-popup-row">' +
          '<code class="qq-popup-number">' + qqNumber + '</code>' +
          '<button class="qq-popup-copy" id="qqCopyBtn">复制</button>' +
        '</div>' +
        '<p class="qq-popup-hint">复制后打开 QQ 搜索添加好友</p>';

      var rect = qqLink.getBoundingClientRect();
      popup.style.left = (rect.left + rect.width / 2) + 'px';
      popup.style.bottom = (window.innerHeight - rect.top + 10) + 'px';

      document.body.appendChild(popup);

      document.getElementById('qqCopyBtn').addEventListener('click', function (e) {
        e.stopPropagation();
        navigator.clipboard.writeText(qqNumber).then(function () {
          var btn = document.getElementById('qqCopyBtn');
          btn.textContent = '✓ 已复制';
          btn.classList.add('copied');
          setTimeout(function () {
            if (popup && popup.parentNode) popup.remove();
            popup = null;
          }, 1200);
        }).catch(function () {
          var range = document.createRange();
          range.selectNodeContents(document.querySelector('.qq-popup-number'));
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.getElementById('qqCopyBtn').textContent = '已选中';
        });
      });

      popup.addEventListener('mouseenter', function () {
        isHoveringPopup = true;
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      });
      popup.addEventListener('mouseleave', function () {
        isHoveringPopup = false;
        tryHidePopup();
      });
    }

    function tryHidePopup() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!isHoveringBtn && !isHoveringPopup && popup) {
          popup.remove();
          popup = null;
        }
      }, 200);
    }

    qqLink.addEventListener('mouseenter', function () {
      isHoveringBtn = true;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      showPopup();
    });

    qqLink.addEventListener('mouseleave', function () {
      isHoveringBtn = false;
      tryHidePopup();
    });
  }
})();
