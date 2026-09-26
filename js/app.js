/**
 * app.js — Shared utilities loaded on every page.
 * Provides: auth guard helpers, dark-mode, toast wrappers,
 * page-load spinner, and common event wiring.
 *
 * Load order (every page):
 *   1. css/main.css
 *   2. FontAwesome CDN
 *   3. js/notifications.js   (toast + confirm + prompt UI)
 *   4. js/api-client.js      (API.* fetch wrappers)
 *   5. js/app.js             ← this file
 *   6. page-specific inline script
 */

// ════════════════════════════════════════════════════════
//  Dark Mode
// ════════════════════════════════════════════════════════
(function initDarkMode() {
  const saved = localStorage.getItem('darkMode');
  if (saved === 'true') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
})();

(function initStorageHelper() {
  if (!window.Storage) {
    window.Storage = {
      get(key) {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      },
      set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        return value;
      },
      remove(key) {
        localStorage.removeItem(key);
      }
    };
  }
})();

(function initMathBackground() {
  if (document.getElementById('math-theme-styles')) return;
  const style = document.createElement('style');
  style.id = 'math-theme-styles';
  style.textContent = `
    :root {
      --math-bg-1: rgba(76, 110, 245, 0.12);
      --math-bg-2: rgba(141, 92, 255, 0.10);
      --math-bg-3: rgba(45, 212, 191, 0.10);
    }
    body {
      background:
        radial-gradient(circle at top left, var(--math-bg-1), transparent 28%),
        radial-gradient(circle at bottom right, var(--math-bg-2), transparent 26%),
        linear-gradient(135deg, #f7f9ff 0%, #edf4ff 48%, #f9fafb 100%);
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background-image:
        linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px),
        radial-gradient(circle at center, rgba(15,118,110,0.14) 0, transparent 35%);
      background-size: 36px 36px, 36px 36px, 100% 100%;
      pointer-events: none;
      z-index: 0;
    }
    .navbar, .hero, .section, .card, .footer, .admin-section, .stat-box {
      position: relative;
      z-index: 1;
    }
    .logo-mark {
      box-shadow: 0 10px 24px rgba(99, 102, 241, 0.2);
    }
  `;
  document.head.appendChild(style);
})();

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('darkMode', 'false');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('darkMode', 'true');
  }
  // Update toggle button icon if present
  document.querySelectorAll('.dark-mode-toggle i').forEach(i => {
    i.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
  });
}

// ════════════════════════════════════════════════════════
//  Page Auth Guards  (call at top of page-specific script)
// ════════════════════════════════════════════════════════

/** Redirect to login if not authenticated */
async function requireLogin(redirectBack = true) {
  const user = await API.getCurrentUser();
  if (!user) {
    const dest = redirectBack
      ? 'login.html?redirect=' + encodeURIComponent(window.location.pathname)
      : 'login.html';
    window.location.replace(dest);
    return null;
  }
  return user;
}

/** Redirect to index if not admin */
async function requireAdminPage() {
  const user = await API.getCurrentUser();
  if (!user) { window.location.replace('login.html'); return null; }
  if (user.role !== 'admin') { window.location.replace('index.html'); return null; }
  return user;
}

/** Redirect to dashboard if already logged in (use on login/register pages) */
async function redirectIfLoggedIn(dest = 'dashboard.html') {
  const user = await API.getCurrentUser();
  if (user) window.location.replace(dest);
}

// ════════════════════════════════════════════════════════
//  Navbar dynamic update
// ════════════════════════════════════════════════════════
async function updateNavbar() {
  const user = await API.getCurrentUser();

  const guestEl  = document.getElementById('guestButtons');
  const userEl   = document.getElementById('userButtons');
  const nameEl   = document.getElementById('navUserName');
  const balEl    = document.getElementById('navBalance');
  const adminLnk = document.getElementById('navAdminLink');
  const avatarEl = document.getElementById('navAvatar');

  if (user) {
    if (guestEl)  guestEl.style.display  = 'none';
    if (userEl)   userEl.style.display   = 'flex';
    if (nameEl)   nameEl.textContent     = user.name.split(' ')[0];
    if (balEl)    balEl.textContent      = (user.balance || 0) + ' ₼';
    if (avatarEl) avatarEl.textContent   = user.name[0].toUpperCase();
    if (adminLnk) adminLnk.style.display = user.role === 'admin' ? 'flex' : 'none';
    if (user.premium) {
      const badge = document.getElementById('premiumBadge');
      if (badge) badge.style.display = 'inline-flex';
    }
  } else {
    if (guestEl) guestEl.style.display = 'flex';
    if (userEl)  userEl.style.display  = 'none';
  }
}

// ════════════════════════════════════════════════════════
//  Logout
// ════════════════════════════════════════════════════════
function logout() {
  API.logout(); // handles redirect to index.html
}

// ════════════════════════════════════════════════════════
//  Loading spinner
// ════════════════════════════════════════════════════════
function showSpinner(container) {
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center;padding:50px 20px;color:#9ca3af;">
      <i class="fas fa-circle-notch fa-spin" style="font-size:32px;margin-bottom:12px;display:block;"></i>
      Yüklənir...
    </div>`;
}

function showEmpty(container, msg = 'Məlumat yoxdur') {
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center;padding:60px 20px;color:#9ca3af;">
      <i class="fas fa-inbox" style="font-size:48px;opacity:.3;display:block;margin-bottom:14px;"></i>
      <p>${msg}</p>
    </div>`;
}

function showError(container, msg = 'Xəta baş verdi') {
  if (!container) return;
  container.innerHTML = `
    <div style="text-align:center;padding:60px 20px;color:#ef4444;">
      <i class="fas fa-exclamation-triangle" style="font-size:48px;opacity:.5;display:block;margin-bottom:14px;"></i>
      <p>${msg}</p>
    </div>`;
}

// ════════════════════════════════════════════════════════
//  Format helpers
// ════════════════════════════════════════════════════════
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isPremiumActive(user) {
  if (!user || !user.premium) return false;
  if (!user.premiumExpiresAt)  return true;
  return new Date(user.premiumExpiresAt) > new Date();
}

// ════════════════════════════════════════════════════════
//  Auto-init on DOMContentLoaded
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();

  // Active nav link highlighting
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-menu a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // Wire dark-mode toggles
  document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
    btn.addEventListener('click', toggleDarkMode);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const icon   = btn.querySelector('i');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  });

  // Wire hamburger menu
  const hamburger = document.querySelector('.hamburger-btn');
  const navMenu   = document.querySelector('.navbar-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const icon = hamburger.querySelector('i');
      if (icon) icon.className = navMenu.classList.contains('open') ? 'fas fa-times' : 'fas fa-bars';
    });
    // Close menu when a link is clicked
    navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navMenu.classList.remove('open');
      const icon = hamburger.querySelector('i');
      if (icon) icon.className = 'fas fa-bars';
    }));
  }
});
