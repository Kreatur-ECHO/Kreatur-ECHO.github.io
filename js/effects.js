/**
 * ============================================================
 *  Cursor Particles & Click Ripple — 鼠标粒子 & 点击波纹
 * ============================================================
 *
 * 粒子:
 *   - 在鼠标位置附近生成，自然下落
 *   - 同时存在上限 20 个，每个存活 0.5 秒
 *   - 半透明，渐隐消失
 *
 * 波纹:
 *   - 鼠标点击时在点击位置生成
 *   - 同心圆向外扩散，持续 1 秒
 *   - 最多同时 5 个波纹
 *
 * 可调参数见 CONFIG
 * ============================================================
 */

const CursorEffects = (() => {
  const CONFIG = {
    // 粒子设置
    particle: {
      maxCount: 40,           // 同时存在上限
      lifespan: 0.5,         // 存活秒数
      sizeMin: 2,            // 最小半径
      sizeMax: 5,            // 最大半径
      spawnRate: 4.5,          // 每帧生成数 (60fps 下)
      gravity: 120,          // 重力加速度 (px/s²)
      driftRange: 30,        // 水平漂移范围 (px/s)
      opacityPeak: 0.55,     // 最大不透明度
      color: '#6c63ff',      // 浅色模式颜色
      colorDark: '#a9a3ff',  // 深色模式颜色
    },

    // 波纹设置
    ripple: {
      maxCount: 5,           // 同时存在上限
      lifespan: 1.0,         // 持续秒数
      startRadius: 4,         // 起始半径
      endRadius: 20,         // 结束半径
      lineWidth: 1.8,        // 线宽
      opacityPeak: 0.45,     // 最大不透明度
      color: '#6c63ff',      // 浅色模式颜色
      colorDark: '#a9a3ff',  // 深色模式颜色
    },
  };

  let canvas, ctx, animationId = null;
  let viewW = 0, viewH = 0;
  let isDark = false, running = false;

  // 鼠标状态
  let mouseX = -100, mouseY = -100;
  let mouseOnScreen = false;
  let lastFrameTime = 0;
  let frameAccum = 0;       // 用于控制粒子生成频率

  // 活跃对象
  let particles = [];
  let ripples = [];

  // ============================================================
  //  初始化
  // ============================================================
  function init() {
    // 手机端关闭 Canvas 粒子（性能）
    if (window.matchMedia('(max-width: 640px)').matches) return;

    // 防止重复初始化（页面内导航会多次触发 renderHomePage）
    if (running) destroy();
    canvas = document.createElement('canvas');
    canvas.id = 'cursor-fx-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100vw', height: '100vh',
      'pointer-events': 'none', 'z-index': '9999',
    });
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');
    if (!ctx) return;

    resize();
    updateColor();

    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('click', onClick);

    new MutationObserver(updateColor)
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    lastFrameTime = performance.now();
    running = true;
    tick();
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    canvas.style.width = viewW + 'px';
    canvas.style.height = viewH + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  function onMouseMove(e) { mouseX = e.clientX; mouseY = e.clientY; mouseOnScreen = true; }
  function onMouseLeave()  { mouseOnScreen = false; }

  function onClick(e) {
    // 生成波纹
    const cfg = CONFIG.ripple;
    // 超出上限时移除最旧的
    while (ripples.length >= cfg.maxCount) ripples.shift();

    ripples.push({
      x: e.clientX,
      y: e.clientY,
      born: performance.now() / 1000,
      lifespan: cfg.lifespan,
    });
  }

  function updateColor() {
    isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  }

  // ============================================================
  //  主循环
  // ============================================================
  function tick() {
    if (!running) return;
    const now = performance.now() / 1000; // 秒
    let dt = now - lastFrameTime;
    lastFrameTime = now;

    // 防止大帧跳跃
    if (dt > 0.1) dt = 0.1;
    if (dt <= 0) dt = 0.016;

    update(dt, now);
    draw(now);
    animationId = requestAnimationFrame(tick);
  }

  // ============================================================
  //  更新
  // ============================================================
  function update(dt, now) {
    const pcfg = CONFIG.particle;

    // ---- 粒子生成 ----
    if (mouseOnScreen) {
      frameAccum += dt * pcfg.spawnRate;
      while (frameAccum >= 1 && particles.length < pcfg.maxCount) {
        frameAccum -= 1;
        spawnParticle(now);
      }
    }

    // ---- 移除过期粒子 ----
    particles = particles.filter(p => now - p.born < pcfg.lifespan);

    // ---- 移除过期波纹 ----
    ripples = ripples.filter(r => now - r.born < r.lifespan);
  }

  function spawnParticle(now) {
    const cfg = CONFIG.particle;
    particles.push({
      x: mouseX + (Math.random() - 0.5) * 16,
      y: mouseY + (Math.random() - 0.5) * 10,
      size: cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
      born: now,
      lifespan: cfg.lifespan * (0.7 + Math.random() * 0.3), // 略有随机
      driftX: (Math.random() - 0.5) * cfg.driftRange * 2,    // 水平初速度
      driftY: -20 - Math.random() * 30,                       // 初始上抛
    });
  }

  // ============================================================
  //  绘制
  // ============================================================
  function draw(now) {
    if (!ctx) return;
    ctx.clearRect(0, 0, viewW, viewH);

    const color = isDark ? CONFIG.particle.colorDark : CONFIG.particle.color;
    const rgb = hexToRgb(color);
    const rippleColor = isDark ? CONFIG.ripple.colorDark : CONFIG.ripple.color;
    const rippleRgb = hexToRgb(rippleColor);

    // ---- 粒子 ----
    for (const p of particles) {
      const elapsed = now - p.born;
      const progress = Math.min(elapsed / p.lifespan, 1);

      // 物理更新
      const curX = p.x + p.driftX * elapsed;
      const curY = p.y + p.driftY * elapsed + 0.5 * CONFIG.particle.gravity * elapsed * elapsed;

      // 透明度: 快速淡入 → 保持 → 淡出
      let alpha;
      if (progress < 0.15) {
        alpha = CONFIG.particle.opacityPeak * (progress / 0.15);
      } else if (progress > 0.65) {
        alpha = CONFIG.particle.opacityPeak * (1 - (progress - 0.65) / 0.35);
      } else {
        alpha = CONFIG.particle.opacityPeak;
      }

      // 尺寸: 先膨胀后收缩
      const sizeScale = progress < 0.3
        ? 0.6 + 0.4 * (progress / 0.3)
        : 1 - 0.3 * ((progress - 0.3) / 0.7);

      const r = p.size * sizeScale;

      // 绘制发光圆点
      const glow = ctx.createRadialGradient(curX, curY, 0, curX, curY, r * 2.5);
      glow.addColorStop(0, `rgba(${rgb}, ${(alpha * 0.9).toFixed(3)})`);
      glow.addColorStop(0.4, `rgba(${rgb}, ${(alpha * 0.4).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${rgb}, 0)`);

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(curX, curY, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 实心小核心
      ctx.fillStyle = `rgba(${rgb}, ${(alpha * 0.7).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(curX, curY, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- 波纹 ----
    for (const r of ripples) {
      const elapsed = now - r.born;
      const progress = Math.min(elapsed / r.lifespan, 1);

      // 半径从 startRadius → endRadius
      const radius = CONFIG.ripple.startRadius +
        (CONFIG.ripple.endRadius - CONFIG.ripple.startRadius) * easeOutCubic(progress);

      // 透明度: 开始最高 → 线性衰减
      const alpha = CONFIG.ripple.opacityPeak * (1 - progress);

      // 线宽: 逐渐变细
      const lw = CONFIG.ripple.lineWidth * (1 - progress * 0.8);

      ctx.strokeStyle = `rgba(${rippleRgb}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 第二圈（略延迟、略淡）
      if (progress > 0.15 && progress < 0.85) {
        const innerProgress = (progress - 0.15) / 0.7;
        const innerRadius = radius * 0.55;
        const innerAlpha = alpha * 0.45 * (1 - Math.abs(innerProgress - 0.5) * 2);

        ctx.strokeStyle = `rgba(${rippleRgb}, ${innerAlpha.toFixed(3)})`;
        ctx.lineWidth = lw * 0.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, innerRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // ============================================================
  //  工具
  // ============================================================
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (m) return `${parseInt(m[1],16)}, ${parseInt(m[2],16)}, ${parseInt(m[3],16)}`;
    return '108, 99, 255';
  }

  function destroy() {
    running = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    window.removeEventListener('resize', resize);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeave);
    document.removeEventListener('click', onClick);
    canvas = ctx = null;
  }

  return { init, destroy };
})();

/**
 * ============================================================
 *  Hero Geometry — 首页 Hero 区域漂浮变形几何体
 * ============================================================
 *
 * 在光模式下 Hero 区域生成随机线框几何体：
 *   - 顶点持续变形（随机插值）
 *   - 3D 旋转投影到 2D
 *   - 渐入 1s → 存在 3s → 渐出 1s
 *   - 随机方向缓慢飘荡
 *   - 仅光模式显示，暗模式/手机端不渲染
 */
const HeroGeometry = (() => {
  const CFG = {
    maxShapes: 5,
    fadeIn: 1.5,
    visible: 5.0,
    fadeOut: 1.5,
    driftSpeed: 6,          // px/s
    vertexCount: [4, 7],   // 顶点数范围
    sizeRange: [40, 90],   // 尺寸范围
    strokeColor: '#6c63ff',
    lineWidth: 1.0,
  };

  let canvas, ctx, animationId = null;
  let shapes = [];
  let running = false;
  let heroEl = null;

  function init() {
    if (running) return;
    if (window.matchMedia('(max-width: 640px)').matches) return;

    heroEl = document.getElementById('about');
    if (!heroEl) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) return;

    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute', top: '0', left: '0',
      width: '100%', height: '100%',
      'pointer-events': 'none', 'z-index': '0',
    });
    heroEl.style.position = heroEl.style.position || 'relative';
    heroEl.appendChild(canvas);

    ctx = canvas.getContext('2d');
    if (!ctx) return;

    resize();
    window.addEventListener('resize', resize);

    // 监听主题切换
    new MutationObserver(() => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (dark) destroy();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    running = true;
    tick();
  }

  function resize() {
    if (!canvas || !heroEl) return;
    const dpr = window.devicePixelRatio || 1;
    const w = heroEl.offsetWidth;
    const h = heroEl.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  // ============================================================
  //  形状生成
  // ============================================================
  function spawnShape(now) {
    const w = heroEl.offsetWidth;
    const h = heroEl.offsetHeight;
    const vCount = CFG.vertexCount[0] + Math.floor(Math.random() * (CFG.vertexCount[1] - CFG.vertexCount[0] + 1));

    // 生成随机顶点（3D）
    const vertices = [];
    const targetVertices = [];
    const size = CFG.sizeRange[0] + Math.random() * (CFG.sizeRange[1] - CFG.sizeRange[0]);
    for (let i = 0; i < vCount; i++) {
      vertices.push(randomVertex(size));
      targetVertices.push(randomVertex(size));
    }

    // 生成边（连接相邻顶点形成线框）
    const edges = [];
    for (let i = 0; i < vCount; i++) {
      for (let j = i + 1; j < vCount; j++) {
        if (Math.random() < 0.35) {
          edges.push([i, j]);
        }
      }
    }
    // 确保每个顶点至少有一条边
    for (let i = 0; i < vCount; i++) {
      if (!edges.some(e => e[0] === i || e[1] === i)) {
        const j = (i + 1) % vCount;
        edges.push([i, j]);
      }
    }

    const totalLife = CFG.fadeIn + CFG.visible + CFG.fadeOut;
    shapes.push({
      vertices: vertices,
      targetVertices: targetVertices,
      edges: edges,
      born: now,
      lifespan: totalLife,
      // 初始位置：Hero 区域随机
      x: w * 0.2 + Math.random() * w * 0.6,
      y: h * 0.2 + Math.random() * h * 0.6,
      // 飘荡方向
      driftX: (Math.random() - 0.5) * CFG.driftSpeed,
      driftY: (Math.random() - 0.5) * CFG.driftSpeed,
      // 旋转速度
      rotX: (Math.random() - 0.5) * 0.35,
      rotY: (Math.random() - 0.5) * 0.35,
      rotZ: (Math.random() - 0.5) * 0.2,
      angleX: Math.random() * Math.PI * 2,
      angleY: Math.random() * Math.PI * 2,
      angleZ: Math.random() * Math.PI * 2,
      morphTimer: 0,
      morphInterval: 2.5 + Math.random() * 3.5,
    });
  }

  function randomVertex(size) {
    return {
      x: (Math.random() - 0.5) * size * 2,
      y: (Math.random() - 0.5) * size * 2,
      z: (Math.random() - 0.5) * size * 2,
    };
  }

  function lerpV(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }

  // ============================================================
  //  主循环
  // ============================================================
  function tick() {
    if (!running) return;
    const now = performance.now() / 1000;

    // 维持形状数量
    while (shapes.length < CFG.maxShapes) {
      spawnShape(now);
    }

    update(now);
    draw(now);

    // 移除过期形状
    shapes = shapes.filter(s => now - s.born < s.lifespan);
    // 补充新形状
    if (shapes.length < CFG.maxShapes && Math.random() < 0.3) {
      spawnShape(now);
    }

    animationId = requestAnimationFrame(tick);
  }

  function update(now) {
    for (const s of shapes) {
      const elapsed = now - s.born;
      s.x += s.driftX * 0.016;
      s.y += s.driftY * 0.016;
      s.angleX += s.rotX * 0.016;
      s.angleY += s.rotY * 0.016;
      s.angleZ += s.rotZ * 0.016;

      // 顶点变形
      s.morphTimer += 0.016;
      if (s.morphTimer >= s.morphInterval) {
        s.morphTimer = 0;
        s.morphInterval = 0.8 + Math.random() * 1.2;
        const size = CFG.sizeRange[0] + Math.random() * (CFG.sizeRange[1] - CFG.sizeRange[0]);
        for (let i = 0; i < s.vertices.length; i++) {
          s.targetVertices[i] = randomVertex(size);
        }
      }
      // 平滑插值
      const t = Math.min(s.morphTimer / s.morphInterval, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      for (let i = 0; i < s.vertices.length; i++) {
        s.vertices[i] = lerpV(s.vertices[i], s.targetVertices[i], ease * 0.015);
      }
    }
  }

  function draw(now) {
    if (!ctx) return;
    const w = heroEl.offsetWidth;
    const h = heroEl.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    const rgb = hexToRgb(CFG.strokeColor);

    for (const s of shapes) {
      const elapsed = now - s.born;
      let alpha;
      if (elapsed < CFG.fadeIn) {
        alpha = elapsed / CFG.fadeIn;
      } else if (elapsed < CFG.fadeIn + CFG.visible) {
        alpha = 1;
      } else {
        const fadeProgress = (elapsed - CFG.fadeIn - CFG.visible) / CFG.fadeOut;
        alpha = 1 - Math.min(fadeProgress, 1);
      }
      if (alpha <= 0) continue;
      alpha *= 0.18; // 整体半透明

      // 3D 旋转投影
      const projected = s.vertices.map(v => {
        // 绕 X 轴
        let y1 = v.y * Math.cos(s.angleX) - v.z * Math.sin(s.angleX);
        let z1 = v.y * Math.sin(s.angleX) + v.z * Math.cos(s.angleX);
        // 绕 Y 轴
        let x2 = v.x * Math.cos(s.angleY) + z1 * Math.sin(s.angleY);
        let z2 = -v.x * Math.sin(s.angleY) + z1 * Math.cos(s.angleY);
        // 绕 Z 轴
        let x3 = x2 * Math.cos(s.angleZ) - y1 * Math.sin(s.angleZ);
        let y3 = x2 * Math.sin(s.angleZ) + y1 * Math.cos(s.angleZ);
        // 透视投影
        const dist = 300;
        const scale = dist / (dist + z2);
        return { x: s.x + x3 * scale, y: s.y + y3 * scale };
      });

      // 绘制边
      ctx.strokeStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = CFG.lineWidth;
      ctx.beginPath();
      for (const [i, j] of s.edges) {
        ctx.moveTo(projected[i].x, projected[i].y);
        ctx.lineTo(projected[j].x, projected[j].y);
      }
      ctx.stroke();

      // 顶点小圆点
      ctx.fillStyle = `rgba(${rgb}, ${(alpha * 1.8).toFixed(3)})`;
      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (m) return `${parseInt(m[1],16)}, ${parseInt(m[2],16)}, ${parseInt(m[3],16)}`;
    return '108, 99, 255';
  }

  function destroy() {
    running = false;
    if (animationId) cancelAnimationFrame(animationId);
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    window.removeEventListener('resize', resize);
    canvas = ctx = null;
    shapes = [];
  }

  return { init, destroy };
})();
