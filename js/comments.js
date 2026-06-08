/**
 * ============================================================
 *  Comments Module — 留言区逻辑
 * ============================================================
 * 功能:
 *   - 昵称 / 留言内容 / 图片上传 (base64 存 localStorage)
 *   - 快捷复制 (复制留言文字 / 复制页面链接)
 *   - 数据持久化到 localStorage
 *   - 简单 XSS 防护
 */

const Comments = (() => {
  const STORAGE_KEY = 'blog-comments';
  const MAX_IMAGE_SIZE = 500 * 1024; // 500KB 单图上限
  let comments = [];

  // ============================================================
  //  数据加载 & 保存
  // ============================================================
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      comments = raw ? JSON.parse(raw) : [];
    } catch (e) {
      comments = [];
    }
  }

  function save() {
    try {
      // 控制总存储体积，超过 4MB 时裁剪旧评论
      let data = JSON.stringify(comments);
      while (data.length > 4 * 1024 * 1024 && comments.length > 0) {
        comments.shift();
        data = JSON.stringify(comments);
      }
      localStorage.setItem(STORAGE_KEY, data);
    } catch (e) {
      console.warn('[Comments] localStorage full, trimming...');
      comments.shift();
      save();
    }
  }

  // ============================================================
  //  渲染留言区 HTML (由 Renderer 调用)
  // ============================================================
  function renderSection() {
    return `
    <section class="section fade-in fade-in-5" id="comments">
      <h2 class="section-title">💬 Guestbook</h2>

      <!-- 留言表单 -->
      <div class="comment-form" id="commentForm">
        <div class="comment-form-row">
          <input
            type="text"
            id="commentName"
            class="comment-input"
            placeholder="Your name (optional)"
            maxlength="30"
            autocomplete="off"
          />
        </div>
        <div class="comment-form-row">
          <textarea
            id="commentText"
            class="comment-textarea"
            placeholder="Leave a message..."
            rows="3"
            maxlength="1000"
          ></textarea>
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
        <!-- 图片预览 -->
        <div class="comment-image-preview" id="commentImagePreview" style="display:none;">
          <img id="commentImagePreviewImg" src="" alt="Preview" />
          <button class="comment-image-remove" id="commentImageRemove" title="Remove image">&times;</button>
        </div>
        <div class="comment-form-error" id="commentError" style="display:none;"></div>
      </div>

      <!-- 留言列表 -->
      <div class="comments-list" id="commentsList">
        ${renderList()}
      </div>
    </section>`;
  }

  function renderList() {
    if (comments.length === 0) {
      return `<div class="comments-empty">No messages yet. Be the first to leave one! ✨</div>`;
    }

    return comments
      .slice()
      .reverse()
      .map((c, i) => {
        const realIdx = comments.length - 1 - i;
        const name = escapeHTML(c.name || 'Anonymous');
        const initial = (c.name || 'A')[0].toUpperCase();
        const hue = hashHue(c.name || 'Anonymous');
        const date = new Date(c.time).toLocaleString('zh-CN');

        const imgHTML = c.image
          ? `<div class="comment-body-image">
              <img src="${c.image}" alt="attached image" loading="lazy" />
             </div>`
          : '';

        return `
        <div class="comment-card" data-index="${realIdx}">
          <div class="comment-avatar" style="background: hsl(${hue}, 55%, 55%)">${initial}</div>
          <div class="comment-body">
            <div class="comment-header">
              <span class="comment-name">${name}</span>
              <span class="comment-time">${date}</span>
            </div>
            <div class="comment-text">${escapeHTML(c.message)}</div>
            ${imgHTML}
            <div class="comment-actions">
              <button class="comment-action-btn copy-comment" data-index="${realIdx}" title="Copy message">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy
              </button>
              <button class="comment-action-btn copy-link" data-index="${realIdx}" title="Copy page link">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                Link
              </button>
              <button class="comment-action-btn delete-comment" data-index="${realIdx}" title="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>`;
      })
      .join('');
  }

  // ============================================================
  //  事件绑定 (由 main.js 调用)
  // ============================================================
  function bindEvents() {
    const form = document.getElementById('commentForm');
    if (!form) return; // 留言区未启用

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

    let pendingImage = null;

    // 字数统计
    textInput.addEventListener('input', () => {
      const len = textInput.value.length;
      charCount.textContent = `${len} / 1000`;
      charCount.style.color = len > 900 ? '#e74c3c' : '';
    });

    // 图片选择
    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showError('Please select an image file.');
        imageInput.value = '';
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        showError('Image must be under 500KB.');
        imageInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        // 压缩大图
        compressImage(e.target.result, 400, 300, 0.7).then(compressed => {
          pendingImage = compressed;
          previewImg.src = compressed;
          previewDiv.style.display = 'flex';
          hideError();
        });
      };
      reader.readAsDataURL(file);
    });

    // 移除图片
    removeImgBtn.addEventListener('click', () => {
      pendingImage = null;
      previewImg.src = '';
      previewDiv.style.display = 'none';
      imageInput.value = '';
    });

    // 提交
    submitBtn.addEventListener('click', () => submit());
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
    });

    function submit() {
      const name = nameInput.value.trim();
      const message = textInput.value.trim();

      if (!message) {
        showError('Please enter a message.');
        textInput.focus();
        return;
      }

      comments.push({
        name: name || '',
        message: message,
        image: pendingImage || '',
        time: Date.now(),
      });

      save();

      // 清空表单
      nameInput.value = '';
      textInput.value = '';
      pendingImage = null;
      previewImg.src = '';
      previewDiv.style.display = 'none';
      imageInput.value = '';
      charCount.textContent = '0 / 1000';
      charCount.style.color = '';
      hideError();

      // 刷新列表
      listDiv.innerHTML = renderList();
      bindListActions(listDiv);

      // 滚动到新评论
      listDiv.querySelector('.comment-card')?.scrollIntoView({ behavior: 'smooth' });
    }

    // 列表操作
    bindListActions(listDiv);
  }

  function bindListActions(container) {
    // 复制留言
    container.querySelectorAll('.copy-comment').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const c = comments[idx];
        if (!c) return;
        copyToClipboard(c.message, btn);
      });
    });

    // 复制页面链接
    container.querySelectorAll('.copy-link').forEach(btn => {
      btn.addEventListener('click', () => {
        copyToClipboard(window.location.href, btn);
      });
    });

    // 删除
    container.querySelectorAll('.delete-comment').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this message?')) return;
        const idx = parseInt(btn.dataset.index);
        comments.splice(idx, 1);
        save();
        const listDiv = document.getElementById('commentsList');
        if (listDiv) {
          listDiv.innerHTML = renderList();
          bindListActions(listDiv);
        }
      });
    });
  }

  // ============================================================
  //  工具
  // ============================================================
  function copyToClipboard(text, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => flashButton(btn));
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      flashButton(btn);
    }
  }

  function flashButton(btn) {
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    btn.style.color = '#27ae60';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.color = '';
    }, 1500);
  }

  function compressImage(dataUrl, maxW, maxH, quality) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h *= maxW / w; w = maxW; }
        if (h > maxH) { w *= maxH / h; h = maxH; }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  function showError(msg) {
    const el = document.getElementById('commentError');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  function hideError() {
    const el = document.getElementById('commentError');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function hashHue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
  }

  // ============================================================
  //  初始化
  // ============================================================
  function init() {
    load();
  }

  return { init, renderSection, bindEvents };
})();
