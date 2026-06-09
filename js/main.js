/**
 * ============================================================
 *  Main Entry — 初始化 & 事件绑定
 * ============================================================
 */

(function () {
  'use strict';

  // ---- 主题初始化 ----
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

  // ---- 组装页面 ----
  const app = document.getElementById('app');

  // 按 sections.order 排序，决定哪些区块渲染
  const sectionBuilders = {
    hero:    () => Renderer.renderHero(SiteConfig),
    blog:    () => Renderer.renderBlogSection(BlogPosts),
    projects:() => Renderer.renderProjectsSection(),
    archive: () => Renderer.renderArchiveSection(BlogPosts),
    comments:() => Renderer.renderCommentsSection(),
  };

  const enabledSections = Object.entries(SiteConfig.sections)
    .filter(([_, cfg]) => cfg.enabled)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([name]) => name);

  // 渲染各区块
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
  bindEvents();

  // ---- 启动侧边栏滚动监听 ----
  initSidebarScrollSpy();

  // ---- 启动留言模块 ----
  if (typeof Comments !== 'undefined') {
    Comments.init();
    Comments.bindEvents();
  }

  // ---- 启动鼠标特效 ----
  if (typeof CursorEffects !== 'undefined') {
    CursorEffects.init();
  }

  // ---- QQ 按钮点击处理 ----
  initQQButton();

  // ---- 加载 GitHub 数据 ----
  loadGitHubData();

  // ============================================================
  //  内部函数
  // ============================================================

  function bindEvents() {
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

  function initSidebarScrollSpy() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const dots = sidebar.querySelectorAll('.sidebar-dot');
    if (dots.length === 0) return;

    // 收集各区块的 DOM 元素
    const sectionEls = [];
    dots.forEach(dot => {
      const id = dot.dataset.section;
      const el = document.getElementById(id);
      if (el) sectionEls.push({ id, el, dot });
    });

    // 节流滚动处理
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
      const scrollY = window.scrollY + 120; // 偏移量，让高亮更准确

      // 在 hero 区域以上时隐藏侧边栏
      const heroEl = document.getElementById('about');
      const heroBottom = heroEl ? heroEl.offsetTop + heroEl.offsetHeight : 400;

      if (window.scrollY < heroEl.offsetTop) {
        sidebar.classList.remove('visible');
        dots.forEach(d => d.classList.remove('active'));
        return;
      }
      sidebar.classList.add('visible');

      // 从后往前找第一个在视口上方的区块
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

    // 点击跳转
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const target = document.querySelector(dot.dataset.target);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // 初始状态
    updateActive();
  }

  async function loadGitHubData() {
    const username = SiteConfig.github.username;
    const fb = SiteConfig.github.fallback || {};

    try {
      const user = await GitHubAPI.fetchUser(username);

      // 更新统计数字
      setStat('statRepos', user.public_repos ?? fb.public_repos ?? 0);
      setStat('statFollowers', user.followers ?? fb.followers ?? 0);
      setStat('statFollowing', user.following ?? fb.following ?? 0);
      setStat('statJoined', (user.created_at || fb.created_at || '').slice(0, 4));

      // 不覆盖 config.js 中手动设置的 bio（如需同步 GitHub bio，取消下面注释）
      // if (user.bio) {
      //   const bioEl = document.querySelector('.hero-bio');
      //   if (bioEl) bioEl.textContent = user.bio;
      // }
    } catch (err) {
      console.warn('[Blog] Failed to fetch GitHub user data:', err);
      // 使用静态兜底值
      setStat('statRepos', fb.public_repos ?? '?');
      setStat('statFollowers', fb.followers ?? '?');
      setStat('statFollowing', fb.following ?? '?');
      setStat('statJoined', (fb.created_at || '').slice(0, 4) || '?');
    }

    // 加载仓库
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

  function initQQButton() {
    var qqLink = document.querySelector('[data-action="qq"]');
    if (!qqLink) return;

    var qqNumber = qqLink.getAttribute('data-qq');
    var popup = null;
    var hideTimer = null;
    var isHoveringPopup = false;
    var isHoveringBtn = false;

    function showPopup() {
      if (popup) return; // 已显示
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

      // 定位在按钮上方
      var rect = qqLink.getBoundingClientRect();
      popup.style.left = (rect.left + rect.width / 2) + 'px';
      popup.style.bottom = (window.innerHeight - rect.top + 10) + 'px';

      document.body.appendChild(popup);

      // 复制按钮事件
      document.getElementById('qqCopyBtn').addEventListener('click', function (e) {
        e.stopPropagation(); // 防止冒泡触发 tencent:// 跳转
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

      // 面板 hover 跟踪
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

    // 鼠标悬停按钮 → 显示面板
    qqLink.addEventListener('mouseenter', function () {
      isHoveringBtn = true;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      showPopup();
    });

    qqLink.addEventListener('mouseleave', function () {
      isHoveringBtn = false;
      tryHidePopup();
    });

    // 点击按钮 → 不阻止默认行为，让浏览器处理 tencent:// 协议
    // （原生 <a href> 点击是真实的用户手势，浏览器会允许自定义协议）
  }
})();
