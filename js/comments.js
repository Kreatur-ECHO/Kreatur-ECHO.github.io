/**
 * ============================================================
 *  Guestbook Module — 独立留言板
 * ============================================================
 *
 * 纯本地存储，不依赖任何第三方服务，所有浏览器均可用。
 *
 * 功能:
 *   - 昵称 + 留言 + 图片上传 (自动压缩)
 *   - 快捷复制留言文字 / 页面链接
 *   - localStorage 持久化存储
 */

const Comments = (() => {
  const STORAGE_KEY = 'blog-guestbook';
  const MAX_IMAGE_SIZE = 500 * 1024;

  let messages = [];
  let pendingImage = null;

  // ============================================================
  //  数据
  // ============================================================
  function load() {
    try { messages = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { messages = []; }
  }

  function save() {
    try {
      let data = JSON.stringify(messages);
      while (data.length > 4e6 && messages.length > 0) {
        messages.shift();
        data = JSON.stringify(messages);
      }
      localStorage.setItem(STORAGE_KEY, data);
    } catch (e) {
      if (messages.length > 0) { messages.shift(); save(); }
    }
  }

  // ============================================================
  //  渲染
  // ============================================================
  function renderSection() {
    return `
    <section class="section fade-in fade-in-5" id="comments">
      <h2 class="section-title">💬 Guestbook</h2>

      <!-- 留言表单 -->
      <div class="comment-form" id="commentForm">
        <div class="comment-form-row">
          <input type="text" id="commentName" class="comment-input"
            placeholder="Your name (optional)" maxlength="30" autocomplete="off" />
        </div>
        <div class="comment-form-row">
          <textarea id="commentText" class="comment-textarea"
            placeholder="Leave a message... (Ctrl+Enter to submit)"
            rows="3" maxlength="1000"></textarea>
        </div>
        <div class="comment-form-actions">
          <label class="comment-upload-btn" title="Upload image">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>Upload Image</span>
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

      <!-- 留言列表 -->
      <div class="comments-list" id="commentsList">
        ${renderList()}
      </div>
    </section>`;
  }

  function renderList() {
    if (messages.length === 0) {
      return '<div class="comments-empty">No messages yet. Be the first to leave one! ✨</div>';
    }

    return messages.slice().reverse().map((m, i) => {
      const idx = messages.length - 1 - i;
      const name = m.name || 'Anonymous';
      const initial = name[0].toUpperCase();
      const hue = (name.charCodeAt(0) * 137) % 360;
      const date = new Date(m.time).toLocaleString('zh-CN');
      const imgHTML = m.image
        ? `<div class="comment-body-image">
            <img src="${m.image}" alt="attached" loading="lazy"
              onclick="this.classList.toggle('expanded')" />
           </div>`
        : '';

      return `
      <div class="comment-card">
        <div class="comment-avatar" style="background:hsl(${hue},55%,55%)">${initial}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-name">${escapeHTML(name)}</span>
            <span class="comment-time">${date}</span>
          </div>
          <div class="comment-text">${escapeHTML(m.message)}</div>
          ${imgHTML}
          <div class="comment-actions">
            <button class="comment-action-btn copy-msg" data-idx="${idx}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy Text
            </button>
            <button class="comment-action-btn copy-url">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              Copy Link
            </button>
            <button class="comment-action-btn delete-msg" data-idx="${idx}">
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
    const form = document.getElementById('commentForm');
    if (!form) return;

    const nameInput  = document.getElementById('commentName');
    const textInput  = document.getElementById('commentText');
    const imageInput = document.getElementById('commentImageInput');
    const submitBtn  = document.getElementById('commentSubmit');
    const previewDiv = document.getElementById('commentImagePreview');
    const previewImg = document.getElementById('commentImagePreviewImg');
    const removeImg  = document.getElementById('commentImageRemove');
    const errDiv     = document.getElementById('commentError');
    const charCount  = document.getElementById('charCount');
    const listDiv    = document.getElementById('commentsList');

    // 字数
    textInput.addEventListener('input', () => {
      const n = textInput.value.length;
      charCount.textContent = `${n} / 1000`;
      charCount.style.color = n > 900 ? '#e74c3c' : '';
    });

    // 图片上传
    imageInput.addEventListener('change', () => {
      const file = imageInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/'))   { err('Not an image.'); imageInput.value = ''; return; }
      if (file.size > MAX_IMAGE_SIZE)       { err('Max 500KB.'); imageInput.value = ''; return; }
      const r = new FileReader();
      r.onload = (e) => compress(e.target.result, 400, 300, 0.7).then(data => {
        pendingImage = data;
        previewImg.src = data;
        previewDiv.style.display = 'flex';
        clearErr();
      });
      r.readAsDataURL(file);
    });

    removeImg.addEventListener('click', () => {
      pendingImage = null; previewImg.src = ''; previewDiv.style.display = 'none'; imageInput.value = '';
    });

    // 提交
    function submit() {
      const msg = textInput.value.trim();
      if (!msg) { err('Please enter a message.'); textInput.focus(); return; }

      messages.push({
        name: nameInput.value.trim() || '',
        message: msg,
        image: pendingImage || '',
        time: Date.now(),
      });
      save();

      nameInput.value = '';
      textInput.value = '';
      pendingImage = null;
      previewImg.src = '';
      previewDiv.style.display = 'none';
      imageInput.value = '';
      charCount.textContent = '0 / 1000';
      charCount.style.color = '';
      clearErr();

      listDiv.innerHTML = renderList();
      bindList(listDiv);
      listDiv.querySelector('.comment-card')?.scrollIntoView({ behavior: 'smooth' });
    }

    submitBtn.addEventListener('click', submit);
    textInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
    });

    bindList(listDiv);
  }

  function bindList(container) {
    // 复制留言文字
    container.querySelectorAll('.copy-msg').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = messages[parseInt(btn.dataset.idx)];
        if (m) copy(m.message, btn);
      });
    });
    // 复制页面链接
    container.querySelectorAll('.copy-url').forEach(btn => {
      btn.addEventListener('click', () => copy(location.href, btn));
    });
    // 删除
    container.querySelectorAll('.delete-msg').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this message?')) return;
        messages.splice(parseInt(btn.dataset.idx), 1);
        save();
        const list = document.getElementById('commentsList');
        if (list) { list.innerHTML = renderList(); bindList(list); }
      });
    });
  }

  // ============================================================
  //  工具
  // ============================================================
  function copy(text, btn) {
    const ok = () => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copied!';
      btn.style.color = '#27ae60';
      setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 1500);
    };
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).then(ok); return; }
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.opacity = '0'; ta.style.position = 'fixed';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    ok();
  }

  function compress(dataUrl, maxW, maxH, quality) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h *= maxW / w; w = maxW; }
        if (h > maxH) { w *= maxH / h; h = maxH; }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  function err(msg)   { const e = document.getElementById('commentError'); if (e) { e.textContent = msg; e.style.display = 'block'; } }
  function clearErr() { const e = document.getElementById('commentError'); if (e) { e.textContent = ''; e.style.display = 'none'; } }
  function escapeHTML(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function init() { load(); }

  return { init, renderSection, bindEvents };
})();
