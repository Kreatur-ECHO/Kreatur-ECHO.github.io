/**
 * ============================================================
 *  Comments Module — giscus 评论 + 本地留言板
 * ============================================================
 *
 * giscus (主评论区):
 *   基于 GitHub Discussions，公开可见，需 GitHub 登录
 *   Firefox 用户需关闭增强跟踪保护才能看到
 *
 * 本地留言 (辅助区):
 *   localStorage 存储，支持图片上传，快捷复制
 *   仅当前浏览器可见，默认折叠
 */

const Comments = (() => {
  const CONFIG = {
    giscus: {
      enabled: true,
      repo: 'Kreatur-ECHO/Kreatur-ECHO.github.io',
      repoId: 'R_kgDOS0cc8Q',
      category: 'General',
      categoryId: 'DIC_kwDOS0cc8c4C-wVw',
      mapping: 'pathname',
      strict: '0',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'top',
      theme: 'preferred_color_scheme',
      lang: 'zh-CN',
    },

    local: {
      enabled: true,
      storageKey: 'blog-comments',
      maxImageSize: 500 * 1024,
    },
  };

  // ---- 本地留言数据 ----
  let localComments = [];
  let pendingImage = null;

  // ============================================================
  //  渲染
  // ============================================================
  function renderSection() {
    const giscusHTML = CONFIG.giscus.enabled ? renderGiscus() : '';
    const localHTML = CONFIG.local.enabled ? renderLocal() : '';

    return `
    <section class="section fade-in fade-in-5" id="comments">
      <h2 class="section-title">💬 Comments</h2>
      ${giscusHTML}
      <p class="giscus-fallback" id="giscusFallback" style="display:none;">
        ⚠️ Comments not loading? giscus.app may be blocked by your browser.<br>
        <strong>Edge</strong>: Settings → Privacy → Tracking prevention → switch to <strong>Balanced</strong>, or add this site to exceptions.<br>
        <strong>Firefox</strong>: click the shield icon in address bar → disable Enhanced Tracking Protection.<br>
        You can also use the <strong>Quick Message</strong> panel below ↓
      </p>
      ${localHTML}
    </section>`;
  }

  // ---- giscus: 容器 ----
  function renderGiscus() {
    return '<div class="giscus-wrapper" id="giscusWrapper"></div>';
  }

  // ---- giscus: 通过 DOM API 创建脚本（innerHTML 不执行脚本）----
  function initGiscus() {
    if (!CONFIG.giscus.enabled) return;
    const wrapper = document.getElementById('giscusWrapper');
    if (!wrapper) return;

    const c = CONFIG.giscus;
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', c.repo);
    script.setAttribute('data-repo-id', c.repoId);
    script.setAttribute('data-category', c.category);
    script.setAttribute('data-category-id', c.categoryId);
    script.setAttribute('data-mapping', c.mapping);
    script.setAttribute('data-strict', c.strict);
    script.setAttribute('data-reactions-enabled', c.reactionsEnabled);
    script.setAttribute('data-emit-metadata', c.emitMetadata);
    script.setAttribute('data-input-position', c.inputPosition);
    script.setAttribute('data-theme', c.theme);
    script.setAttribute('data-lang', c.lang);
    script.crossOrigin = 'anonymous';

    // giscus 加载失败 → 显示提示 + 自动展开备用留言
    const onFail = () => {
      const fallback = document.getElementById('giscusFallback');
      if (fallback) fallback.style.display = 'block';
      const details = document.getElementById('localComments');
      if (details) details.open = true;
    };

    script.onerror = onFail;

    // 超时检测：5 秒后若 iframe 未出现
    setTimeout(() => {
      if (!document.querySelector('.giscus-frame')) onFail();
    }, 5000);

    wrapper.appendChild(script);
  }

  // ============================================================
  //  本地留言板（辅助，默认折叠）
  // ============================================================
  function renderLocal() {
    return `
      <details class="local-comments" id="localComments">
        <summary class="local-comments-toggle">
          📝 Quick Message <span class="local-note">(local only · image upload · no login)</span>
        </summary>
        <div class="local-comments-body">
          <div class="comment-form" id="commentForm">
            <div class="comment-form-row">
              <input type="text" id="commentName" class="comment-input"
                placeholder="Your name (optional)" maxlength="30" autocomplete="off" />
            </div>
            <div class="comment-form-row">
              <textarea id="commentText" class="comment-textarea"
                placeholder="Leave a message..." rows="2" maxlength="1000"></textarea>
            </div>
            <div class="comment-form-actions">
              <label class="comment-upload-btn" title="Upload image">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Image</span>
                <input type="file" id="commentImageInput" accept="image/*" hidden />
              </label>
              <span class="comment-char-count" id="charCount">0 / 1000</span>
              <button class="comment-submit-btn" id="commentSubmit">Submit</button>
            </div>
            <div class="comment-image-preview" id="commentImagePreview" style="display:none;">
              <img id="commentImagePreviewImg" src="" alt="Preview" />
              <button class="comment-image-remove" id="commentImageRemove" title="Remove">&times;</button>
            </div>
            <div class="comment-form-error" id="commentError" style="display:none;"></div>
          </div>
          <div class="comments-list" id="commentsList">
            ${renderLocalList()}
          </div>
        </div>
      </details>`;
  }

  function renderLocalList() {
    if (localComments.length === 0) {
      return '<div class="comments-empty">No quick messages yet ✨</div>';
    }
    return localComments.slice().reverse().map((c, i) => {
      const realIdx = localComments.length - 1 - i;
      const name = escapeHTML(c.name || 'Anonymous');
      const initial = (c.name || 'A')[0].toUpperCase();
      const hue = ((c.name || 'A').charCodeAt(0) * 137) % 360;
      const date = new Date(c.time).toLocaleString('zh-CN');
      const imgHTML = c.image
        ? `<div class="comment-body-image"><img src="${c.image}" alt="attached" loading="lazy" /></div>`
        : '';

      return `
      <div class="comment-card" data-index="${realIdx}">
        <div class="comment-avatar" style="background:hsl(${hue},55%,55%)">${initial}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-name">${name}</span>
            <span class="comment-time">${date}</span>
          </div>
          <div class="comment-text">${escapeHTML(c.message)}</div>
          ${imgHTML}
          <div class="comment-actions">
            <button class="comment-action-btn copy-comment" data-index="${realIdx}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy
            </button>
            <button class="comment-action-btn copy-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg> Link
            </button>
            <button class="comment-action-btn delete-comment" data-index="${realIdx}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ============================================================
  //  事件绑定
  // ============================================================
  function bindEvents() {
    bindGiscusTheme();
    bindLocalForm();
  }

  // ---- 本地表单 ----
  function bindLocalForm() {
    if (!CONFIG.local.enabled) return;
    const form = document.getElementById('commentForm');
    if (!form) return;

    loadLocal();

    const nameInput = document.getElementById('commentName');
    const textInput = document.getElementById('commentText');
    const imageInput = document.getElementById('commentImageInput');
    const submitBtn = document.getElementById('commentSubmit');
    const previewDiv = document.getElementById('commentImagePreview');
    const previewImg = document.getElementById('commentImagePreviewImg');
    const removeImgBtn = document.getElementById('commentImageRemove');
    const errorDiv = document.getElementById('commentError');
    const charCount = document.getElementById('charCount');
    const listDiv = document.getElementById('commentsList');

    textInput.addEventListener('input', () => {
      const len = textInput.value.length;
      charCount.textContent = `${len} / 1000`;
      charCount.style.color = len > 900 ? '#e74c3c' : '';
    });

    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showError('Please select an image.'); imageInput.value = ''; return; }
      if (file.size > CONFIG.local.maxImageSize) { showError('Image must be under 500KB.'); imageInput.value = ''; return; }
      const reader = new FileReader();
      reader.onload = (e) => {
        compressImage(e.target.result, 400, 300, 0.7).then(compressed => {
          pendingImage = compressed;
          previewImg.src = compressed;
          previewDiv.style.display = 'flex';
          hideError();
        });
      };
      reader.readAsDataURL(file);
    });

    removeImgBtn.addEventListener('click', () => {
      pendingImage = null; previewImg.src = ''; previewDiv.style.display = 'none'; imageInput.value = '';
    });

    function submit() {
      const message = textInput.value.trim();
      if (!message) { showError('Please enter a message.'); textInput.focus(); return; }
      localComments.push({ name: nameInput.value.trim() || '', message, image: pendingImage || '', time: Date.now() });
      saveLocal();
      nameInput.value = ''; textInput.value = '';
      pendingImage = null; previewImg.src = ''; previewDiv.style.display = 'none'; imageInput.value = '';
      charCount.textContent = '0 / 1000'; charCount.style.color = '';
      hideError();
      listDiv.innerHTML = renderLocalList();
      bindListActions(listDiv);
      listDiv.querySelector('.comment-card')?.scrollIntoView({ behavior: 'smooth' });
    }

    submitBtn.addEventListener('click', submit);
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
    });

    bindListActions(listDiv);
  }

  function bindListActions(container) {
    container.querySelectorAll('.copy-comment').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const c = localComments[idx];
        if (!c) return;
        copyToClipboard(c.message, btn);
      });
    });
    container.querySelectorAll('.copy-link').forEach(btn => {
      btn.addEventListener('click', () => copyToClipboard(window.location.href, btn));
    });
    container.querySelectorAll('.delete-comment').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete?')) return;
        const idx = parseInt(btn.dataset.index);
        localComments.splice(idx, 1);
        saveLocal();
        const listDiv = document.getElementById('commentsList');
        if (listDiv) { listDiv.innerHTML = renderLocalList(); bindListActions(listDiv); }
      });
    });
  }

  // ---- giscus 主题同步 ----
  function bindGiscusTheme() {
    if (!CONFIG.giscus.enabled) return;
    function sendGiscusTheme(theme) {
      const iframe = document.querySelector('.giscus-frame');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
      }
    }
    setTimeout(() => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      sendGiscusTheme(isDark ? 'dark' : 'light');
    }, 2500);

    new MutationObserver(() => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      sendGiscusTheme(dark ? 'dark' : 'light');
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // ============================================================
  //  工具
  // ============================================================
  function loadLocal() {
    try { localComments = JSON.parse(localStorage.getItem(CONFIG.local.storageKey)) || []; }
    catch (e) { localComments = []; }
  }
  function saveLocal() {
    try {
      let data = JSON.stringify(localComments);
      while (data.length > 4e6 && localComments.length > 0) { localComments.shift(); data = JSON.stringify(localComments); }
      localStorage.setItem(CONFIG.local.storageKey, data);
    } catch (e) { if (localComments.length > 0) { localComments.shift(); saveLocal(); } }
  }
  function copyToClipboard(text, btn) {
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(() => flashButton(btn)); }
    else {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.opacity = '0'; ta.style.position = 'fixed';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      flashButton(btn);
    }
  }
  function flashButton(btn) {
    const orig = btn.textContent; btn.textContent = '✓ Copied!'; btn.style.color = '#27ae60';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
  }
  function compressImage(dataUrl, maxW, maxH, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h *= maxW / w; w = maxW; }
        if (h > maxH) { w *= maxH / h; h = maxH; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }
  function showError(msg) { const el = document.getElementById('commentError'); if (el) { el.textContent = msg; el.style.display = 'block'; } }
  function hideError() { const el = document.getElementById('commentError'); if (el) { el.textContent = ''; el.style.display = 'none'; } }
  function escapeHTML(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

  function init() {
    loadLocal();
    initGiscus();
  }

  return { init, renderSection, bindEvents };
})();
