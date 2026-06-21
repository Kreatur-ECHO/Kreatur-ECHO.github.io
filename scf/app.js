/**
 * ============================================================
 *  blog-like SCF Web 函数 — Node.js 18
 * ============================================================
 * Web 函数模式，HTTP Server 监听 9000 端口
 * ============================================================
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const BUCKET = 'blog-likes-1234567890-1441674200';
const REGION = 'ap-guangzhou';
const COS_HOST = `${BUCKET}.cos.${REGION}.myqcloud.com`;
const PORT = 9000;

const SECRET_ID = process.env.SECRET_ID || '';
const SECRET_KEY = process.env.SECRET_KEY || '';

const NETEASE_UID = process.env.NETEASE_UID || '';
const NETEASE_COOKIE = process.env.NETEASE_COOKIE || '';

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function sha1Hex(str) {
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex');
}

// ============================================================
//  Netease WeAPI Crypto — AES-128-CBC + RSA (BigInt pow-mod)
//  硬编码的 public key & nonce 来自网易云 Web 客户端
// ============================================================
const NE_MODULUS = '00e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7';
const NE_NONCE  = '0CoJUm6Qyw8W8jud';
const NE_PUBKEY = '010001';

function aesEncrypt(text, key) {
  const cipher = crypto.createCipheriv('aes-128-cbc', key, '0102030405060708');
  return cipher.update(text, 'utf8', 'base64') + cipher.final('base64');
}

function rsaEncrypt(text) {
  const r  = text.split('').reverse().join('');
  const bi = BigInt('0x' + Buffer.from(r, 'utf8').toString('hex'));
  const mod = BigInt('0x' + NE_MODULUS);
  let exp   = BigInt('0x' + NE_PUBKEY);
  let base  = bi % mod;
  let result = 1n;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result.toString(16).padStart(256, '0');
}

function weapiEncrypt(data) {
  const text = JSON.stringify(data);
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let secKey = '';
  for (let i = 0; i < 16; i++) secKey += chars[Math.floor(Math.random() * chars.length)];
  const encText   = aesEncrypt(aesEncrypt(text, NE_NONCE), secKey);
  const encSecKey = rsaEncrypt(secKey);
  return { params: encText, encSecKey };
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

function sendJSON(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
  });
}

function getClientIP(req) {
  const xff = req.headers['x-forwarded-for'];
  // 只取第一个 IP（真实客户端），忽略代理链
  const ip = (typeof xff === 'string' ? xff.split(',')[0].trim() : '') ||
    req.headers['x-real-ip'] ||
    (req.socket && req.socket.remoteAddress) ||
    '0.0.0.0';
  return ip;
}

function cosSign(method, key) {
  const now = Math.floor(Date.now() / 1000);
  const keyTime = `${now};${now + 900}`;

  // 只签 host（SDK signHeaders 白名单规则）
  // FormatString = [Method, Pathname, Params, Headers, ''].join('\n')
  const uri = '/' + key;
  const formatString = [method.toLowerCase(), uri, '', `host=${COS_HOST}`, ''].join('\n');
  const formatHash = sha1Hex(formatString);

  // StringToSign = ['sha1', SignTime, Hash, ''].join('\n')
  const stringToSign = ['sha1', keyTime, formatHash, ''].join('\n');

  // SignKey = HMAC-SHA1(SecretKey, KeyTime) → hex string（注意：hex 字符串，不是 Buffer）
  const signKey = crypto.createHmac('sha1', SECRET_KEY).update(keyTime).digest('hex');

  // Signature = HMAC-SHA1(SignKey, StringToSign)
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');

  return `q-sign-algorithm=sha1&q-ak=${SECRET_ID}&q-sign-time=${keyTime}&q-key-time=${keyTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`;
}

function cosRequest(method, key, body) {
  return new Promise((resolve, reject) => {
    const authorization = cosSign(method, key);

    const sendHeaders = {
      authorization: authorization,
    };
    if (body) {
      sendHeaders['content-type'] = 'application/json';
    }

    const reqOptions = {
      hostname: COS_HOST,
      path: `/${key}`,
      method: method,
      headers: sendHeaders,
      timeout: 10000,
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ code: res.statusCode, body: data });
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          reject(new Error(`COS ${res.statusCode}: ${data.substring(0, 500)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

    if (body) req.write(body);
    req.end();
  });
}

async function readJSON(key) {
  try {
    const result = await cosRequest('GET', key);
    if (result === null) return null;
    return JSON.parse(result.body);
  } catch (err) {
    console.error('[COS] readJSON error:', key, err.message);
    return null;
  }
}

async function writeJSON(key, obj) {
  const body = JSON.stringify(obj);
  await cosRequest('PUT', key, body);
}

// ============================================================
//  Netease Auth — COS 持久化 MUSIC_U，过期自动手机登录续期
// ============================================================
const NE_AUTH_KEY = 'netease-auth.json';

async function loadNeteaseAuth() {
  const data = await readJSON(NE_AUTH_KEY);
  return (data && data.music_u) ? data : null;
}

async function saveNeteaseAuth(music_u) {
  const auth = { music_u, updatedAt: Date.now() };
  await writeJSON(NE_AUTH_KEY, auth);
  return auth;
}

function getCookieStr(music_u) {
  return music_u.startsWith('MUSIC_U=') ? music_u : 'MUSIC_U=' + music_u;
}

// neteaseLogin — WeAPI 手机号登录，返回新的 MUSIC_U
async function neteaseLogin() {
  const phone = process.env.NETEASE_PHONE || '';
  const md5pw = process.env.NETEASE_PASSWORD_MD5 || '';
  if (!phone || !md5pw) return { success: false, error: 'Missing NETEASE_PHONE or NETEASE_PASSWORD_MD5' };

  const enc = weapiEncrypt({ phone, password: md5pw, countrycode: '86', rememberLogin: 'true' });
  const body = 'params=' + encodeURIComponent(enc.params) + '&encSecKey=' + encodeURIComponent(enc.encSecKey);

  return new Promise((resolve) => {
    const r = https.request('https://music.163.com/weapi/login/cellphone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/',
      },
      timeout: 15000,
    }, (res) => {
      const cookies = res.headers['set-cookie'] || [];
      let mu = '';
      for (const c of cookies) {
        const m = c.match(/MUSIC_U=([^;]+)/);
        if (m) { mu = m[1]; break; }
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (j.code === 200 || j.code === 20000) {
            if (!mu && j.token) mu = j.token;
            resolve({ success: true, music_u: mu });
          } else {
            resolve({ success: false, error: 'Login code ' + j.code, msg: j.msg || '', rawCode: j.code });
          }
        } catch (e) { resolve({ success: false, error: 'Parse: ' + e.message }); }
      });
    });
    r.on('error', e => resolve({ success: false, error: 'Req: ' + e.message }));
    r.on('timeout', () => { r.destroy(); resolve({ success: false, error: 'Timeout' }); });
    r.write(body);
    r.end();
  });
}

// ============================================================
//  网易云音乐 — 最近播放（红心歌单）
// ============================================================

// fetchRecentSongs — 用 MUSIC_U cookie 拉取红心歌单前5首
function fetchRecentSongs(cookie) {
  return new Promise((resolve) => {
    const reqOpts = {
      headers: {
        'Cookie': getCookieStr(cookie),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/',
      },
      timeout: 10000,
    };

    const LIKED_PLAYLIST_ID = '2488546807';
    const url = 'https://music.163.com/api/playlist/detail?id=' + LIKED_PLAYLIST_ID + '&limit=5';
    https.get(url, reqOpts, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        try {
          const json2 = JSON.parse(data2);
          if (json2.code !== 200) {
            resolve({ error: 'Detail API code=' + json2.code, rawCode: json2.code });
            return;
          }
          const tracks = ((json2.result && json2.result.tracks) || []).slice(0, 5);
          const songs = tracks.map(t => {
            const artists = (t.artists || []).map(a => a.name).join(' / ');
            const album = t.album || {};
            return {
              name: t.name,
              id: t.id,
              artist: artists,
              album: album.name || '',
              cover: album.picUrl || '',
            };
          });
          resolve({ songs, updatedAt: Date.now(), likedPlaylistId: parseInt(LIKED_PLAYLIST_ID) });
        } catch (e) { resolve({ error: 'Parse: ' + e.message }); }
      });
    }).on('error', e => resolve({ error: 'Fetch: ' + e.message }))
      .on('timeout', () => resolve({ error: 'Timeout' }));
  });
}

// ============================================================
//  handleRecentSong — SCF /recent-song 端点
//  每天 4am 后首次请求刷新缓存
//  Cookie 过期时自动手机号登录续期（WeAPI）→ 存 COS
// ============================================================
async function handleRecentSong(method) {
  if (method !== 'GET') return [405, { error: 'Method not allowed' }];

  const cached = await readJSON('recent-song.json');
  const now = new Date();
  const today4am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 4, 0, 0).getTime();

  if (cached && cached.updatedAt) {
    const cacheAge = now.getTime() - cached.updatedAt;
    const needsRefresh = now.getTime() >= today4am && cached.updatedAt < today4am;
    if (!needsRefresh || cacheAge < 60000) {
      return [200, { ...cached, fromCache: true }];
    }
  }

  // 1) 获取当前有效 cookie：COS 持久化 > 环境变量兜底
  let cookie = '';
  const savedAuth = await loadNeteaseAuth();
  if (savedAuth && savedAuth.music_u) {
    cookie = savedAuth.music_u;
  } else if (process.env.NETEASE_COOKIE) {
    cookie = process.env.NETEASE_COOKIE;
  }

  // 2) 拉取红心歌单
  let result = cookie ? await fetchRecentSongs(cookie) : { error: 'No cookie' };

  // 3) 认证过期 (20001/-447/-460 等) → 自动手机登录续期
  if (result && result.rawCode != null && result.rawCode !== 200) {
    console.log('[RecentSong] Auth expired (20001), trying auto-login...');
    const loginResult = await neteaseLogin();
    if (loginResult.success && loginResult.music_u) {
      await saveNeteaseAuth(loginResult.music_u);
      console.log('[RecentSong] Auto-login OK, retrying fetch...');
      result = await fetchRecentSongs(loginResult.music_u);
    } else {
      console.log('[RecentSong] Auto-login failed:', loginResult.error);
      if (cached) return [200, { ...cached, _diagnose: { authSource: 'login-failed', loginError: loginResult.error } }];
      return [502, { error: 'Auto-login failed', detail: loginResult.error }];
    }
  }

  // 4) 失败 → 回退缓存
  if (!result || result.error) {
    if (cached) return [200, { ...cached, _diagnose: result ? result.error : 'no result' }];
    return [502, result || { error: 'No result' }];
  }
  if (!result.songs || !result.songs.length) {
    if (cached) return [200, { ...cached, _diagnose: 'empty songs' }];
    return [502, { error: 'Empty songs list' }];
  }

  // 5) 写入 COS 缓存 + 返回
  await writeJSON('recent-song.json', result);
  return [200, result];
}

// ============================================================
//  路由
// ============================================================

async function handleRoot(method, body, ip) {
  if (method === 'GET') {
    const data = await readJSON('likes.json');
    return [200, data || {}];
  }
  if (method === 'POST') {
    try {
      const { comment_id } = JSON.parse(body || '{}');
      if (!comment_id) return [400, { error: 'Missing comment_id' }];

      const data = (await readJSON('likes.json')) || {};
      const ipKey = `${comment_id}:${md5(ip)}`;

      if (data[ipKey]) {
        return [200, { success: false, already: true, count: (data[comment_id] || 0) }];
      }

      data[comment_id] = (data[comment_id] || 0) + 1;
      data[ipKey] = 1;
      await writeJSON('likes.json', data);
      return [200, { success: true, count: data[comment_id] }];
    } catch (err) {
      console.error('[Likes] Error:', err);
      return [500, { error: err.message }];
    }
  }
  return [405, { error: 'Method not allowed' }];
}

async function handleVisits(method, body, ip) {
  if (method === 'GET') {
    const data = await readJSON('visits.json');
    return [200, data || { total: 0, days: {} }];
  }
  if (method === 'POST') {
    try {
      const data = (await readJSON('visits.json')) || { total: 0, days: {} };
      const today = getToday();
      const ipKey = md5(ip);

      if (!data.days) data.days = {};
      if (!data.days[today]) data.days[today] = {};

      if (!data.days[today][ipKey]) {
        data.days[today][ipKey] = 1;
        data.total = (data.total || 0) + 1;
        await writeJSON('visits.json', data);
      }
      return [200, { success: true, total: data.total }];
    } catch (err) {
      console.error('[Visits] Error:', err);
      return [500, { error: err.message }];
    }
  }
  return [405, { error: 'Method not allowed' }];
}

async function handleArticleViews(method, body, ip) {
  if (method === 'GET') {
    const data = await readJSON('article-views.json');
    return [200, data || {}];
  }
  if (method === 'POST') {
    try {
      const { article_id } = JSON.parse(body || '{}');
      if (!article_id) return [400, { error: 'Missing article_id' }];

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
      return [200, { success: true, count: data[article_id].count }];
    } catch (err) {
      console.error('[ArticleViews] Error:', err);
      return [500, { error: err.message }];
    }
  }
  return [405, { error: 'Method not allowed' }];
}

// ============================================================
//  HTTP Server
// ============================================================
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS);
    res.end();
    return;
  }

  const method = req.method;
  const path = (req.url || '/').split('?')[0].replace(/\/$/, '') || '/';
  const body = await readBody(req);
  const ip = getClientIP(req);

  console.log(`[${method}] ${path}`);

async function handleDebug(req) {
  const ip = getClientIP(req || {});
  return [200, {
    ip: ip,
    ipMd5: md5(ip),
    headers: {
      'x-forwarded-for': (req && req.headers && req.headers['x-forwarded-for']) || '(none)',
      'x-real-ip': (req && req.headers && req.headers['x-real-ip']) || '(none)',
      remoteAddress: (req && req.socket && req.socket.remoteAddress) || '(none)',
    },
    timestamp: Math.floor(Date.now() / 1000),
  }];
}

// ============================================================
//  fetchFromJbsou — POST jbsou.cn, 解析JSON返回音频代理URL
//  耗时 ~2-3s, 在SCF默认3s超时内, 是music-play首选方案
//  返回: {name,artist,audioUrl:"jbsou.cn/api.php?..."} 或 null
//  audioUrl是重定向, 浏览器跟随到网易云CDN实际.mp3地址
//  使用ES5语法确保Node.js 10+兼容(无箭头函数/模板字符串)
// ============================================================
function fetchFromJbsou(keyword) {
  return new Promise(function (resolve) {
    var postData = 'input=' + encodeURIComponent(keyword) + '&filter=name&type=netease&page=1';
    var timer = setTimeout(function () { resolve(null); }, 8000);
    var req = https.request('https://www.jbsou.cn/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.jbsou.cn/',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 6000,
    }, function (res) {
      var data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        clearTimeout(timer);
        try {
          var json = JSON.parse(data);
          if (json.code === 200 && json.data && json.data[0]) {
            var s = json.data[0];
            resolve({ name: s.name, artist: s.artist, audioUrl: 'https://www.jbsou.cn/' + s.url });
          } else { resolve(null); }
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', function () { clearTimeout(timer); resolve(null); });
    req.on('timeout', function () { clearTimeout(timer); req.destroy(); resolve(null); });
    req.write(postData);
    req.end();
  });
}

// ============================================================
//  handleMusicPlay — SCF /music-play 端点
//  流程: jbsou.cn(2s) → 成功返回 → at38.cn(20s, 兜底)
//  返回: [200,{found:true,audioUrl,name,artist}] 成功
//        [200,{found:false}] 失败, 前端调用playNext()
//  注意: 必须包含 found:true/false, 前端以此判断是否切换歌曲
// ============================================================
async function handleMusicPlay(method, url) {
  if (method !== 'GET') return [405, { error: 'Method not allowed' }];

  var raw = (url || '').split('?')[1] || '';
  var params = new URLSearchParams(raw);
  var keyword = params.get('keyword') || '';
  if (!keyword) return [400, { error: 'Missing keyword' }];

  // 1) Try jbsou.cn first (fast, ~2-3s)
  var result = await fetchFromJbsou(keyword);
  if (result) return [200, { found: true, name: result.name, artist: result.artist, audioUrl: result.audioUrl }];

  // 2) Fallback to at38.cn (slow, ~20s) — needs SCF timeout >= 25s
  return new Promise(function (resolve) {
    var reqUrl = 'https://www.at38.cn/?keyword=' + encodeURIComponent(keyword);
    https.get(reqUrl, { timeout: 22000, headers: { 'User-Agent': 'Mozilla/5.0' } }, function (res) {
      var html = '';
      res.on('data', function (c) { html += c; });
      res.on('end', function () {
        try {
          var cardMatch = html.match(/<div class="music-card"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="music-card"|<\/div>\s*<\/div>\s*<footer>)/);
          if (!cardMatch) { resolve([200, { found: false }]); return; }
          var card = cardMatch[0];
          var name = (card.match(/<h3>([^<]+)<\/h3>/) || [])[1] || '';
          var artist = (card.match(/歌手：([^|<]+)/) || [])[1] || '';
          var playPath = (card.match(/src="([^"]*action=play[^"]*)"/) || [])[1] || '';
          if (!playPath) { resolve([200, { found: false, name: name, artist: artist }]); return; }
          resolve([200, { found: true, name: name.trim(), artist: artist.trim(), audioUrl: 'https://www.at38.cn/' + playPath }]);
        } catch (e) { resolve([200, { found: false }]); }
      });
    }).on('error', function () { resolve([200, { found: false }]); })
      .on('timeout', function () { resolve([200, { found: false }]); });
  });
}

// ... (keep existing handlers)

  let statusCode, responseBody;

  try {
    if (path === '/debug') {
      [statusCode, responseBody] = await handleDebug(req);
    } else if (path === '/' || path === '') {
      [statusCode, responseBody] = await handleRoot(method, body, ip);
    } else if (path === '/visits') {
      [statusCode, responseBody] = await handleVisits(method, body, ip);
    } else if (path === '/article-views') {
      [statusCode, responseBody] = await handleArticleViews(method, body, ip);
    } else if (path === '/recent-song') {
      [statusCode, responseBody] = await handleRecentSong(method);
    // SCF API路由: /recent-song /music-play /visits /article-views
    } else if (path === '/music-play') {
      [statusCode, responseBody] = await handleMusicPlay(method, req.url);
    } else {
      statusCode = 404;
      responseBody = { error: 'Not found' };
    }
  } catch (err) {
    console.error('[Server] Error:', err.message);
    statusCode = 500;
    responseBody = { error: err.message };
  }

  sendJSON(res, statusCode, responseBody);
});

server.listen(PORT, () => {
  console.log('[blog-like] Ready on port', PORT);
});
