# 待定任务 — YEYU's Blog

> 最后更新：2026-06-12

## 未完成

### 🟠 入场动画集成到主页
- **现状**：`intro-animation.html` 独立原型已完成（月亮升起 + 3D 纹理 + 水波光晕 + 金粉 + 月芯霓虹）
- **待做**：
  1. CSS 迁移到 `css/style.css`
  2. JS 逻辑迁移到 `js/main.js`
  3. 设置 `localStorage` 标记（首次访问播放，回访跳过）
  4. 适配暗色模式
  5. 确认与 Hero、粒子特效、黑胶等不冲突
- **相关文件**：`intro-animation.html`、`css/style.css`、`js/main.js`、`index.html`

### 🔴 SCF 域名被梯子阻断
- **现象**：开梯子时所有 `tencentscf.com` 请求返回 CORS 错误（状态码 null），关梯子正常
- **影响**：点赞、访问计数、文章浏览计数三项功能失效
- **方案 A**：梯子分流规则 `DOMAIN-SUFFIX,tencentscf.com,DIRECT`（最简，1 分钟）
- **方案 B**：自定义域名绑定 SCF API 网关（彻底解决，需域名+备案）
- **相关文件**：`scf/app.js`、`data/config.js`、`js/main.js`、`js/comments.js`

### 🟡 自定义域名（待定）
- 腾讯云注册低价域名（.top ~8 元/年 或 纯数字 .xyz ~7 元/年续费同价）
- 绑定 API 网关 → SCF
- 需要 ICP 备案（2-4 周）

---

## 已完成（2026-06-12）

- [x] 音柱可视化 — 72 根环绕黑胶随机跳动（70ms，0.5s 渐入渐出）
- [x] 回顶按钮重设计 — IntersectionObserver + 黑胶上居中对齐
- [x] 卡片布局统一 — 固定 310px 高度，渐变遮罩渐隐简介
- [x] 标签溢出检测 — 运行时 scrollWidth 判断 + 动态裁剪
- [x] 页面导航保留音乐播放状态
- [x] 入场动画原型 — 独立测试文件完成
