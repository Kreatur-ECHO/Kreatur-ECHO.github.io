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
      ${Renderer.renderBackToTop()}
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
      ${Renderer.renderBackToTop()}
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

    // 回到顶部（桌面端隐藏，侧边栏内置；移动端/文章页显示）
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
      window.addEventListener('scroll', () => {
        backToTop.classList.toggle('visible', window.scrollY > 500);
      });
      backToTop.addEventListener('click', () => {
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

  // ============================================================
  //  网易云最近播放 — 更新黑胶唱片封面
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
      popupHTML += '<div class="vinyl-popup-title">最近喜欢</div>';
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
        // 恢复旋转动画状态
        if (playing) {
          disc.style.animationPlayState = 'running';
        }
      }
    } catch (err) {
      console.warn('[Blog] Failed to load recent song:', err);
    }
  }

  // ============================================================
  //  音乐搜索播放（at38.cn 代理）+ 切换歌曲 + 列表循环
  // ============================================================
  let musicAudio = null;
  let playing = false;
  let clickLock = false;
  let songList = [];
  let currentIndex = 0;
  let musicInitialized = false;

  // 播放/暂停图标（1.5s 显示，渐入渐出各 0.5s）
  const PLAY_ICON = '<svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  let iconTimer = null;

  // ---- 音柱可视化 (Web Audio API — captureStream 只读旁路) ----
  var audioCtx = null;
  var analyser = null;
  var streamSource = null;
  var animFrameId = null;

  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      // analyser 不连 destination — 这是纯只读旁路，音频直接到扬声器
      startBarAnimation();
      audioCtx.addEventListener('statechange', function () {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
        } else if (audioCtx && audioCtx.state === 'running' && musicAudio && musicAudio.src) {
          tryConnectStream(musicAudio);
        }
      });
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }

  function startBarAnimation() {
    if (animFrameId) return;
    var bufferLength = 32;
    var dataArray = new Uint8Array(bufferLength);
    (function animate() {
      animFrameId = requestAnimationFrame(animate);
      if (analyser) analyser.getByteFrequencyData(dataArray);
      for (var i = 0; i < 72; i++) {
        var binCenter = i * bufferLength / 72;
        var binStart = Math.floor(binCenter);
        var binEnd = Math.ceil(binCenter + bufferLength / 72);
        if (binEnd <= binStart) binEnd = binStart + 1;
        if (binStart < 0) binStart = 0;
        if (binEnd > bufferLength) binEnd = bufferLength;
        var sum = 0;
        for (var j = binStart; j < binEnd; j++) sum += dataArray[j];
        var h = Math.max(2, (sum / (binEnd - binStart)) / 255 * 22);
        var bar = document.querySelector('.vinyl-bar:nth-child(' + (i + 1) + ')');
        if (bar) bar.style.setProperty('--h', h + 'px');
      }
    })();
  }

  function stopBarAnimation() {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (streamSource) { try { streamSource.disconnect(); } catch (_) {} streamSource = null; }
    var bars = document.querySelectorAll('.vinyl-bar');
    for (var k = 0; k < bars.length; k++) bars[k].style.setProperty('--h', '2px');
  }

  // captureStream 只读旁路 — 不接管音频路由，跨域无声时退化但不影响播放
  function tryConnectStream(audio) {
    if (!audioCtx || !analyser || !audio || !audio.captureStream) return;
    if (audioCtx.state !== 'running') return;
    if (streamSource) { try { streamSource.disconnect(); } catch (_) {} streamSource = null; }
    try {
      var stream = audio.captureStream();
      streamSource = audioCtx.createMediaStreamSource(stream);
      streamSource.connect(analyser);
    } catch (_) { streamSource = null; }
  }

  function flashStateIcon(isPlaying) {
    const icon = document.getElementById('vinylStateIcon');
    if (!icon) return;
    clearTimeout(iconTimer);
    icon.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    icon.classList.add('visible');
    // 总共显示 1.5s（含 0.5s 渐入），到达时间后渐出
    iconTimer = setTimeout(() => {
      icon.classList.remove('visible');
    }, 1500);
  }

  function setupDiscClick(songId) {
    const disc = document.getElementById('musicDisc');
    if (!disc || disc.dataset.clickReady) return;
    disc.dataset.clickReady = '1';
    disc.addEventListener('click', (e) => {
      if (e.target.closest('.vinyl-popup')) return;
      if (clickLock) return;
      clickLock = true;
      setTimeout(() => { clickLock = false; }, 100);

      if (musicAudio && musicAudio.src) {
        if (playing) {
          musicAudio.pause();
        } else {
          // 首次点击 → 初始化音频上下文 + 尝试接入 captureStream 旁路
          // 后续点击 → context 已在 running，直接播放
          initAudioContext();
          tryConnectStream(musicAudio);
          musicAudio.play().catch(function () {});
        }
      } else {
        window.open(`https://music.163.com/#/song?id=${songId}`, '_blank');
      }
    });
  }

  function playNext() {
    if (!songList.length) return;
    currentIndex = (currentIndex + 1) % songList.length;
    const s = songList[currentIndex];
    switchToSong(s.name, s.artist, s.cover, s.id);
    // 更新列表高亮
    const popupEl = document.querySelector('.vinyl-popup');
    if (popupEl) {
      const items = popupEl.querySelectorAll('.vinyl-popup-item');
      items.forEach(el => el.classList.remove('vinyl-popup-current'));
      if (items[currentIndex]) items[currentIndex].classList.add('vinyl-popup-current');
    }
  }

  async function switchToSong(name, artist, cover, songId) {
    if (!MUSIC_PLAY_API) return;
    const disc = document.getElementById('musicDisc');
    if (!disc) return;

    // 更新黑胶封面
    const coverImg = disc.querySelector('.vinyl-cover');
    if (coverImg && cover) {
      coverImg.src = cover.replace(/^http:/, 'https:');
    }
    disc.title = `${name} — ${artist}`;

    // 设置点击切换（仅一次）
    setupDiscClick(songId);

    try {
      const keyword = encodeURIComponent(`${name} ${artist}`);
      const res = await fetch(`${MUSIC_PLAY_API}?keyword=${keyword}`);
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
      musicAudio.volume = 0.19;
      document.body.appendChild(musicAudio);

      // 先绑定事件再播放，确保 play/pause 状态正确
      musicAudio.addEventListener('play', () => {
        playing = true;
        var discEl = document.getElementById('musicDisc');
        if (discEl) discEl.style.animationPlayState = 'running';
        flashStateIcon(true);
      });
      musicAudio.addEventListener('pause', () => {
        playing = false;
        var discEl = document.getElementById('musicDisc');
        if (discEl) discEl.style.animationPlayState = 'paused';
        flashStateIcon(false);
      });
      musicAudio.addEventListener('ended', () => {
        playing = false;
        var discEl = document.getElementById('musicDisc');
        if (discEl) discEl.style.animationPlayState = 'paused';
        playNext();
      });

      // 自动播放（用户此前已与站点交互过时可通过，否则被浏览器策略阻止）
      musicAudio.play().catch(function () {});

      // 可视化已初始化 → 新 audio 也接入 captureStream 旁路
      if (audioCtx) {
        tryConnectStream(musicAudio);
      }
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
