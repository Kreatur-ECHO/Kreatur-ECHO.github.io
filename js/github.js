/**
 * ============================================================
 *  GitHub API Module — 从 GitHub 拉取数据
 * ============================================================
 */

const GitHubAPI = (() => {
  // ---- 认证（部署时注入 token，本地退回未认证 60/hr） ----
  function authHeaders() {
    const token = (typeof SiteConfig !== 'undefined'
      && SiteConfig.reactionsToken
      && SiteConfig.reactionsToken !== 'REACTIONS_TOKEN_PLACEHOLDER')
      ? SiteConfig.reactionsToken : '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ---- 语言颜色映射 ----
  const LANG_COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
    HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219',
    'C++': '#f34b7d', C: '#555555', Go: '#00ADD8', Rust: '#dea584',
    Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
    Kotlin: '#A97BFF', Dart: '#00B4AB', Shell: '#89e051',
    Vue: '#41b883', Svelte: '#ff3e00', SCSS: '#c6538c',
  };

  // ---- 获取用户信息 ----
  async function fetchUser(username) {
    const res = await fetch(`https://api.github.com/users/${username}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`GitHub user API returned ${res.status}`);
    return res.json();
  }

  // ---- 获取仓库列表 ----
  async function fetchRepos(username, { sort = 'updated', perPage = 6 } = {}) {
    const res = await fetch(
      `https://api.github.com/users/${username}/repos?sort=${sort}&per_page=${perPage}`,
      { headers: authHeaders() }
    );
    if (!res.ok) throw new Error(`GitHub repos API returned ${res.status}`);
    return res.json();
  }

  // ---- 渲染仓库卡片 HTML ----
  function renderRepoCard(repo) {
    const langColor = LANG_COLORS[repo.language] || '#888';
    const updated = new Date(repo.updated_at).toLocaleDateString('zh-CN');

    return `
      <a href="${repo.html_url}" target="_blank" rel="noopener" class="repo-card">
        <div class="repo-name">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.7">
            <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
          </svg>
          ${escapeHTML(repo.name)}
        </div>
        <div class="repo-desc">${escapeHTML(repo.description || 'No description')}</div>
        <div class="repo-meta">
          ${repo.language ? `
            <span>
              <span class="repo-lang-dot" style="background:${langColor}"></span>
              ${escapeHTML(repo.language)}
            </span>` : ''}
          <span>⭐ ${repo.stargazers_count}</span>
          <span>🍴 ${repo.forks_count}</span>
          <span>${updated}</span>
        </div>
      </a>`;
  }

  // ---- 渲染加载状态 ----
  function renderLoading() {
    return `
      <div class="repo-loading">
        <div class="spinner"></div>
        <p>Loading repositories from GitHub...</p>
      </div>`;
  }

  // ---- 渲染空状态 ----
  function renderEmpty() {
    return `
      <div class="repo-empty">
        <p>🚧 No public repositories yet.</p>
        <p style="margin-top:8px;">Stay tuned — exciting projects are coming soon!</p>
      </div>`;
  }

  // ---- 渲染错误状态 ----
  function renderError(username) {
    return `
      <div class="repo-empty">
        <p>⚠️ Unable to load repositories.</p>
        <p style="margin-top:8px;">
          <a href="https://github.com/${username}?tab=repositories" target="_blank">View on GitHub →</a>
        </p>
      </div>`;
  }

  // ---- HTML 转义 ----
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { fetchUser, fetchRepos, renderRepoCard, renderLoading, renderEmpty, renderError };
})();
