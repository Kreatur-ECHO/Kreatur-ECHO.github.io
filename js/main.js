/**
 * ============================================================
 *  Main Entry — 初始化 & 事件绑定 & 哈希路由
 * ============================================================
 */

(function () {
  'use strict';

  // ---- 入场动画遮罩 ---- 点击月亮后渐隐，露出下方主页 ----
  var introOverlay = document.getElementById('introOverlay');
  var introMoon    = document.getElementById('introMoon');
  var introClock   = document.getElementById('introClock');
  // 金粉碎光
  var sparksEl = document.getElementById('introSparks');
  if (sparksEl) {
    var h = '';
    for (var i = 0; i < 18; i++) {
      var sz = 1.5 + Math.random() * 3;
      var dur = 5 + Math.random() * 10;
      var dly = Math.random() * dur;
      var angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI * 1.6;
      var xo = Math.cos(angle) * (50 + Math.random() * 80);
      var yo = 30 + Math.sin(angle) * 60;
      h += '<div class="intro-spark" style="'
        + 'width:' + sz + 'px;height:' + sz + 'px;'
        + 'top:calc(50% + ' + yo.toFixed(0) + 'px);left:calc(50% + ' + xo.toFixed(0) + 'px);'
        + 'animation-duration:' + dur.toFixed(1) + 's;'
        + 'animation-delay:' + dly.toFixed(1) + 's;"></div>';
    }
    sparksEl.innerHTML = h;
  }
  // 时钟
  if (introClock) {
    function tick() {
      var now = new Date();
      var h = now.getHours();
      var m = now.getMinutes();
      introClock.textContent = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    tick();
    setInterval(tick, 1000);
  }
  if (introOverlay && introMoon) {
    introMoon.addEventListener('click', function (e) {
      e.stopPropagation();
      introOverlay.classList.add('dismissing');
      introOverlay.addEventListener('transitionend', function (ev) {
        if (ev.target === introOverlay && ev.propertyName === 'opacity') {
          introOverlay.style.display = 'none';
        }
      });
    });
  }

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
  const RECENT_SONG_API = (typeof SiteConfig !== 'undefined' && SiteConfig.likesApi)
    ? SiteConfig.likesApi + '/recent-song' : '';
  const MUSIC_PLAY_API = (typeof SiteConfig !== 'undefined' && SiteConfig.likesApi)
    ? SiteConfig.likesApi + '/music-play' : '';

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
      ${Renderer.renderMusicDisc()}
    `;
    app.setAttribute('data-view', 'home');

    // ---- 事件绑定 ----
    bindHomeEvents();
    initSidebarScrollSpy();
    initQQButton();
    loadGitHubData();
    loadVisitCount();
    loadArticleViews();
    trimOverflowTags();
    loadRecentSong();

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
      ${Renderer.renderMusicDisc()}
    `;
    app.setAttribute('data-view', 'post');

    // 绑定主题等通用事件
    bindCommonEvents();

    // 记录文章浏览
    recordArticleView(post.id);

    // 加载最近音乐
    loadRecentSong();

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
    bindArchiveShowAll();
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

    // 回到顶部：IntersectionObserver 监听 Hero 区域，Hero 不可见时显示
    var backToTop = document.getElementById('backToTop');
    var heroSection = document.getElementById('about');
    if (backToTop && heroSection) {
      var btObserver = new IntersectionObserver(function (entries) {
        backToTop.classList.toggle('visible', !entries[0].isIntersecting);
      }, { threshold: 0 });
      btObserver.observe(heroSection);
      backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 侧边栏回到顶部按钮
    const sidebarBackToTop = document.getElementById('sidebarBackToTop');
    if (sidebarBackToTop) {
      sidebarBackToTop.addEventListener('click', () => {
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

  // ---- 标签溢出检测：超出容器宽度的标签替换为 ... ----
  function trimOverflowTags() {
    var containers = document.querySelectorAll('.post-tags');
    for (var i = 0; i < containers.length; i++) {
      var c = containers[i];
      // 移除已有的 ...
      var more = c.querySelector('.post-tag-more');
      if (more) more.remove();
      // 获取当前标签
      var tags = c.querySelectorAll('.post-tag');
      if (tags.length <= 1) continue;
      // 从末尾移除直到不溢出
      var trimmed = false;
      while (c.scrollWidth > c.clientWidth && tags.length > 1) {
        tags[tags.length - 1].remove();
        tags = c.querySelectorAll('.post-tag');
        trimmed = true;
      }
      // 有裁剪则追加 ...
      if (trimmed) {
        var dot = document.createElement('span');
        dot.className = 'post-tag post-tag-more';
        dot.textContent = '...';
        c.appendChild(dot);
      }
    }
  }

  // ============================================================
  //  loadRecentSong — 从 SCF /recent-song 拉取网易云红心歌单(5首)
  //  同时构建黑胶hover弹出播放列表(.vinyl-popup)
  //  首次加载时自动调用 switchToSong() 开始播放第一首
  //  SPA页面切换时仅重建UI，保留播放状态
  // ============================================================
  async function loadRecentSong() {
    if (!RECENT_SONG_API) return;
    try {
      const res = await fetch(RECENT_SONG_API + '?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      const songs = data && data.songs;
      if (!songs || !songs.length) return;

      const disc = document.getElementById('musicDisc');
      const wrap = document.getElementById('musicDiscWrap');
      if (!disc || !wrap) return;

      // 未初始化时展示第一首；已初始化时展示当前正在播放的歌曲
      const displaySong = musicInitialized && songList[currentIndex]
        ? songList[currentIndex]
        : songs[0];

      const cover = disc.querySelector('.vinyl-cover');
      if (cover && displaySong.cover) {
        cover.src = displaySong.cover.replace(/^http:/, 'https:');
      }

      disc.title = `${displaySong.name} — ${displaySong.artist}`;
      disc.style.cursor = 'pointer';

      // 存储歌单用于列表循环（首次初始化时设置当前索引）
      songList = songs;
      if (!musicInitialized) {
        currentIndex = 0;
      }

      // 构建弹出播放列表（全部 5 首）
      let popupHTML = '<div class="vinyl-popup">';
      popupHTML += '<div class="vinyl-popup-title">最近喜欢<span class="vinyl-popup-refresh">每日 4:00 刷新</span></div>';
      popupHTML += '<div class="vinyl-popup-list">';
      songs.forEach((s, i) => {
        const safeCover = (s.cover || '').replace(/^http:/, 'https:');
        const songData = encodeURIComponent(JSON.stringify({ name: s.name, artist: s.artist, cover: s.cover, id: s.id }));
        const currentClass = i === currentIndex ? ' vinyl-popup-current' : '';
        popupHTML += `
          <div class="vinyl-popup-item${currentClass}" data-song="${songData}" title="${s.name} — ${s.artist}">
            <img class="vinyl-popup-cover" src="${safeCover}" alt="" loading="lazy" onerror="this.style.display='none'" />
            <div class="vinyl-popup-info">
              <div class="vinyl-popup-song">${s.name}</div>
              <div class="vinyl-popup-artist">${s.artist}</div>
            </div>
          </div>`;
      });
      popupHTML += '</div>';
      popupHTML += '</div>';

      // 移除旧 popup，插入新 popup
      const oldPopup = wrap.querySelector('.vinyl-popup');
      if (oldPopup) oldPopup.remove();
      wrap.insertAdjacentHTML('beforeend', popupHTML);

      // 点击列表项 → 切换歌曲 + 高亮当前
      const popupEl = wrap.querySelector('.vinyl-popup');
      if (popupEl) {
        popupEl.addEventListener('click', (e) => {
          const item = e.target.closest('.vinyl-popup-item');
          if (!item) return;
          try {
            const songInfo = JSON.parse(decodeURIComponent(item.dataset.song));
            // 更新当前索引
            const items = popupEl.querySelectorAll('.vinyl-popup-item');
            const idx = Array.from(items).indexOf(item);
            if (idx >= 0) currentIndex = idx;
            switchToSong(songInfo.name, songInfo.artist, songInfo.cover, songInfo.id);
            // 更新高亮
            items.forEach(el => el.classList.remove('vinyl-popup-current'));
            item.classList.add('vinyl-popup-current');
          } catch (_) {}
        });
      }

      // JS hover 控制：黑胶和 popup 各自监听，共享 hover 状态
      const popup = wrap.querySelector('.vinyl-popup');
      if (!popup) return;

      let hovering = false;
      let showTimer = null;
      let hideTimer = null;

      function showPopup() {
        clearTimeout(hideTimer);
        hovering = true;
        showTimer = setTimeout(() => {
          if (hovering) popup.classList.add('visible');
        }, 200);
      }

      function tryHide() {
        hovering = false;
        clearTimeout(showTimer);
        hideTimer = setTimeout(() => {
          if (!hovering) popup.classList.remove('visible');
        }, 500);
      }

      disc.addEventListener('mouseenter', showPopup);
      disc.addEventListener('mouseleave', tryHide);
      popup.addEventListener('mouseenter', showPopup);
      popup.addEventListener('mouseleave', tryHide);

      if (!musicInitialized) {
        // 首次加载：搜索可播放音源并自动播放
        musicInitialized = true;
        switchToSong(displaySong.name, displaySong.artist, displaySong.cover, displaySong.id);
      } else {
        // 页面切换：保留当前播放状态，仅重建 UI 交互
        setupDiscClick(songList[currentIndex] && songList[currentIndex].id);
        if (playing) {
          disc.style.animationPlayState = 'running';
          startBarDance();
        }
      }
    } catch (err) {
      console.warn('[Blog] Failed to load recent song:', err);
    }
  }

  // ============================================================
  //  MUSIC PLAYER STATE
  //  musicAudio: <Audio>元素, 非null且有src=点击toggle播放/暂停
  //  musicAudio为null或无src=点击重新获取音源(switchToSong)
  //  _playNextRetries: 全部歌曲无音源时防止无限循环(最多一轮)
  // ============================================================
  let musicAudio = null;       // <Audio> 元素引用
  let playing = false;         // 播放/暂停状态
  let clickLock = false;       // 防连点锁(100ms)
  let songList = [];           // [{name,artist,cover,id}] 5首
  let currentIndex = 0;        // songList当前索引
  let musicInitialized = false;// false=首次自动播放 true=SPA保留状态

  // 播放/暂停图标SVG, flashStateIcon()置入, CSS .visible控制opacity
  const PLAY_ICON = '<svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  let iconTimer = null;

  // ---- 音柱随机动画 ----
  var barTimer = null;

  function startBarDance() {
    if (barTimer) return;
    barTimer = setInterval(function () {
      var bs = document.querySelectorAll('.vinyl-bar');
      if (!bs.length) { stopBarDance(); return; }
      for (var i = 0; i < 72; i++) {
        if (Math.random() < 0.42) {
          var h = 2 + Math.floor(Math.random() * 10);
          if (bs[i]) bs[i].style.setProperty('--h', h + 'px');
        } else if (bs[i]) {
          var cur = parseFloat(bs[i].style.getPropertyValue('--h')) || 2;
          if (cur > 2) bs[i].style.setProperty('--h', Math.max(2, cur * 0.65) + 'px');
        }
      }
      for (var j = 0; j < 3; j++) {
        var bi = Math.floor(Math.random() * 24);
        if (bs[bi]) bs[bi].style.setProperty('--h', (4 + Math.floor(Math.random() * 8)) + 'px');
      }
    }, 70);
  }

  function stopBarDance() {
    if (barTimer) { clearInterval(barTimer); barTimer = null; }
    var bars = document.querySelectorAll('.vinyl-bar');
    // 长过渡 → 0.3s 渐出落回
    for (var k = 0; k < bars.length; k++) {
      bars[k].style.transition = 'height 0.5s ease-out';
      bars[k].style.setProperty('--h', '2px');
    }
  }

  // flashStateIcon — 即刻显示图标(不延迟), 1s后自动渐隐
  function flashStateIcon(isPlaying) {
    const icon = document.getElementById('vinylStateIcon');
    if (!icon) return;
    clearTimeout(iconTimer);
    // 先清除hover inline, 再立刻显示
    icon.style.transition = 'opacity 0s';
    icon.style.opacity = '0.6';
    icon.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    iconTimer = setTimeout(function () {
      icon.style.transition = 'opacity 0.3s ease';
      icon.style.opacity = '0';
    }, 500);
  }

  // fadeVolume — 音频音量渐变, target: 目标音量(0-1), duration: 渐变时长(ms), callback: 完成后回调
  var _fadeTimer = null;
  function fadeVolume(audio, target, duration, callback) {
    if (!audio) return;
    clearInterval(_fadeTimer);
    var steps = 30;
    var stepMs = duration / steps;
    var startVol = audio.volume;
    var delta = (target - startVol) / steps;
    var step = 0;
    _fadeTimer = setInterval(function () {
      step++;
      audio.volume = Math.max(0, Math.min(1, startVol + delta * step));
      if (step >= steps) {
        clearInterval(_fadeTimer);
        _fadeTimer = null;
        if (callback) callback();
      }
    }, stepMs);
  }

  // setupDiscClick — 黑胶点击行为(仅执行一次,clickReady守卫)
  // - musicAudio存在且有src: toggle播放/暂停
  // - musicAudio为null或无src: 重新调用switchToSong获取音源(不跳转网易云!)
  // - 同时绑定hover显示播控图标 + 初始化图标SVG(否则hover无可见效果)
  function setupDiscClick(songId) {
    const disc = document.getElementById('musicDisc');
    if (!disc || disc.dataset.clickReady) return;  // 仅执行一次
    disc.dataset.clickReady = '1';
    disc.addEventListener('click', function (e) {
      if (e.target.closest('.vinyl-popup')) return; // 点弹出列表不触发
      if (clickLock) return;
      clickLock = true;
      setTimeout(function () { clickLock = false; }, 500);

      if (musicAudio && musicAudio.src) {
        // toggle 播放/暂停 — 2秒音频淡入淡出
        if (playing) {
          fadeVolume(musicAudio, 0, 500, function () {
            musicAudio.pause();
          });
        } else {
          musicAudio.volume = 0;
          musicAudio.play().catch(function () {});
          fadeVolume(musicAudio, 0.19, 500);
        }
      } else if (songList.length && songList[currentIndex]) {
        // 无音源: 重新获取(不跳转网易云)
        var s = songList[currentIndex];
        switchToSong(s.name, s.artist, s.cover, s.id);
      }
    });

    // HOVER: inline style控制图标显隐
    // 使用inline而非CSS class, 因为.vinyl-wrapper尺寸塌缩CSS hover不可靠
    disc.addEventListener('mouseenter', function () {
      var icon = document.getElementById('vinylStateIcon');
      if (icon) { icon.style.opacity = '0.5'; icon.style.transition = 'opacity 0.3s ease'; }
    });
    disc.addEventListener('mouseleave', function () {
      var icon = document.getElementById('vinylStateIcon');
      if (icon) { icon.style.opacity = '0'; icon.style.transition = 'opacity 0.5s ease'; }
    });

    // 初始化图标SVG(空div即使设置opacity也无可见内容)
    var initIcon = document.getElementById('vinylStateIcon');
    if (initIcon && !initIcon.innerHTML.trim()) {
      initIcon.innerHTML = PLAY_ICON;
    }
  }

  // playNext — 当前歌曲无音源时自动切到下一首
  // _playNextRetries限制最多一轮(5首), 防止全部无音源时死循环
  var _playNextRetries = 0;
  function playNext() {
    if (!songList.length) return;
    _playNextRetries++;
    if (_playNextRetries > songList.length) {
      // 全部歌曲均无音源, 停止循环
      _playNextRetries = 0;
      return;
    }
    currentIndex = (currentIndex + 1) % songList.length;
    var s = songList[currentIndex];
    switchToSong(s.name, s.artist, s.cover, s.id);
    var popupEl = document.querySelector('.vinyl-popup');
    if (popupEl) {
      var items = popupEl.querySelectorAll('.vinyl-popup-item');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('vinyl-popup-current');
      if (items[currentIndex]) items[currentIndex].classList.add('vinyl-popup-current');
    }
  }

  // switchToSong — 调SCF /music-play获取可播放音源 → 创建<Audio>
  // SCF返回 {found:true, audioUrl:"jbsou.cn/api.php?..."}
  // audioUrl是重定向地址, 浏览器<Audio>自动跟随到网易云CDN(.mp3)
  // found=false或无audioUrl时 → playNext()尝试下一首
  // 成功获取音源后重置_playNextRetries
  async function switchToSong(name, artist, cover, songId) {
    if (!MUSIC_PLAY_API) return;
    const disc = document.getElementById('musicDisc');
    if (!disc) return;

    // 更新黑胶封面图
    const coverImg = disc.querySelector('.vinyl-cover');
    if (coverImg && cover) {
      coverImg.src = cover.replace(/^http:/, 'https:');
    }
    disc.title = `${name} — ${artist}`;

    // 绑定点击事件(仅首次, 由clickReady守卫)
    setupDiscClick(songId);

    try {
      // keyword是主要查询参数, id/name/artist供SCF备用
      const params = new URLSearchParams({
        keyword: `${name} ${artist}`,
        id: songId || '',
        name: name || '',
        artist: artist || ''
      });
      const res = await fetch(`${MUSIC_PLAY_API}?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.found || !data.audioUrl) {
        // 当前歌曲无音源 → 自动跳到下一首
        if (songList.length) playNext();
        return;
      }

      // 切换音频
      if (musicAudio) {
        musicAudio.pause();
        musicAudio.remove();
      }
      musicAudio = new Audio();
      musicAudio.src = data.audioUrl;
      musicAudio.preload = 'none';
      musicAudio.volume = 0;
      document.body.appendChild(musicAudio);

      // 先绑定事件再播放，确保 play/pause 状态正确
      musicAudio.addEventListener('play', () => {
        _playNextRetries = 0;
        playing = true;
        var discEl = document.getElementById('musicDisc');
        if (discEl) discEl.style.animationPlayState = 'running';
        flashStateIcon(true);
        startBarDance();
      });
      musicAudio.addEventListener('pause', () => {
        playing = false;
        var discEl = document.getElementById('musicDisc');
        if (discEl) discEl.style.animationPlayState = 'paused';
        flashStateIcon(false);
        stopBarDance();
      });
      musicAudio.addEventListener('ended', () => {
        playing = false;
        var discEl = document.getElementById('musicDisc');
        if (discEl) discEl.style.animationPlayState = 'paused';
        stopBarDance();
        playNext();
      });

      // 自动播放(从0淡入到0.19, 2秒)
      musicAudio.play().catch(function () {});
      fadeVolume(musicAudio, 0.19, 500);
    } catch (err) {
      console.warn('[Blog] Failed to search music:', err);
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

  function bindArchiveShowAll() {
    const btn = document.getElementById('archiveShowAllBtn');
    if (!btn) return;

    const hiddenItems = document.querySelectorAll('.timeline-hidden');

    btn.addEventListener('click', () => {
      const isOpen = btn.dataset.open === 'true';

      if (isOpen) {
        hiddenItems.forEach(el => { el.style.display = 'none'; });
        btn.dataset.open = 'false';
        btn.innerHTML = `显示全部 <span class="show-all-count">(${hiddenItems.length})</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
      } else {
        hiddenItems.forEach(el => { el.style.display = 'inline'; });
        btn.dataset.open = 'true';
        btn.innerHTML = `收起
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 15 12 9 18 15"/></svg>`;
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
        hiddenCards.forEach(el => { el.classList.remove('expanded'); });
        btn.dataset.open = 'false';
        btn.innerHTML = `显示全部 <span class="show-all-count">(${hiddenCards.length})</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
      } else {
        hiddenCards.forEach(el => { el.classList.add('expanded'); });
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
