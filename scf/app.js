const https = require('https');
const crypto = require('crypto');

// ============================================================
//  Tencent COS config
// ============================================================
const SECRET_ID = process.env.E2B_SECRET_ID || process.env.TENCENT_SECRET_ID || '';
const SECRET_KEY = process.env.E2B_SECRET_KEY || process.env.TENCENT_SECRET_KEY || '';
const BUCKET = process.env.E2B_COS_BUCKET || 'kreatur-1259781147';
const REGION = process.env.E2B_COS_REGION || 'ap-guangzhou';
const COS_HOST = `${BUCKET}.cos.${REGION}.myqcloud.com`;

// ============================================================
//  NetEase
// ============================================================
const NETEASE_UID = process.env.E2B_NETEASE_UID || process.env.NETEASE_UID || '';
const NETEASE_COOKIE = process.env.E2B_NETEASE_COOKIE || process.env.NETEASE_COOKIE || '';

// ============================================================
//  COS helpers (HMAC-SHA1 auth)
// ============================================================
function cosAuthorization(method, key, headers) {
  const now = Math.floor(Date.now() / 1000);
  const expire = now + 3600;
  const signTime = `${now};${expire}`;
  const httpString = `${method.toLowerCase()}\n/${key}\n\nhost=${COS_HOST}\n`;
  const stringToSign = `sha1\n${signTime}\n${crypto.createHash('sha1').update(httpString).digest('hex')}\n`;
  const signKey = crypto.createHmac('sha1', SECRET_KEY).update(signTime).digest('hex');
  const signature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');
  return `q-sign-algorithm=sha1&q-ak=${SECRET_ID}&q-sign-time=${signTime}&q-key-time=${signTime}&q-header-list=host&q-url-param-list=&q-signature=${signature}`;
}

function cosRequest(method, key, body) {
  return new Promise((resolve, reject) => {
    const headers = { 'Host': COS_HOST };
    headers['Authorization'] = cosAuthorization(method, key, headers);
    if (body) { headers['Content-Length'] = Buffer.byteLength(body, 'utf-8'); }

    const opts = {
      hostname: COS_HOST, port: 443, path: `/${key}`,
      method, headers, timeout: 10000,
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
        } else {
          resolve(null);
        }
      });
    });
    req.on('error', (e) => { resolve(null); });
    req.on('timeout', () => { req.destroy(); resolve(null); });
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
//  NetEase — song list
// ============================================================
function fetchRecentSongsFromNetease() {
  return new Promise((resolve, reject) => {
    if (!NETEASE_UID || !NETEASE_COOKIE) {
      resolve({ error: 'No env vars' });
      return;
    }
    const reqOpts = {
      headers: {
        'Cookie': NETEASE_COOKIE.startsWith('MUSIC_U=') ? NETEASE_COOKIE : `MUSIC_U=${NETEASE_COOKIE}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/',
      },
      timeout: 10000,
    };
    const LIKED_PLAYLIST_ID = '2488546807';
    const detailUrl = `https://music.163.com/api/playlist/detail?id=${LIKED_PLAYLIST_ID}&limit=5`;
    https.get(detailUrl, reqOpts, (res2) => {
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
        } catch (e) { reject(e); }
      });
    }).on('error', (e) => { resolve({ error: 'Fetch error: ' + e.message }); })
      .on('timeout', () => { resolve({ error: 'Timeout' }); });
  });
}

// ============================================================
//  at38.cn audio URL resolver (one song)
// ============================================================
function fetchAudioFromAt38(keyword) {
  return new Promise((resolve) => {
    const reqUrl = `https://www.at38.cn/?keyword=${encodeURIComponent(keyword)}`;
    const timer = setTimeout(() => resolve(null), 25000); // hard timeout 25s

    https.get(reqUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 22000,
    }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        clearTimeout(timer);
        try {
          const cardMatch = html.match(/<div class="music-card"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="music-card"|<\/div>\s*<\/div>\s*<footer>)/);
          if (!cardMatch) { resolve(null); return; }
          const card = cardMatch[0];
          const name = (card.match(/<h3>([^<]+)<\/h3>/) || [])[1] || '';
          const artist = (card.match(/歌手：([^|<]+)/) || [])[1] || '';
          const playPath = (card.match(/src="([^"]*action=play[^"]*)"/) || [])[1] || '';
          if (!playPath) { resolve(null); return; }
          resolve({
            name: name.trim(), artist: artist.trim(),
            audioUrl: 'https://www.at38.cn/' + playPath,
          });
        } catch (e) { resolve(null); }
      });
    }).on('error', () => { clearTimeout(timer); resolve(null); })
      .on('timeout', () => { clearTimeout(timer); resolve(null); });
  });
}

// ============================================================
//  Audio URL cache (persisted to COS)
// ============================================================
async function getAudioCache() {
  const cached = await readJSON('audio-cache.json');
  return cached || {};
}

async function saveAudioCache(cache) {
  await writeJSON('audio-cache.json', cache);
}

// ============================================================
//  Handlers
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

  if (!NETEASE_UID || !NETEASE_COOKIE) {
    return [500, { error: 'Env vars missing',
      hasUid: !!NETEASE_UID, hasCookie: !!NETEASE_COOKIE,
      uidLen: (NETEASE_UID || '').length, cookieLen: (NETEASE_COOKIE || '').length }];
  }

  try {
    const result = await fetchRecentSongsFromNetease();
    if (!result || result.error) {
      if (cached && cached.songs) return [200, { ...cached, fromCache: true }];
      return [502, result || { error: 'Unknown' }];
    }

    await writeJSON('recent-song.json', result);

    // === Pre-cache audio URLs for all songs (background, non-blocking) ===
    (async () => {
      const cache = await getAudioCache();
      if (!cache.songs) cache.songs = {};
      for (const s of result.songs) {
        const kw = `${s.name} ${s.artist}`;
        // Skip if cached recently (< 2 hours)
        if (cache.songs[kw] && (Date.now() - cache.songs[kw].cachedAt) < 7200000) continue;
        console.log('[Cache] Resolving audio:', kw);
        const audio = await fetchAudioFromAt38(kw);
        if (audio) {
          cache.songs[kw] = { ...audio, cachedAt: Date.now() };
          console.log('[Cache] OK:', kw, '->', audio.audioUrl.substring(0, 50));
        } else {
          cache.songs[kw] = { error: 'not found', cachedAt: Date.now() };
          console.log('[Cache] FAIL:', kw);
        }
      }
      cache.updatedAt = Date.now();
      await saveAudioCache(cache);
    })();
    // === end background cache ===

    return [200, { ...result, fromCache: false }];
  } catch (err) {
    console.error('[Server] handleRecentSong error:', err.message);
    if (cached && cached.songs) return [200, { ...cached, fromCache: true }];
    return [502, { error: err.message }];
  }
}

async function handleMusicPlay(method, url) {
  if (method !== 'GET') return [405, { error: 'Method not allowed' }];

  const raw = (url || '').split('?')[1] || '';
  const params = new URLSearchParams(raw);
  const keyword = params.get('keyword') || '';
  if (!keyword) return [400, { error: 'Missing keyword' }];

  // 1) Try cache first (instant)
  const cache = await getAudioCache();
  if (cache.songs && cache.songs[keyword] && cache.songs[keyword].audioUrl) {
    const entry = cache.songs[keyword];
    return [200, { found: true, name: entry.name, artist: entry.artist, audioUrl: entry.audioUrl, fromCache: true }];
  }

  // 2) Cache miss — try live (may take ~20s, but only happens once)
  const audio = await fetchAudioFromAt38(keyword);
  if (audio) {
    // Save to cache
    if (!cache.songs) cache.songs = {};
    cache.songs[keyword] = { ...audio, cachedAt: Date.now() };
    cache.updatedAt = Date.now();
    await saveAudioCache(cache);
    return [200, { found: true, name: audio.name, artist: audio.artist, audioUrl: audio.audioUrl, fromCache: false }];
  }

  return [200, { found: false, error: 'Audio not available' }];
}

// ============================================================
//  Visits / Article Views handlers
// ============================================================
const VALID_PASSWORD = '2476';

async function handleVisits(method, body, ip) {
  if (method === 'GET') {
    const data = await readJSON('visits.json');
    return [200, data || { count: 0, ips: [] }];
  }
  if (method === 'POST') {
    let reqData = {};
    try { reqData = body ? JSON.parse(body) : {}; } catch (e) { reqData = {}; }
    if (reqData.password !== VALID_PASSWORD) return [403, { error: 'Wrong password' }];

    const data = (await readJSON('visits.json')) || { count: 0, ips: [] };
    data.count = (data.count || 0) + 1;
    if (ip && data.ips && !data.ips.includes(ip)) data.ips.push(ip);
    if (data.ips && data.ips.length > 200) data.ips = data.ips.slice(-150);
    await writeJSON('visits.json', data);
    return [200, data];
  }
  return [405, { error: 'Method not allowed' }];
}

const ARTICLES = ['2025-summary', 'emotion', 'nope-loves-you', 'anniversary', 'greedy-snake', 'amor-fati'];

async function handleArticleViews(method, body, ip) {
  if (method === 'GET') {
    const data = await readJSON('article-views.json');
    return [200, data || { views: {} }];
  }
  if (method === 'POST') {
    let reqData = {};
    try { reqData = body ? JSON.parse(body) : {}; } catch (e) { reqData = {}; }
    const { slug } = reqData;
    if (!slug || !ARTICLES.includes(slug)) return [400, { error: 'Invalid slug' }];

    const data = (await readJSON('article-views.json')) || { views: {} };
    data.views[slug] = (data.views[slug] || 0) + 1;
    await writeJSON('article-views.json', data);
    return [200, data];
  }
  return [405, { error: 'Method not allowed' }];
}

// ============================================================
//  Router
// ============================================================
exports.main_handler = async (event, context) => {
  const { path, httpMethod, headers, body, queryString } = event;
  const ip = (headers && (headers['x-forwarded-for'] || headers['x-real-ip'])) || 'unknown';

  // 日志
  console.log(`[${httpMethod}] ${path} — IP: ${ip}`);

  let statusCode, responseBody;

  try {
    if (path === '/visits') {
      [statusCode, responseBody] = await handleVisits(httpMethod, body, ip);
    } else if (path === '/article-views') {
      [statusCode, responseBody] = await handleArticleViews(httpMethod, body, ip);
    } else if (path === '/recent-song') {
      [statusCode, responseBody] = await handleRecentSong(httpMethod);
    } else if (path === '/music-play') {
      [statusCode, responseBody] = await handleMusicPlay(httpMethod, (event.url || event.path || ''));
    } else {
      statusCode = 404;
      responseBody = { error: 'Not found' };
    }
  } catch (err) {
    console.error('[Server] Error:', err.message);
    statusCode = 500;
    responseBody = { error: err.message };
  }

  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(responseBody),
  };
};
