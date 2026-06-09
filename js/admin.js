/**
 * ============================================================
 *  Admin Panel — 作者编辑面板
 * ============================================================
 * 通过 #admin 哈希访问，使用 GitHub Token 验证身份
 * 支持：文章列表查看 / 新建 / 编辑 / 删除
 * 所有修改通过 GitHub Contents API 直接提交到仓库
 *
 * Token 需要 fine-grained PAT，权限：
 *   - Repository: Kreatur-ECHO/Kreatur-ECHO.github.io
 *   - Permissions: Contents (Read & Write)
 * 创建地址: https://github.com/settings/tokens?type=beta
 * ============================================================
 */

const Admin = (() => {
  'use strict';

  // ============================================================
  //  Constants
  // ============================================================
  const TOKEN_KEY = 'blog_admin_token';
  const REPO_OWNER = 'Kreatur-ECHO';
  const REPO_NAME = 'Kreatur-ECHO.github.io';
  const FILE_PATH = 'data/posts.js';
  const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  // ============================================================
  //  State
  // ============================================================
  let token = null;
  let posts = [];
  let fileSHA = null;
  let isDirty = false;
  let editingPostId = null;
  let originalContent = '';
  let generation = 0;  // 用于取消过期异步操作
  let lastActionTime = 0; // 防抖：防止快速连续点击

  // ============================================================
  //  Auth
  // ============================================================

  function getStoredToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  function storeToken(t) {
    token = t;
    sessionStorage.setItem(TOKEN_KEY, t);
  }

  function clearAuth() {
    token = null;
    posts = [];
    fileSHA = null;
    isDirty = false;
    editingPostId = null;
    sessionStorage.removeItem(TOKEN_KEY);
  }

  async function verifyToken(t) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`,
        { headers: { Authorization: `Bearer ${t}`, 'User-Agent': 'Blog-Admin' } }
      );
      if (res.ok) return true;
      // 401/403 = invalid or insufficient permissions
      return false;
    } catch {
      return false;
    }
  }

  // ============================================================
  //  GitHub API
  // ============================================================

  async function fetchPostsFile() {
    const res = await fetch(API_BASE, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Blog-Admin',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.status === 401 || res.status === 403) {
      clearAuth();
      throw new Error('Token 已失效，请重新登录。');
    }
    if (!res.ok) {
      throw new Error(`获取文件失败 (HTTP ${res.status})`);
    }

    const data = await res.json();
    fileSHA = data.sha;

    // 解码 base64 内容（Unicode 安全）
    const raw = decodeBase64(data.content);
    posts = parseBlogPosts(raw);
    return posts;
  }

  async function commitPostsFile(message) {
    const fileContent = serializePostsFile(posts);

    const res = await fetch(API_BASE, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Blog-Admin',
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: message,
        content: encodeBase64(fileContent),
        sha: fileSHA,
      }),
    });

    if (res.status === 409) {
      // SHA 冲突：文件在别处被修改了
      throw new Error('文件已被修改（可能在其他窗口），请刷新页面重新加载。');
    }
    if (res.status === 401 || res.status === 403) {
      clearAuth();
      throw new Error('Token 权限不足或已失效。');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `提交失败 (HTTP ${res.status})`);
    }

    const data = await res.json();
    fileSHA = data.content.sha;
    isDirty = false;
    return data;
  }

  // ============================================================
  //  Base64 (Unicode-safe)
  // ============================================================

  function decodeBase64(str) {
    try {
      return decodeURIComponent(
        atob(str)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      return atob(str);
    }
  }

  function encodeBase64(str) {
    try {
      return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        )
      );
    } catch {
      return btoa(unescape(encodeURIComponent(str)));
    }
  }

  // ============================================================
  //  Parsing — 从 JS 源码提取 BlogPosts 数组
  // ============================================================

  function parseBlogPosts(source) {
    try {
      // 使用 Function 构造器安全执行（仅访问 BlogPosts 标识符）
      const fn = new Function(source + '; return BlogPosts;');
      const arr = fn();
      if (!Array.isArray(arr)) throw new Error('BlogPosts is not an array');
      return arr;
    } catch (e) {
      console.error('[Admin] Parse error:', e);
      throw new Error('解析 posts.js 失败：' + e.message);
    }
  }

  // ============================================================
  //  Serialization — 生成完整的 posts.js 文件内容
  // ============================================================

  function escapeJS(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  function escapeTemplateLiteral(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$/g, '\\$');
  }

  function serializePostsFile(postsArr) {
    const header = `/**
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

const BlogPosts = [`;

    const entries = postsArr.map((post, i) => {
      const tagsStr = (post.tags || []).map(t => `'${escapeJS(t)}'`).join(', ');
      // content：先去掉可能存在的旧缩进 → 转义 → 再加 6 空格缩进
      const contentClean = unindentContent(post.content || '');
      const contentSafe = escapeTemplateLiteral(contentClean);
      const contentLines = contentSafe.split('\n');
      const contentIndented = contentLines.map(l => '      ' + l).join('\n');

      return `
  {
    id: '${escapeJS(post.id)}',
    date: '${escapeJS(post.date)}',
    title: '${escapeJS(post.title)}',
    excerpt: '${escapeJS(post.excerpt)}',
    tags: [${tagsStr}],
    url: '#post/${escapeJS(post.id)}',
    featured: ${!!post.featured},
    content: \`
${contentIndented}
    \`,
  }`;
    });

    const footer = `
];
`;

    return header + entries.join(',') + footer;
  }

  // ============================================================
  //  Content helpers — 去掉/恢复源码缩进
  // ============================================================

  /** 去掉模板字面量带来的公共前导空白 */
  function unindentContent(str) {
    if (!str) return '';
    // 移除开头空行
    let s = str.replace(/^\n+/, '');
    // 计算公共前导空白
    const lines = s.split('\n');
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length === 0) return s.trim();
    const minIndent = Math.min(...nonEmpty.map(l => {
      const m = l.match(/^(\s*)/);
      return m ? m[1].length : 0;
    }));
    if (minIndent === 0) return s;
    return lines.map(l => l.slice(minIndent)).join('\n');
  }

  // ============================================================
  //  UI: Login Screen
  // ============================================================

  function renderLogin(errorMsg) {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
    <nav class="navbar" id="navbar">
      <div class="navbar-inner">
        <a href="#" class="nav-brand">Y<span class="accent">E</span>YU</a>
        <ul class="nav-links">
          <li><button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">🌙</button></li>
        </ul>
      </div>
    </nav>
    <main>
      <div class="admin-login">
        <div class="admin-login-card">
          <div class="admin-login-icon">🔐</div>
          <h2>Author Login</h2>
          <p>输入 GitHub Fine-grained Token 以管理博客文章</p>

          <label for="adminToken">Personal Access Token</label>
          <input
            type="password"
            id="adminToken"
            placeholder="github_pat_..."
            autocomplete="off"
            spellcheck="false"
          />
          <p class="admin-login-error${errorMsg ? ' show' : ''}" id="loginError">${errorMsg || ''}</p>

          <button class="admin-btn admin-btn-primary" id="loginBtn">登录</button>

          <div class="admin-login-hint">
            需要创建一个
            <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener">Fine-grained Token</a>，
            仅对 <strong>Kreatur-ECHO/Kreatur-ECHO.github.io</strong> 授予
            <strong>Contents (Read &amp; Write)</strong> 权限。
          </div>
        </div>
      </div>
    </main>`;

    // 绑定事件
    const loginBtn = document.getElementById('loginBtn');
    const tokenInput = document.getElementById('adminToken');
    const themeToggle = document.getElementById('themeToggle');

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        ThemeManager.toggle();
        ThemeManager.updateToggleIcon();
      });
    }

    if (loginBtn && tokenInput) {
      loginBtn.addEventListener('click', () => handleLogin(tokenInput.value));
      tokenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleLogin(tokenInput.value);
      });
      // 自动聚焦
      setTimeout(() => tokenInput.focus(), 100);
    }

    // 导航栏阴影
    initNavbarShadow();
  }

  async function handleLogin(inputToken) {
    generation++;
    const gen = generation;
    const tokenInput = document.getElementById('adminToken');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');

    const t = (inputToken || '').trim();
    if (!t) {
      if (loginError) { loginError.textContent = '请输入 Token。'; loginError.classList.add('show'); }
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = '验证中...';
    }
    if (loginError) loginError.classList.remove('show');

    const valid = await verifyToken(t);
    if (generation !== gen) return; // 视图已切换
    if (!valid) {
      if (loginError) {
        loginError.textContent = 'Token 无效或权限不足。请确认 Token 具有 Contents (Read & Write) 权限。';
        loginError.classList.add('show');
      }
      if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = '登录'; }
      if (tokenInput) tokenInput.focus();
      return;
    }

    storeToken(t);
    await loadAndRender(gen);
  }

  // ============================================================
  //  UI: Admin Panel
  // ============================================================

  async function loadAndRender(gen) {
    try {
      showStatus('加载文章数据...', 'info');
      await fetchPostsFile();
      if (generation !== gen) return; // 视图已切换，放弃渲染
      hideStatus();
      renderPanel();
    } catch (err) {
      if (generation !== gen) return; // 视图已切换，放弃渲染
      hideStatus();
      console.error('[Admin] Load error:', err);
      if (!token) {
        renderLogin('会话已过期，请重新登录。');
      } else {
        renderPanel();
        showStatus(err.message || '加载失败', 'error');
      }
    }
  }

  function renderPanel() {
    const app = document.getElementById('app');
    if (!app) return;

    const postCount = Array.isArray(posts) ? posts.length : 0;

    app.innerHTML = `
    <nav class="navbar" id="navbar">
      <div class="navbar-inner">
        <a href="#" class="nav-brand">Y<span class="accent">E</span>YU</a>
        <ul class="nav-links">
          <li><button class="admin-logout" id="logoutBtn" title="退出登录">退出</button></li>
          <li><button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">🌙</button></li>
        </ul>
      </div>
    </nav>
    <main>
      <div class="admin-unsaved" id="unsavedBar">
        ⚠️ 有未保存的更改 —
        <button class="admin-btn admin-btn-sm admin-btn-success" id="unsavedSaveBtn">保存</button>
        <button class="admin-btn admin-btn-sm admin-btn-outline" id="unsavedDiscardBtn">放弃</button>
      </div>
      <div class="admin-panel">
        <!-- Sidebar: Post List -->
        <aside class="admin-sidebar">
          <div class="admin-sidebar-header">
            <h3>📝 文章列表</h3>
            <span class="admin-post-count">${postCount} 篇</span>
          </div>
          <div class="admin-post-list" id="postList">
            ${renderPostListHTML()}
          </div>
          <div class="admin-sidebar-footer">
            <button class="admin-btn admin-btn-primary" id="newPostBtn">＋ 新建文章</button>
          </div>
        </aside>

        <!-- Main: Editor -->
        <section class="admin-main" id="editorArea">
          ${renderEditorHTML()}
        </section>
      </div>
    </main>
    <div class="admin-status" id="adminStatus"></div>`;

    // 绑定事件
    bindPanelEvents();
    updateThemeIcon();
    initNavbarShadow();

    // 如果在编辑某篇文章，自动选中
    if (editingPostId) {
      highlightPostItem(editingPostId);
    }
  }

  function renderPostListHTML() {
    if (!Array.isArray(posts) || posts.length === 0) {
      return `<div class="admin-empty">
        <div class="admin-empty-icon">📄</div>
        <p>还没有文章，<br>点击下方按钮创建第一篇</p>
      </div>`;
    }

    return posts.map(post => {
      const activeClass = editingPostId === post.id ? ' active' : '';
      return `
      <div class="admin-post-item${activeClass}" data-post-id="${post.id}">
        <span class="admin-post-item-title" title="${escapeAttr(post.title)}">${escapeHTML(post.title)}</span>
        <span class="admin-post-item-date">${escapeHTML(post.date)}</span>
        <span class="admin-post-item-actions">
          <button class="admin-icon-btn" data-action="edit" data-post-id="${post.id}" title="编辑">✎</button>
          <button class="admin-icon-btn danger" data-action="delete" data-post-id="${post.id}" title="删除">✕</button>
        </span>
      </div>`;
    }).join('');
  }

  function renderEditorHTML() {
    if (editingPostId === null) {
      return `<div class="admin-empty">
        <div class="admin-empty-icon">👈</div>
        <p>从左侧选择一篇文章编辑，<br>或点击「新建文章」</p>
      </div>`;
    }

    const post = posts.find(p => p.id === editingPostId);
    if (!post) {
      editingPostId = null;
      return `<div class="admin-empty"><p>文章不存在</p></div>`;
    }

    const isNew = !post.id || !post.date; // 简易判断是否为新建

    return `
    <div class="admin-main-header">
      <h3>${isNew ? '✨ 新建文章' : '✏️ 编辑文章'}</h3>
      <div class="admin-main-actions">
        <button class="admin-btn admin-btn-sm admin-btn-outline" id="previewToggleBtn">👁 预览</button>
        <button class="admin-btn admin-btn-sm admin-btn-success" id="savePostBtn">💾 保存</button>
        <button class="admin-btn admin-btn-sm admin-btn-danger" id="deletePostBtn">🗑 删除</button>
      </div>
    </div>
    <div class="admin-editor-body" id="editorBody">
      <div class="admin-field-row">
        <div class="admin-field">
          <label for="adminId">ID（URL 标识）</label>
          <input type="text" id="adminId" value="${escapeAttr(post.id || '')}" placeholder="my-post-slug" />
          <small>用于 URL: #post/<strong>my-post-slug</strong></small>
        </div>
        <div class="admin-field">
          <label for="adminDate">日期</label>
          <input type="date" id="adminDate" value="${escapeAttr(post.date || '')}" />
        </div>
      </div>
      <div class="admin-field">
        <label for="adminTitle">标题</label>
        <input type="text" id="adminTitle" value="${escapeAttr(post.title || '')}" placeholder="文章标题" />
      </div>
      <div class="admin-field">
        <label for="adminExcerpt">摘要</label>
        <textarea id="adminExcerpt" rows="2" placeholder="文章摘要（显示在卡片上，建议 3 行以内）">${escapeHTML(post.excerpt || '')}</textarea>
      </div>
      <div class="admin-field-row">
        <div class="admin-field">
          <label>标签</label>
          <div class="admin-tags-wrap" id="tagsWrap">
            ${renderTagsHTML(post.tags)}
            <input type="text" id="tagInput" placeholder="输入标签，回车添加" />
          </div>
        </div>
        <div class="admin-field" style="justify-content: flex-end;">
          <label class="admin-toggle">
            <input type="checkbox" id="adminFeatured" ${post.featured ? 'checked' : ''} />
            <span class="admin-toggle-switch"></span>
            <span class="admin-toggle-label">置顶 / 精选</span>
          </label>
        </div>
      </div>
      <div class="admin-field" style="flex:1; min-height:0;">
        <label for="adminContent">正文（HTML）</label>
        <textarea id="adminContent" placeholder="<p>文章正文 HTML...</p>">${escapeHTML(unindentContent(post.content || ''))}</textarea>
      </div>
    </div>
    <div class="admin-preview" id="previewPane"></div>`;
  }

  function renderTagsHTML(tags) {
    if (!tags || !tags.length) return '';
    return tags.map(tag => `
      <span class="admin-tag-chip">
        ${escapeHTML(tag)}
        <span class="admin-tag-remove" data-tag="${escapeAttr(tag)}">&times;</span>
      </span>
    `).join('');
  }

  // ============================================================
  //  Event Binding
  // ============================================================

  function bindPanelEvents() {
    // 退出
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (isDirty) {
          if (!confirm('有未保存的更改，确定退出吗？')) return;
        }
        clearAuth();
        window.location.hash = '';
        window.location.reload();
      });
    }

    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        ThemeManager.toggle();
        ThemeManager.updateToggleIcon();
      });
    }

    // 文章列表点击
    const postList = document.getElementById('postList');
    if (postList) {
      postList.addEventListener('click', (e) => {
        const actionBtn = e.target.closest('[data-action]');
        const postItem = e.target.closest('.admin-post-item');

        if (actionBtn) {
          const action = actionBtn.dataset.action;
          const postId = actionBtn.dataset.postId;
          if (action === 'edit') selectPost(postId);
          if (action === 'delete') handleDelete(postId);
        } else if (postItem) {
          selectPost(postItem.dataset.postId);
        }
      });
    }

    // 新建文章
    const newBtn = document.getElementById('newPostBtn');
    if (newBtn) {
      newBtn.addEventListener('click', handleNewPost);
    }

    // 保存
    const saveBtn = document.getElementById('savePostBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSave);
    }

    // 预览
    const previewBtn = document.getElementById('previewToggleBtn');
    if (previewBtn) {
      previewBtn.addEventListener('click', togglePreview);
    }

    // 删除
    const deleteBtn = document.getElementById('deletePostBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (editingPostId) handleDelete(editingPostId);
      });
    }

    // 标签输入
    const tagInput = document.getElementById('tagInput');
    if (tagInput) {
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          addTag(tagInput.value);
          tagInput.value = '';
        }
        // 退格删除最后一个标签
        if (e.key === 'Backspace' && tagInput.value === '' && tagInput.selectionStart === 0) {
          removeLastTag();
        }
      });
    }

    // 标签容器点击（聚焦输入框）
    const tagsWrap = document.getElementById('tagsWrap');
    if (tagsWrap) {
      tagsWrap.addEventListener('click', (e) => {
        // 点击删除按钮
        if (e.target.classList.contains('admin-tag-remove')) {
          const tag = e.target.dataset.tag;
          removeTag(tag);
          return;
        }
        // 点击空白处聚焦输入框
        const input = document.getElementById('tagInput');
        if (input && !e.target.closest('.admin-tag-chip')) {
          input.focus();
        }
      });
    }

    // 表单字段变更 → 标记脏状态
    const formFields = ['adminId', 'adminDate', 'adminTitle', 'adminExcerpt', 'adminContent', 'adminFeatured'];
    formFields.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        if (!isDirty) setDirty(true);
      });
      if (el.type === 'checkbox') {
        el.addEventListener('change', () => {
          if (!isDirty) setDirty(true);
        });
      }
    });

    // 未保存提醒栏按钮
    const unsavedSave = document.getElementById('unsavedSaveBtn');
    if (unsavedSave) unsavedSave.addEventListener('click', handleSave);
    const unsavedDiscard = document.getElementById('unsavedDiscardBtn');
    if (unsavedDiscard) {
      unsavedDiscard.addEventListener('click', () => {
        setDirty(false);
        // 重新加载编辑中的文章
        if (editingPostId !== null) {
          const post = posts.find(p => p.id === editingPostId);
          if (post) refreshEditor(post);
        }
      });
    }

    // 离开前提醒
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }

  function beforeUnloadHandler(e) {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  // ============================================================
  //  Click Cooldown — 防止快速连续点击
  // ============================================================

  function clickCooldown(ms = 250) {
    const now = Date.now();
    if (now - lastActionTime < ms) return true; // 冷却中，忽略
    lastActionTime = now;
    return false;
  }

  // ============================================================
  //  Actions
  // ============================================================

  function selectPost(postId) {
    if (clickCooldown()) return;
    if (isDirty) {
      if (!confirm('有未保存的更改，确定切换吗？')) return;
    }
    setDirty(false);
    editingPostId = postId;
    refreshEditorUI();
  }

  function handleNewPost() {
    if (clickCooldown()) return;
    if (isDirty) {
      if (!confirm('有未保存的更改，确定新建吗？')) return;
    }

    // 生成默认 ID
    const today = new Date().toISOString().slice(0, 10);
    const defaultId = 'new-post-' + Date.now().toString(36);

    const newPost = {
      id: defaultId,
      date: today,
      title: '',
      excerpt: '',
      tags: [],
      url: '#post/' + defaultId,
      featured: false,
      content: '',
    };

    posts.unshift(newPost); // 新文章放在最前面
    setDirty(false);
    editingPostId = newPost.id;
    refreshEditorUI();
  }

  async function handleSave() {
    if (clickCooldown(500)) return;
    const gen = generation;
    const post = collectFormData();
    if (!post) return;

    const idx = posts.findIndex(p => p.id === post.id);
    if (idx >= 0) {
      posts[idx] = post;
    } else {
      posts.push(post);
    }

    try {
      showStatus('保存中...', 'info');
      const saveBtn = document.getElementById('savePostBtn');
      if (saveBtn) saveBtn.disabled = true;

      await commitPostsFile(`✏️ 更新文章: ${post.title || post.id}`);
      if (generation !== gen) return;

      setDirty(false);
      hideStatus();
      showStatus('✅ 已保存并发布！即将刷新...', 'success');

      // 2 秒后自动刷新页面（Token 在 sessionStorage，无需重新登录）
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      if (generation !== gen) return;
      hideStatus();
      showStatus('❌ ' + (err.message || '保存失败'), 'error');
      const saveBtn = document.getElementById('savePostBtn');
      if (saveBtn) saveBtn.disabled = false;
      console.error('[Admin] Save error:', err);
    }
  }

  function handleDelete(postId) {
    if (clickCooldown(500)) return;
    const gen = generation;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (!confirm(`确定删除文章「${post.title || postId}」吗？\n\n此操作会通过 Git 提交，但可以在 GitHub 上恢复。`)) return;

    (async () => {
      try {
        showStatus('删除中...', 'info');

        posts = posts.filter(p => p.id !== postId);

        await commitPostsFile(`🗑 删除文章: ${post.title || postId}`);
        if (generation !== gen) return;

        if (editingPostId === postId) editingPostId = null;
        setDirty(false);
        hideStatus();
        showStatus('🗑 已删除，即将刷新...', 'info');

        setTimeout(() => window.location.reload(), 2000);
      } catch (err) {
        if (generation !== gen) return;
        hideStatus();
        showStatus('❌ ' + (err.message || '删除失败'), 'error');
        posts.push(post);
        console.error('[Admin] Delete error:', err);
      }
    })();
  }

  // ============================================================
  //  Form Data Collection & Validation
  // ============================================================

  function collectFormData() {
    const idEl = document.getElementById('adminId');
    const dateEl = document.getElementById('adminDate');
    const titleEl = document.getElementById('adminTitle');
    const excerptEl = document.getElementById('adminExcerpt');
    const contentEl = document.getElementById('adminContent');
    const featuredEl = document.getElementById('adminFeatured');

    const id = (idEl?.value || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const date = (dateEl?.value || '').trim();
    const title = (titleEl?.value || '').trim();
    const excerpt = (excerptEl?.value || '').trim();
    const content = (contentEl?.value || '').trim();
    const featured = featuredEl?.checked || false;
    const tags = getCurrentTags();

    // 验证
    if (!id) { alert('请输入文章 ID。'); idEl?.focus(); return null; }
    if (!date) { alert('请选择日期。'); dateEl?.focus(); return null; }
    if (!title) { alert('请输入标题。'); titleEl?.focus(); return null; }

    return {
      id,
      date,
      title,
      excerpt,
      tags,
      url: '#post/' + id,
      featured,
      content,
    };
  }

  function getCurrentTags() {
    const chips = document.querySelectorAll('.admin-tag-chip');
    const tags = [];
    chips.forEach(chip => {
      const text = chip.textContent.replace('×', '').trim();
      if (text) tags.push(text);
    });
    return tags;
  }

  function addTag(raw) {
    const tag = raw.replace(/,/g, '').trim();
    if (!tag) return;
    const current = getCurrentTags();
    if (current.includes(tag)) return;
    current.push(tag);
    updateTagsDisplay(current);
    if (!isDirty) setDirty(true);
  }

  function removeTag(tag) {
    const current = getCurrentTags().filter(t => t !== tag);
    updateTagsDisplay(current);
    if (!isDirty) setDirty(true);
  }

  function removeLastTag() {
    const current = getCurrentTags();
    if (current.length === 0) return;
    current.pop();
    updateTagsDisplay(current);
    if (!isDirty) setDirty(true);
  }

  function updateTagsDisplay(tags) {
    const wrap = document.getElementById('tagsWrap');
    if (!wrap) return;
    const input = wrap.querySelector('input');
    wrap.innerHTML = renderTagsHTML(tags);
    if (input) {
      wrap.appendChild(input);
      input.focus();
    }
  }

  // ============================================================
  //  Preview
  // ============================================================

  function togglePreview() {
    const editorBody = document.getElementById('editorBody');
    const previewPane = document.getElementById('previewPane');
    const previewBtn = document.getElementById('previewToggleBtn');

    if (!editorBody || !previewPane) return;

    const isShowing = previewPane.classList.contains('show');

    if (isShowing) {
      editorBody.classList.remove('hidden');
      previewPane.classList.remove('show');
      if (previewBtn) previewBtn.textContent = '👁 预览';
    } else {
      // 收集当前表单数据做预览
      const post = collectFormData();
      if (!post) return;

      editorBody.classList.add('hidden');
      previewPane.innerHTML = Renderer.renderPostDetail(post);
      previewPane.classList.add('show');
      if (previewBtn) previewBtn.textContent = '✏️ 返回编辑';
    }
  }

  // ============================================================
  //  UI Helpers
  // ============================================================

  function refreshEditorUI() {
    const editorArea = document.getElementById('editorArea');
    if (!editorArea) return;
    editorArea.innerHTML = renderEditorHTML();
    bindPanelEvents();
    highlightPostItem(editingPostId);
  }

  function refreshEditor(post) {
    setDirty(false);
    editingPostId = post.id;
    refreshEditorUI();
  }

  function highlightPostItem(postId) {
    document.querySelectorAll('.admin-post-item').forEach(el => {
      el.classList.toggle('active', el.dataset.postId === postId);
    });
  }

  function updateThemeIcon() {
    const btn = document.getElementById('themeToggle');
    if (btn) ThemeManager.updateToggleIcon();
  }

  function initNavbarShadow() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    const handler = () => navbar.classList.toggle('shadow', window.scrollY > 50);
    window.addEventListener('scroll', handler, { passive: true });
    handler();
  }

  function setDirty(dirty) {
    isDirty = dirty;
    const bar = document.getElementById('unsavedBar');
    if (bar) bar.classList.toggle('show', dirty);
  }

  // ============================================================
  //  Toast Notifications
  // ============================================================

  function showStatus(msg, type) {
    const el = document.getElementById('adminStatus');
    if (!el) return;
    el.textContent = msg;
    el.className = 'admin-status ' + type + ' show';
  }

  function hideStatus() {
    const el = document.getElementById('adminStatus');
    if (el) el.className = 'admin-status';
  }

  // ============================================================
  //  HTML Escaping (XSS prevention)
  // ============================================================

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ============================================================
  //  Public API
  // ============================================================

  function init() {
    generation++;
    const gen = generation;
    const stored = getStoredToken();
    if (stored) {
      token = stored;
      loadAndRender(gen);
    } else {
      renderLogin();
    }
  }

  function isAuthenticated() {
    return !!token;
  }

  function destroy() {
    generation++; // 使所有进行中的异步操作失效
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    hideStatus();
  }

  return { init, isAuthenticated, destroy };
})();
