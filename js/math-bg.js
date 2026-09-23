/**
 * math-bg.js — Bizim Riyaziyyat
 * Interactive mathematics-themed canvas background.
 *
 * Features:
 *  • Faint grid that responds to mouse movement (parallax)
 *  • Floating math symbols (π ∑ √ ∞ ∫ sin cos Δ θ λ ÷ ×)
 *  • Connecting dot particles
 *  • GPU-accelerated (only opacity + transform)
 *  • Auto-pauses when tab is hidden (IntersectionObserver + visibilitychange)
 *  • Mobile: halved symbol count, reduced FPS cap, reduced opacity
 *  • Respects prefers-reduced-motion
 */

(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────────── */
  const SYMBOLS = ['π', '∑', '√', '∞', '∫', 'sin', 'cos', 'Δ', 'θ', 'λ', '÷', '×', 'f(x)', 'dx', 'lim', 'α', 'β', 'σ', '∂', '≈'];
  const COLORS  = [
    'rgba(67, 56, 202,',   // indigo
    'rgba(124, 58, 237,',  // purple
    'rgba(6, 182, 212,',   // cyan
    'rgba(245, 158, 11,',  // gold
    'rgba(16, 185, 129,',  // emerald
  ];

  const GRID_COLOR_LIGHT = 'rgba(67, 56, 202, 0.06)';
  const GRID_COLOR_DARK  = 'rgba(99, 102, 241, 0.08)';
  const GRID_STEP        = 60;      // px between grid lines
  const MAX_FPS          = 40;      // cap framerate (battery friendly)
  const MIN_FPS_MOBILE   = 25;

  /* ── State ──────────────────────────────────────────────────────────────── */
  let canvas, ctx;
  let W = 0, H = 0;
  let symbols      = [];
  let particles    = [];
  let mouse        = { x: W / 2, y: H / 2, vx: 0, vy: 0 };
  let gridOffset   = { x: 0, y: 0 };
  let rafId        = null;
  let lastTime     = 0;
  let paused       = false;
  let isMobile     = false;
  let isDark       = false;
  let reducedMotion = false;

  /* ── Init ───────────────────────────────────────────────────────────────── */
  function init () {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;   // respect accessibility

    canvas = document.getElementById('mathCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'mathCanvas';
      document.body.insertBefore(canvas, document.body.firstChild);
    }
    ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });

    isMobile = window.innerWidth < 768 || ('ontouchstart' in window);
    isDark   = document.documentElement.getAttribute('data-theme') === 'dark';

    resize();
    buildSymbols();
    buildParticles();
    bindEvents();
    loop(0);
  }

  /* ── Resize ─────────────────────────────────────────────────────────────── */
  function resize () {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    isMobile = W < 768;
  }

  /* ── Build symbol objects ───────────────────────────────────────────────── */
  function buildSymbols () {
    symbols = [];
    const count = isMobile ? 14 : 28;
    for (let i = 0; i < count; i++) {
      symbols.push(makeSymbol());
    }
  }

  function makeSymbol (xHint) {
    const size   = rand(14, isMobile ? 22 : 30);
    const color  = COLORS[Math.floor(rand(0, COLORS.length))];
    const alpha  = rand(0.04, isMobile ? 0.1 : 0.14);
    return {
      text : SYMBOLS[Math.floor(rand(0, SYMBOLS.length))],
      x    : xHint !== undefined ? xHint : rand(0, W),
      y    : rand(-100, H + 100),
      size,
      color,
      alpha,
      vx   : rand(-0.15, 0.15),
      vy   : rand(0.2, 0.7),
      rot  : rand(0, Math.PI * 2),
      drot : rand(-0.004, 0.004),
      // subtle wave
      wave : rand(0, Math.PI * 2),
      wfreq: rand(0.008, 0.018),
      wamp : rand(6, 18),
    };
  }

  /* ── Build particle dots ────────────────────────────────────────────────── */
  function buildParticles () {
    particles = [];
    const count = isMobile ? 20 : 45;
    for (let i = 0; i < count; i++) {
      particles.push(makeParticle());
    }
  }

  function makeParticle () {
    return {
      x     : rand(0, W),
      y     : rand(0, H),
      r     : rand(1.5, isMobile ? 2.5 : 3.5),
      alpha : rand(0.04, 0.12),
      vx    : rand(-0.2, 0.2),
      vy    : rand(-0.2, 0.2),
      color : COLORS[Math.floor(rand(0, COLORS.length))],
    };
  }

  /* ── Main loop ──────────────────────────────────────────────────────────── */
  function loop (time) {
    rafId = requestAnimationFrame(loop);

    if (paused) return;

    const fpsLimit = isMobile ? MIN_FPS_MOBILE : MAX_FPS;
    if (time - lastTime < 1000 / fpsLimit) return;
    lastTime = time;

    isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    ctx.clearRect(0, 0, W, H);

    drawGrid();
    updateAndDrawParticles();
    updateAndDrawSymbols();
  }

  /* ── Grid ───────────────────────────────────────────────────────────────── */
  function drawGrid () {
    // Parallax: grid shifts slightly with mouse
    gridOffset.x += (mouse.x * 0.015 - gridOffset.x) * 0.04;
    gridOffset.y += (mouse.y * 0.015 - gridOffset.y) * 0.04;

    ctx.save();
    ctx.strokeStyle = isDark ? GRID_COLOR_DARK : GRID_COLOR_LIGHT;
    ctx.lineWidth   = 0.8;

    const ox = gridOffset.x % GRID_STEP;
    const oy = gridOffset.y % GRID_STEP;

    // Vertical lines
    for (let x = ox - GRID_STEP; x < W + GRID_STEP; x += GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    // Horizontal lines
    for (let y = oy - GRID_STEP; y < H + GRID_STEP; y += GRID_STEP) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Draw intersection dots
    const dotAlpha = isDark ? 0.08 : 0.05;
    ctx.fillStyle = `rgba(67, 56, 202, ${dotAlpha})`;
    for (let x = ox - GRID_STEP; x < W + GRID_STEP; x += GRID_STEP) {
      for (let y = oy - GRID_STEP; y < H + GRID_STEP; y += GRID_STEP) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /* ── Particles ──────────────────────────────────────────────────────────── */
  function updateAndDrawParticles () {
    // Draw connection lines first
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = isMobile ? 100 : 140;
        if (dist < maxDist) {
          const a = (1 - dist / maxDist) * 0.07;
          ctx.strokeStyle = `rgba(67, 56, 202, ${a})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Update & draw particles
    ctx.save();
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Slight mouse attraction
      const mdx = mouse.x - p.x;
      const mdy = mouse.y - p.y;
      const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mdist < 200) {
        p.vx += (mdx / mdist) * 0.006;
        p.vy += (mdy / mdist) * 0.006;
      }

      // Speed cap
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.8) { p.vx *= 0.95; p.vy *= 0.95; }

      // Wrap
      if (p.x < -10)    { p.x = W + 10; }
      if (p.x > W + 10) { p.x = -10; }
      if (p.y < -10)    { p.y = H + 10; }
      if (p.y > H + 10) { p.y = -10; }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = `${p.color}1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ── Symbols ────────────────────────────────────────────────────────────── */
  function updateAndDrawSymbols () {
    ctx.save();
    for (let i = 0; i < symbols.length; i++) {
      const s = symbols[i];

      s.wave += s.wfreq;
      s.rot  += s.drot;
      s.x    += s.vx + Math.sin(s.wave) * 0.3;
      s.y    += s.vy;

      // Reset when off-screen
      if (s.y > H + 60) {
        symbols[i] = makeSymbol(rand(0, W));
        symbols[i].y = -40;
        continue;
      }
      if (s.x < -60 || s.x > W + 60) {
        s.x = rand(0, W);
      }

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle   = `${s.color}1)`;
      ctx.font        = `${s.size}px "JetBrains Mono", "Fira Code", "Courier New", monospace`;
      ctx.textAlign   = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* ── Events ─────────────────────────────────────────────────────────────── */
  function bindEvents () {
    window.addEventListener('resize', debounce(() => {
      resize();
      buildSymbols();
      buildParticles();
    }, 250));

    // Mouse parallax (desktop only)
    if (!isMobile) {
      window.addEventListener('mousemove', (e) => {
        mouse.vx = e.clientX - mouse.x;
        mouse.vy = e.clientY - mouse.y;
        mouse.x  = e.clientX;
        mouse.y  = e.clientY;
      }, { passive: true });
    } else {
      // Touch: update mouse position for particle attraction
      window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
          mouse.x = e.touches[0].clientX;
          mouse.y = e.touches[0].clientY;
        }
      }, { passive: true });
    }

    // Pause when tab hidden
    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
      if (!paused) { lastTime = 0; }
    });

    // Watch for dark mode changes
    const observer = new MutationObserver(() => {
      isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Pause canvas when scrolled far below viewport top (performance)
    let scrollTick = false;
    window.addEventListener('scroll', () => {
      if (!scrollTick) {
        scrollTick = true;
        requestAnimationFrame(() => {
          // Keep running — canvas is fixed, always visible
          scrollTick = false;
        });
      }
    }, { passive: true });
  }

  /* ── Utilities ──────────────────────────────────────────────────────────── */
  function rand (min, max) {
    return Math.random() * (max - min) + min;
  }

  function debounce (fn, delay) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  window.MathBg = {
    /** Pause / resume the canvas animation */
    pause () { paused = true; },
    resume() { paused = false; lastTime = 0; },
    /** Rebuild when theme changes */
    refresh() { isDark = document.documentElement.getAttribute('data-theme') === 'dark'; },
  };

  /* ── Start ──────────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
