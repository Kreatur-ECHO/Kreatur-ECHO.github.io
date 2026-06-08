/**
 * ============================================================
 *  Guestbook — 基于 GitHub Issues API 的公开留言板
 * ============================================================
 *
 * 原理:
 *   读取: GitHub Issues API (公开，无需认证，所有浏览器可用)
 *   发布: 点击按钮跳转 GitHub Issue 页面直接评论
 *
 * 不会因浏览器跟踪防护而被拦截。
 */

const Comments = (() => {
  const CONFIG = {
    owner: 'Kreatur-ECHO',
    repo: 'Kreatur-ECHO.github.io',
    issueNumber: 2,
    commentsUrl: 'https://api.github.com/repos/Kreatur-ECHO/Kreatur-ECHO.github.io/issues/2/comments',
    issueUrl: 'https://github.com/Kreatur-ECHO/Kreatur-ECHO.github.io/issues/2',
    perPage: 30,
  };

  let comments = [];

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

    return comments.map((c, i) => {
      const name = c.user?.login || 'unknown';
      const avatar = c.user?.avatar_url || '';
      const date = new Date(c.created_at).toLocaleString('zh-CN');
      const bodyHTML = renderMarkdown(c.body);

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
            <button class="comment-action-btn copy-msg" data-idx="${i}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy
            </button>
            <a href="${c.html_url}" target="_blank" rel="noopener" class="comment-action-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              View on GitHub
            </a>
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
  //  加载评论
  // ============================================================
  async function fetchComments() {
    try {
      const res = await fetch(`${CONFIG.commentsUrl}?per_page=${CONFIG.perPage}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      comments = await res.json();
    } catch (err) {
      console.warn('[Guestbook] Failed to fetch comments:', err);
      comments = [];
    }
  }

  // ============================================================
  //  事件绑定
  // ============================================================
  function bindEvents() {
    const listDiv = document.getElementById('commentsList');
    if (!listDiv) return;

    // 复制评论
    listDiv.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-msg');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx);
      const c = comments[idx];
      if (!c) return;
      copy(c.body, btn);
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

    await fetchComments();
    listDiv.innerHTML = renderList();
  }

  return { init, renderSection, bindEvents };
})();
