/**
 * animations.js — Bizim Riyaziyyat
 * Core animation engine:
 *  1. Page transitions (fade + slide)
 *  2. Scroll-reveal (IntersectionObserver)
 *  3. Animated counters
 *  4. Ripple effect on buttons
 *  5. 3D tilt on cards
 *  6. Navbar scroll class
 *  7. Scroll-to-top button
 *  8. Micro-interactions (form focus, nav hover)
 *  9. Hero shape injection
 * 10. Circular timer helper (exported)
 * 11. Answer feedback helpers (exported)
 * 12. Result progress bar helper (exported)
 */

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ════════════════════════════════════════════════════════════════════════
     1. PAGE TRANSITIONS
  ════════════════════════════════════════════════════════════════════════ */
  let overlay;

  function initPageTransitions () {
    // Create overlay if not already in DOM
    overlay = document.getElementById('pageTransition');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pageTransition';
      document.body.appendChild(overlay);
    }

    // Intercept internal link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      // Skip external, hash, mailto, tel, JS links
      if (!href ||
          href.startsWith('http') ||
          href.startsWith('//') ||
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('javascript:') ||
          link.hasAttribute('download') ||
          link.target === '_blank') return;

      e.preventDefault();
      navigateTo(href);
    });

    // Fade in on arrival
    window.addEventListener('pageshow', revealPage);
    revealPage();
  }

  function navigateTo (href) {
    if (reduced) { window.location.href = href; return; }

    overlay.classList.remove('leaving');
    overlay.classList.add('entering');

    setTimeout(() => {
      window.location.href = href;
    }, 320);
  }

  function revealPage () {
    if (!overlay) return;
    overlay.classList.remove('entering');
    overlay.classList.add('leaving');
    setTimeout(() => {
      overlay.classList.remove('leaving');
    }, 500);
  }

  /* ════════════════════════════════════════════════════════════════════════
     2. SCROLL-REVEAL  (IntersectionObserver)
  ════════════════════════════════════════════════════════════════════════ */
  function initScrollReveal () {
    if (reduced) return;

    // Auto-tag elements that should reveal
    const selectors = [
      '.feature-card',
      '.card:not(.no-reveal)',
      '.section-title',
      '.section-subtitle',
      '.hero-stat',
      '.news-card, .test-card, .teacher-card, .pdf-card',
      '.stat-card',
      '.pricing-card',
      'table',
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach((el, i) => {
        if (el.closest('#mathCanvas')) return;
        if (el.classList.contains('sr-hidden')) return; // already tagged

        el.classList.add('sr-hidden', 'sr-up');

        // Stagger siblings
        const delay = Math.min(i % 6, 5) + 1;
        el.classList.add(`sr-d${delay}`);
      });
    });

    // Also honour manually tagged elements
    document.querySelectorAll('[data-sr]').forEach(el => {
      const dir = el.dataset.sr || 'up';
      el.classList.add('sr-hidden', `sr-${dir}`);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('sr-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.sr-hidden').forEach(el => io.observe(el));
  }

  /* ════════════════════════════════════════════════════════════════════════
     3. ANIMATED COUNTERS
  ════════════════════════════════════════════════════════════════════════ */
  function initCounters () {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        animateCounter(entry.target);
      });
    }, { threshold: 0.5 });

    counters.forEach(el => io.observe(el));

    // Also trigger hero stats automatically
    document.querySelectorAll('.hero-stat h3').forEach(el => {
      const text = el.textContent.trim();
      const match = text.match(/^([\d,]+)/);
      if (!match) return;

      const target = parseInt(match[1].replace(/,/g, ''), 10);
      const suffix = text.replace(match[1], '');

      el.dataset.countTarget = target;
      el.dataset.countSuffix = suffix;
      el.classList.add('animated-counter');

      io.observe(el);
    });
  }

  function animateCounter (el) {
    if (reduced) return;

    const target  = parseInt(el.dataset.countTarget || el.dataset.count, 10);
    const suffix  = el.dataset.countSuffix || '';
    const prefix  = el.dataset.countPrefix || '';
    const duration = parseInt(el.dataset.countDuration || '1800', 10);

    if (isNaN(target)) return;

    const start    = performance.now();
    const startVal = 0;

    function tick (now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const value    = Math.round(startVal + (target - startVal) * eased);

      el.textContent = prefix + value.toLocaleString('az-AZ') + suffix;

      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /** Public: trigger counter on any element */
  window.AnimatedCounter = { run: animateCounter };

  /* ════════════════════════════════════════════════════════════════════════
     4. RIPPLE EFFECT
  ════════════════════════════════════════════════════════════════════════ */
  function initRipple () {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn, .ripple');
      if (!btn || reduced) return;

      const rect   = btn.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height) * 2;
      const x      = e.clientX - rect.left - size / 2;
      const y      = e.clientY - rect.top  - size / 2;

      // Ensure relative positioning
      if (getComputedStyle(btn).position === 'static') {
        btn.style.position = 'relative';
      }
      btn.style.overflow = 'hidden';

      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.cssText = `
        width:  ${size}px;
        height: ${size}px;
        left:   ${x}px;
        top:    ${y}px;
      `;

      btn.appendChild(wave);
      wave.addEventListener('animationend', () => wave.remove());
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     5. 3D TILT
  ════════════════════════════════════════════════════════════════════════ */
  function initTilt () {
    if (reduced || window.matchMedia('(hover: none)').matches) return;

    const TILT_MAX = 10; // degrees

    function onEnter (e) {
      const el   = e.currentTarget;
      el.classList.add('tilt-card');

      // Inject shine layer if not present
      if (!el.querySelector('.tilt-shine')) {
        const shine = document.createElement('div');
        shine.className = 'tilt-shine';
        el.appendChild(shine);
      }
    }

    function onMove (e) {
      const el   = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const cx   = rect.left + rect.width  / 2;
      const cy   = rect.top  + rect.height / 2;
      const dx   = (e.clientX - cx) / (rect.width  / 2);
      const dy   = (e.clientY - cy) / (rect.height / 2);

      const rx = -dy * TILT_MAX;
      const ry =  dx * TILT_MAX;

      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1)`;

      // Update shine position
      const shine = el.querySelector('.tilt-shine');
      if (shine) {
        const px = ((e.clientX - rect.left) / rect.width)  * 100;
        const py = ((e.clientY - rect.top)  / rect.height) * 100;
        shine.style.setProperty('--mouse-x', `${px}%`);
        shine.style.setProperty('--mouse-y', `${py}%`);
        shine.style.backgroundImage = `radial-gradient(circle at ${px}% ${py}%, rgba(255,255,255,0.15) 0%, transparent 60%)`;
      }
    }

    function onLeave (e) {
      const el = e.currentTarget;
      el.style.transform = '';
      const shine = el.querySelector('.tilt-shine');
      if (shine) shine.style.backgroundImage = '';
    }

    // Apply to feature cards and main cards
    function attachTilt () {
      document.querySelectorAll('.feature-card, .tilt-target').forEach(el => {
        if (el.dataset.tiltBound) return;
        el.dataset.tiltBound = '1';
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mousemove',  onMove);
        el.addEventListener('mouseleave', onLeave);
      });
    }

    attachTilt();

    // Re-attach on dynamic content
    const mo = new MutationObserver(debounce(attachTilt, 200));
    mo.observe(document.body, { childList: true, subtree: true });
  }

  /* ════════════════════════════════════════════════════════════════════════
     6. NAVBAR SCROLL CLASS
  ════════════════════════════════════════════════════════════════════════ */
  function initNavbar () {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          nav.classList.toggle('scrolled', window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ════════════════════════════════════════════════════════════════════════
     7. SCROLL-TO-TOP BUTTON
  ════════════════════════════════════════════════════════════════════════ */
  function initScrollTop () {
    let btn = document.getElementById('scrollTopBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'scrollTopBtn';
      btn.setAttribute('aria-label', 'Yuxarı qayıt');
      btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
      document.body.appendChild(btn);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          btn.classList.toggle('visible', window.scrollY > 350);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     8. HERO SHAPES
  ════════════════════════════════════════════════════════════════════════ */
  function initHeroShapes () {
    const hero = document.querySelector('.hero');
    if (!hero || hero.querySelector('.hero-shapes') || reduced) return;

    const wrap = document.createElement('div');
    wrap.className = 'hero-shapes';
    wrap.innerHTML = '<div class="hero-shape"></div><div class="hero-shape"></div><div class="hero-shape"></div>';
    hero.insertBefore(wrap, hero.firstChild);
  }

  /* ════════════════════════════════════════════════════════════════════════
     9. FORM MICRO-INTERACTIONS
  ════════════════════════════════════════════════════════════════════════ */
  function initFormInteractions () {
    document.querySelectorAll('.form-control').forEach(el => {
      el.addEventListener('focus', () => {
        el.parentElement?.classList.add('focused');
      });
      el.addEventListener('blur', () => {
        el.parentElement?.classList.remove('focused');
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     10. CIRCULAR TIMER  (exported for test pages)
  ════════════════════════════════════════════════════════════════════════ */
  /**
   * Creates and manages a circular SVG countdown timer.
   * @param {HTMLElement} container  - Element to inject the timer into
   * @param {number}      totalSecs  - Full duration in seconds
   * @returns {{ update(remaining), destroy() }}
   */
  function createCircularTimer (container, totalSecs) {
    const R   = 34;           // circle radius
    const C   = 2 * Math.PI * R; // circumference

    container.innerHTML = `
      <div class="circular-timer" id="_ct_wrap">
        <svg viewBox="0 0 80 80">
          <circle class="track"    cx="40" cy="40" r="${R}"/>
          <circle class="progress" cx="40" cy="40" r="${R}"
            stroke-dasharray="${C}"
            stroke-dashoffset="0"/>
        </svg>
        <div class="time-label" id="_ct_label">--:--</div>
      </div>`;

    const wrap     = container.querySelector('#_ct_wrap');
    const progress = container.querySelector('.progress');
    const label    = container.querySelector('#_ct_label');

    function update (remaining) {
      const ratio  = Math.max(0, remaining / totalSecs);
      const offset = C * (1 - ratio);

      progress.style.strokeDashoffset = offset;

      // Colour states
      wrap.classList.remove('warning', 'danger');
      progress.classList.remove('warning', 'danger');
      if (ratio < 0.25) {
        wrap.classList.add('danger');
        progress.classList.add('danger');
      } else if (ratio < 0.5) {
        wrap.classList.add('warning');
        progress.classList.add('warning');
      }

      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      label.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }

    function destroy () {
      container.innerHTML = '';
    }

    return { update, destroy };
  }

  window.CircularTimer = createCircularTimer;

  /* ════════════════════════════════════════════════════════════════════════
     11. ANSWER FEEDBACK  (exported for test pages)
  ════════════════════════════════════════════════════════════════════════ */
  /**
   * Animate an answer option element as correct or wrong.
   * @param {HTMLElement} el        - The option element
   * @param {'correct'|'wrong'} type
   */
  function animateAnswer (el, type) {
    el.classList.remove('correct', 'wrong');
    // Force reflow so animation re-plays
    void el.offsetWidth;
    el.classList.add(type);

    // Inject icon badge
    let badge = el.querySelector('.answer-badge');
    if (!badge) {
      badge = document.createElement('span');
      el.appendChild(badge);
    }
    badge.className = `answer-badge ${type === 'correct' ? 'correct-badge' : 'wrong-badge'}`;
    badge.textContent = type === 'correct' ? '✓' : '✗';
  }

  window.AnimateAnswer = animateAnswer;

  /* ════════════════════════════════════════════════════════════════════════
     12. RESULT PROGRESS BAR  (exported for test pages)
  ════════════════════════════════════════════════════════════════════════ */
  /**
   * Animates a result bar from 0 → pct%.
   * @param {HTMLElement} barEl   - .result-bar element
   * @param {number}      pct     - Target percentage 0-100
   */
  function animateResultBar (barEl, pct) {
    barEl.style.width = '0%';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        barEl.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      });
    });
  }

  window.AnimateResultBar = animateResultBar;

  /* ════════════════════════════════════════════════════════════════════════
     MATH LOADER helper
  ════════════════════════════════════════════════════════════════════════ */
  /**
   * Replace inner content of a container with the math loader animation.
   * @param {HTMLElement} el
   */
  function showMathLoader (el) {
    el.innerHTML = `
      <div class="math-loader" role="status" aria-label="Yüklənir...">
        <span class="sym">π</span>
        <span class="sym">∑</span>
        <span class="sym">√</span>
        <span class="sym">∞</span>
        <span class="sym">∫</span>
      </div>`;
  }

  window.ShowMathLoader = showMathLoader;

  /* ════════════════════════════════════════════════════════════════════════
     UTILITY
  ════════════════════════════════════════════════════════════════════════ */
  function debounce (fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  /* ════════════════════════════════════════════════════════════════════════
     BOOT
  ════════════════════════════════════════════════════════════════════════ */
  function boot () {
    initPageTransitions();
    initNavbar();
    initScrollTop();
    initHeroShapes();
    initRipple();

    // Defer non-critical work slightly so page paint isn't blocked
    setTimeout(() => {
      initScrollReveal();
      initCounters();
      initTilt();
      initFormInteractions();
    }, 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
