/**
 * ============================================================
 *  Guestbook — 基于 GitHub Issues API 的公开留言板
 * ============================================================
 *
 * 原理:
 *   读取: 浏览器直接从 GitHub Issues API 拉取（实时，无延迟）
 *   回退: API 不可用时读取本地 data/comments.json
 *   发布: 点击按钮跳转 GitHub Issue 页面直接评论
 *
 * GitHub API 对未认证请求限制 60 次/小时，个人博客足够用。
 */

const Comments = (() => {
  const CONFIG = {
    owner: 'Kreatur-ECHO',
    repo: 'Kreatur-ECHO.github.io',
    issueNumber: 2,
    commentsUrl: 'https://api.github.com/repos/Kreatur-ECHO/Kreatur-ECHO.github.io/issues/2/comments',
    issueUrl: 'https://github.com/Kreatur-ECHO/Kreatur-ECHO.github.io/issues/2',
    perPage: 30,
    likesApi: (typeof SiteConfig !== 'undefined' && SiteConfig.likesApi) || '',
  };

  let comments = [];
  let rawComments = [];   // 原始副本，排序不丢失数据
  let scfLikes = {};      // SCF 返回的点赞计数 { commentId: count }
  let sortMode = 'latest'; // 'latest' | 'popular'
  let likedByMe = new Set(); // localStorage 记住已点赞的评论 ID

  function loadLikedByMe() {
    try {
      const stored = localStorage.getItem('blog_liked_comments');
      if (stored) likedByMe = new Set(JSON.parse(stored));
    } catch { likedByMe = new Set(); }
  }

  function saveLikedByMe() {
    try {
      localStorage.setItem('blog_liked_comments', JSON.stringify([...likedByMe]));
    } catch { /* quota exceeded, ignore */ }
  }

  // ============================================================
  //  渲染
  // ============================================================
  function renderSection() {
    return `
    <section class="section fade-in fade-in-5" id="comments">
      <h2 class="section-title">💬 Guestbook</h2>

      <!-- 发布按钮 (跳转 GitHub Issue) -->
      <div class="guestbook-post">
        <a href="${CONFIG.issueUrl}#new_comment_field"
           target="_blank" rel="noopener"
           class="guestbook-post-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Write a comment on GitHub
        </a>
        <span class="guestbook-post-hint">Opens GitHub — you can upload images &amp; use Markdown</span>
      </div>

      <!-- 排序切换 -->
      <div class="comments-sort-bar">
        <button class="sort-btn active" data-sort="latest">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          最新
        </button>
        <button class="sort-btn" data-sort="popular">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          最多点赞
        </button>
      </div>

      <!-- 评论列表 -->
      <div class="comments-list" id="commentsList">
        <div class="repo-loading">
          <div class="spinner"></div>
          <p>Loading comments...</p>
        </div>
      </div>
    </section>`;
  }

  function renderList() {
    if (!comments.length) {
      return '<div class="comments-empty">No comments yet. Be the first! ✨</div>';
    }

    return comments.map((c) => {
      const name = c.user?.login || 'unknown';
      const avatar = c.user?.avatar_url || '';
      const date = new Date(c.created_at).toLocaleString('zh-CN');
      const bodyHTML = renderMarkdown(c.body);
      const ghLikes = c.reactions?.['+1'] || 0;
      const scfCount = scfLikes[c.id] || 0;
      const likeCount = ghLikes + scfCount;
      const hasLikes = likeCount > 0;
      const alreadyLiked = likedByMe.has(String(c.id));

      return `
      <div class="comment-card gh-comment">
        <img class="comment-avatar-img" src="${avatar}" alt="${name}" loading="lazy"
          onerror="this.style.display='none'" />
        <div class="comment-body">
          <div class="comment-header">
            <a href="https://github.com/${name}" target="_blank" rel="noopener" class="comment-name">@${escapeHTML(name)}</a>
            <span class="comment-time">${date}</span>
          </div>
          <div class="comment-text gh-markdown">${bodyHTML}</div>
          <div class="comment-actions">
            <button class="comment-action-btn comment-reaction-btn${hasLikes ? ' has-likes' : ''}${alreadyLiked ? ' already-liked' : ''}" data-cid="${c.id}" title="${alreadyLiked ? '已点赞' : '👍 Like'}"${alreadyLiked ? ' disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="${hasLikes ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
              ${likeCount > 0 ? `<span class="reaction-count">${likeCount}</span>` : ''}
            </button>
            <a href="${c.html_url}" target="_blank" rel="noopener" class="comment-action-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              View on GitHub
            </a>
            <button class="comment-action-btn copy-msg" data-body="${escapeHTML(c.body).replace(/"/g, '&quot;')}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ---- 简易 Markdown 渲染 ----
  function renderMarkdown(text) {
    if (!text) return '';
    let html = escapeHTML(text);
    // 代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // 粗体
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // 换行
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // ============================================================
  //  点赞 (SCF → 腾讯云 COS 持久化)
  // ============================================================
  async function fetchLikes() {
    if (!CONFIG.likesApi) return;
    try {
      const res = await fetch(CONFIG.likesApi);
      if (res.ok) {
        scfLikes = await res.json();
        console.log('[Guestbook] Loaded ' + Object.keys(scfLikes).length + ' like entries from SCF');
      }
    } catch (err) {
      console.warn('[Guestbook] Failed to fetch likes from SCF:', err);
    }
  }

  function getTotalLikes(comment) {
    return (comment.reactions?.['+1'] || 0) + (scfLikes[comment.id] || 0);
  }

  function refreshList() {
    applySort();
    const target = document.getElementById('commentsList');
    if (target) target.innerHTML = renderList();
  }

  async function likeComment(commentId, btn) {
    if (!CONFIG.likesApi) {
      window.open(`${CONFIG.issueUrl}#issuecomment-${commentId}`, '_blank', 'noopener');
      return;
    }

    btn.disabled = true;
    btn.classList.add('liking');

    try {
      const res = await fetch(CONFIG.likesApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment_id: commentId }),
      });
      const data = await res.json();

      if (data.success) {
        scfLikes[commentId] = data.count;
        likedByMe.add(String(commentId));
        saveLikedByMe();
        refreshList();
        btn.classList.add('liked');
        setTimeout(() => btn.classList.remove('liked'), 800);
      } else if (data.already) {
        // 后端去重了，同步前端状态
        likedByMe.add(String(commentId));
        saveLikedByMe();
        scfLikes[commentId] = data.count;
        refreshList();
      } else {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn('[Guestbook] Failed to like:', err);
      btn.classList.add('like-failed');
      setTimeout(() => btn.classList.remove('like-failed'), 1200);
    } finally {
      btn.disabled = false;
      btn.classList.remove('liking');
    }
  }

  function applySort() {
    if (sortMode === 'popular') {
      comments.sort((a, b) => getTotalLikes(b) - getTotalLikes(a));
    } else {
      comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  // ============================================================
  //  加载评论 (直接从 GitHub Issues API 获取，零延迟实时同步)
  //  失败时回退到本地 comments.json
  // ============================================================
  async function fetchComments() {
    // 1) 优先：直接从 GitHub API 获取（实时）
    try {
      const res = await fetch(CONFIG.commentsUrl + '?per_page=' + CONFIG.perPage + '&t=' + Date.now());
      if (res.ok) {
        rawComments = await res.json();
        comments = [...rawComments];
        applySort();
        console.log('[Guestbook] Loaded ' + comments.length + ' comments from GitHub API (live)');
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.warn('[Guestbook] GitHub API failed, trying local fallback:', err.message);
    }

    // 2) 回退：本地 JSON（由 GitHub Action 更新的静态副本）
    try {
      const res = await fetch('data/comments.json?t=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      rawComments = await res.json();
      comments = [...rawComments];
      applySort();
      console.log('[Guestbook] Loaded ' + comments.length + ' comments from local fallback');
    } catch (err) {
      console.warn('[Guestbook] Local fallback also failed:', err);
      rawComments = [];
      comments = [];
    }
  }

  // ============================================================
  //  事件绑定
  // ============================================================
  function bindEvents() {
    // 复制评论 & 点赞 (事件委托)
    const listEl = document.getElementById('commentsList');
    if (listEl) {
      listEl.addEventListener('click', (e) => {
        // 复制按钮
        const copyBtn = e.target.closest('.copy-msg');
        if (copyBtn) {
          const body = copyBtn.dataset.body;
          if (body) copy(body, copyBtn);
          return;
        }
        // 点赞按钮
        const likeBtn = e.target.closest('.comment-reaction-btn');
        if (likeBtn) {
          if (likeBtn.disabled) return;
          const cid = parseInt(likeBtn.dataset.cid);
          if (cid) likeComment(cid, likeBtn);
          return;
        }
      });
    }

    // 排序切换
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const newMode = btn.dataset.sort;
        if (sortMode === newMode) return;
        sortMode = newMode;

        // 用原始数据重新排序
        comments = [...rawComments];
        applySort();

        // 更新按钮状态
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 重新渲染
        const target = document.getElementById('commentsList');
        if (target) target.innerHTML = renderList();
      });
    });
  }

  // ============================================================
  //  工具
  // ============================================================
  function copy(text, btn) {
    const ok = () => {
      const orig = btn.textContent;
      btn.textContent = '✓ Copied!';
      btn.style.color = '#27ae60';
      setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
    };
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(ok); return; }
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.opacity = '0'; ta.style.position = 'fixed';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    ok();
  }

  function escapeHTML(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ============================================================
  //  初始化
  // ============================================================
  async function init() {
    const listDiv = document.getElementById('commentsList');
    if (!listDiv) return;

    loadLikedByMe();
    await fetchComments();
    await fetchLikes();
    applySort();
    listDiv.innerHTML = renderList();
  }

  return { init, renderSection, bindEvents };
})();
