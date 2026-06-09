/**
 * ============================================================
 *  新增路由 — 添加到现有 blog-like SCF app.js
 * ============================================================
 * 复制以下内容加入 app.js，然后在主路由中注册即可。
 *
 * 1. 将 article-views 相关函数粘贴到文件末尾（exports 之前）
 * 2. 在主路由中添加 /article-views 的分支：
 *
 *   if (path === '/article-views') {
 *     if (method === 'GET') return handleGetArticleViews();
 *     if (method === 'POST') return handlePostArticleView(body, ip);
 *     return jsonResponse({ error: 'Method not allowed' }, 405);
 *   }
 */

// ============================================================
//  /article-views — 文章浏览计数
//  数据格式: { "article-id": { "count": N, "days": {...} } }
//  存储位置: COS article-views.json
// ============================================================
async function handleGetArticleViews() {
  const data = await readJSON('article-views.json');
  return jsonResponse(data || {});
}

async function handlePostArticleView(body, ip) {
  try {
    const { article_id } = JSON.parse(body || '{}');
    if (!article_id) return jsonResponse({ error: 'Missing article_id' }, 400);

    const data = (await readJSON('article-views.json')) || {};
    if (!data[article_id]) {
      data[article_id] = { count: 0, days: {} };
    }

    const today = getToday();
    const ipKey = md5(ip);

    if (!data[article_id].days) data[article_id].days = {};
    if (!data[article_id].days[today]) data[article_id].days[today] = {};

    if (!data[article_id].days[today][ipKey]) {
      data[article_id].days[today][ipKey] = 1;
      data[article_id].count = (data[article_id].count || 0) + 1;
      await writeJSON('article-views.json', data);
    }

    return jsonResponse({ success: true, count: data[article_id].count });
  } catch (err) {
    console.error('[ArticleViews] Error:', err);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
}
