/**
 * ============================================================
 *  Theme Manager — 主题切换逻辑
 * ============================================================
 * 支持的主题在 THEME_LIST 中注册
 * 新主题只需:
 *   1. 在 css/themes.css 中定义 [data-theme="xxx"] 变量
 *   2. 在下面的 THEME_LIST 中添加 { name: 'xxx', icon: '...', label: '...' }
 * ============================================================
 */

const ThemeManager = (() => {
  // ---- 注册所有可用主题 ----
  const THEME_LIST = [
    { name: 'light', icon: '🌙', label: 'Light' },
    { name: 'dark',  icon: '☀️', label: 'Dark' },
    // 添加新主题示例:
    // { name: 'ocean', icon: '🌊', label: 'Ocean' },
  ];

  const STORAGE_KEY = 'blog-theme';
  let currentTheme = 'light';

  // ---- 初始化 ----
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (saved && THEME_LIST.some(t => t.name === saved)) {
      currentTheme = saved;
    } else if (!saved && prefersDark) {
      currentTheme = 'dark';
    } else {
      currentTheme = 'light';
    }

    apply(currentTheme);
    return currentTheme;
  }

  // ---- 应用主题 ----
  function apply(name) {
    document.documentElement.setAttribute('data-theme', name);
    currentTheme = name;
    localStorage.setItem(STORAGE_KEY, name);
  }

  // ---- 切换（在 light/dark 之间循环）----
  function toggle() {
    const idx = THEME_LIST.findIndex(t => t.name === currentTheme);
    const next = THEME_LIST[(idx + 1) % THEME_LIST.length];
    apply(next.name);
    return next;
  }

  // ---- 获取当前主题信息 ----
  function getCurrent() {
    return THEME_LIST.find(t => t.name === currentTheme) || THEME_LIST[0];
  }

  // ---- 获取所有主题 ----
  function getList() {
    return THEME_LIST;
  }

  // ---- 监听系统主题变化 ----
  function listenSystem() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        apply(e.matches ? 'dark' : 'light');
        updateToggleIcon();
      }
    });
  }

  // ---- 更新切换按钮图标 ----
  function updateToggleIcon() {
    const btn = document.getElementById('themeToggle');
    if (btn) {
      const theme = getCurrent();
      btn.textContent = theme.icon;
      btn.setAttribute('aria-label', `Switch to ${THEME_LIST[(THEME_LIST.findIndex(t => t.name === currentTheme) + 1) % THEME_LIST.length].label} theme`);
    }
  }

  return { init, apply, toggle, getCurrent, getList, listenSystem, updateToggleIcon };
})();
