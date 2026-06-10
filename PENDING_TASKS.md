# 待定任务 — YEYU's Blog

> 最后更新：2026-06-10

## 未完成

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

## 已完成（2026-06-10）

- [x] GitHub API 速率限制 → 认证头修复（5000/hr）
- [x] COS 签名修复（hex string、只签 host）
- [x] IP 去重修复（x-forwarded-for 取第一个）
- [x] Firefox 兼容（class 代替 disabled）
- [x] 手机端响应式适配（640px 断点）
- [x] 回到顶部按钮重设计
- [x] 粒子效果增强（spawnRate +50%）
- [x] 更新日志系统建立
