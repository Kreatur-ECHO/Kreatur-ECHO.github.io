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
      spawnRate: 3,          // 每帧生成数 (60fps 下)
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
