/**
 * confetti.js — Bizim Riyaziyyat
 * Lightweight confetti + math-symbol burst engine.
 * No external dependencies. GPU-accelerated via canvas.
 *
 * Usage:
 *   Confetti.burst();                    // full celebration
 *   Confetti.burst({ origin: {x,y} });   // from a specific point
 *   Confetti.burst({ count: 80, math: true }); // math symbols only
 */

(function () {
  'use strict';

  /* ── Configuration ─────────────────────────────────────────────────────── */
  const DEFAULTS = {
    count    : 120,        // number of particles
    duration : 3500,       // ms before auto-stop
    gravity  : 0.35,       // downward acceleration
    drag     : 0.015,      // air resistance
    math     : false,      // include math symbols instead of shapes
    origin   : null,       // {x, y} in pixels; null = top-centre
    colors   : [
      '#4338ca', '#7c3aed', '#06b6d4',
      '#f59e0b', '#10b981', '#a5b4fc',
      '#fde68a', '#c4b5fd', '#67e8f9',
    ],
  };

  const MATH_SYMS = ['π', '∑', '√', '∞', 'Δ', 'θ', 'λ', '±', '∂', '∫'];

  /* ── Canvas setup ──────────────────────────────────────────────────────── */
  let canvas, ctx, rafId;
  let particles  = [];
  let startTime  = 0;
  let duration   = DEFAULTS.duration;
  let running    = false;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ensureCanvas () {
    canvas = document.getElementById('confettiCanvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confettiCanvas';
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998;';
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /* ── Particle factory ──────────────────────────────────────────────────── */
  function makeParticle (opts) {
    const ox = opts.origin ? opts.origin.x : canvas.width  / 2;
    const oy = opts.origin ? opts.origin.y : -10;

    const angle  = rand(0, Math.PI * 2);
    const speed  = rand(4, 12);
    const useSymbol = opts.math && Math.random() > 0.4;

    return {
      x     : ox + rand(-60, 60),
      y     : oy,
      vx    : Math.cos(angle) * speed * rand(0.4, 1),
      vy    : Math.sin(angle) * speed * rand(-1, -0.3),
      color : opts.colors[Math.floor(rand(0, opts.colors.length))],
      rot   : rand(0, Math.PI * 2),
      drot  : rand(-0.15, 0.15),
      w     : useSymbol ? 0 : rand(8, 16),   // 0 = symbol
      h     : rand(6, 12),
      alpha : 1,
      sym   : useSymbol ? MATH_SYMS[Math.floor(rand(0, MATH_SYMS.length))] : null,
      symSz : rand(16, 26),
      // wobble
      wobble     : rand(0, Math.PI * 2),
      wobbleFreq : rand(0.05, 0.15),
      wobbleAmp  : rand(2, 5),
    };
  }

  /* ── Update ────────────────────────────────────────────────────────────── */
  function update () {
    const elapsed = performance.now() - startTime;
    const fadeStart = duration * 0.65;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.x   += p.vx + Math.sin(p.wobble) * p.wobbleAmp * 0.15;
      p.y   += p.vy;
      p.vx  *= (1 - DEFAULTS.drag);
      p.vy  += DEFAULTS.gravity;
      p.rot += p.drot;
      p.wobble += p.wobbleFreq;

      // Fade out in last third
      if (elapsed > fadeStart) {
        p.alpha = 1 - ((elapsed - fadeStart) / (duration - fadeStart));
      }

      // Remove if off-screen or fully transparent
      if (p.alpha <= 0 || p.y > canvas.height + 40) {
        particles.splice(i, 1);
      }
    }
  }

  /* ── Draw ──────────────────────────────────────────────────────────────── */
  function draw () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);

      if (p.sym) {
        // Math symbol
        ctx.fillStyle = p.color;
        ctx.font      = `bold ${p.symSz}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.sym, 0, 0);
      } else {
        // Rectangle confetto
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      ctx.restore();
    }
  }

  /* ── Loop ──────────────────────────────────────────────────────────────── */
  function loop () {
    const elapsed = performance.now() - startTime;

    update();
    draw();

    if (particles.length === 0 || elapsed > duration + 500) {
      stop();
      return;
    }

    rafId = requestAnimationFrame(loop);
  }

  /* ── Stop ──────────────────────────────────────────────────────────────── */
  function stop () {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    if (ctx)   { ctx.clearRect(0, 0, canvas.width, canvas.height); }
    running = false;
  }

  /* ── Public burst() ────────────────────────────────────────────────────── */
  function burst (userOpts) {
    if (reduced) return;

    const opts = Object.assign({}, DEFAULTS, userOpts || {});
    duration   = opts.duration;

    ensureCanvas();

    // If already running, add more particles
    if (!running) {
      particles = [];
      startTime = performance.now();
      running   = true;
    }

    const count = opts.math
      ? opts.count
      : Math.round(opts.count * 0.6);          // normal confetti + small math share

    for (let i = 0; i < count; i++) {
      particles.push(makeParticle(opts));
    }

    // Always also add a few math symbols regardless
    if (!opts.math) {
      const mathOpts = Object.assign({}, opts, { math: true });
      for (let i = 0; i < Math.round(opts.count * 0.4); i++) {
        particles.push(makeParticle(mathOpts));
      }
    }

    if (!rafId) {
      rafId = requestAnimationFrame(loop);
    }
  }

  /* ── Utilities ─────────────────────────────────────────────────────────── */
  function rand (min, max) {
    return Math.random() * (max - min) + min;
  }

  window.addEventListener('resize', () => {
    if (canvas) {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  });

  /* ── Export ─────────────────────────────────────────────────────────────── */
  window.Confetti = { burst, stop };
})();
