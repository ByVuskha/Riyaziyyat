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

(function initMathBackground() {
  if (document.getElementById('math-theme-styles')) return;
  const style = document.createElement('style');
  style.id = 'math-theme-styles';
  style.textContent = `
    :root {
      --math-bg-1: #eff8f6;
      --math-bg-2: #f7faf6;
    }
    body {
      background: linear-gradient(135deg, var(--math-bg-1), var(--math-bg-2) 58%, #f8faf9);
      background-attachment: fixed;
    }
    .navbar, .hero, .section, .card, .footer, .admin-section, .stat-box {
      position: relative;
      z-index: 1;
    }
    #mathCanvas { opacity: .72; }
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

function getCurrentUser() {
  return API.getCachedUser();
}

function isLoggedIn() {
  return Boolean(getCurrentUser());
}

async function updateUser(updates) {
  const user = await API.getCurrentUser();
  if (!user) throw new Error('Giriş tələb olunur');
  const updated = await API.users.update(user.id, updates);
  return API.setCachedUser(updated.user || updated);
}

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
function renderSharedNavigation(user) {
  let inner = document.querySelector('.navbar-inner');
  if (!inner) {
    const adminHeader = document.querySelector('.admin-header');
    const standaloneHost = adminHeader || document.querySelector('.auth-page, .error-container');
    if (!standaloneHost) return;
    inner = document.querySelector('.standalone-shared-nav') || standaloneHost.querySelector('.standalone-shared-nav');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'standalone-shared-nav';
      if (adminHeader) adminHeader.appendChild(inner);
      else document.body.prepend(inner);
    }
  }

  let actions = inner.querySelector('.navbar-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'navbar-actions';
    inner.appendChild(actions);
  }

  let menu = inner.querySelector('.navbar-menu');
  if (!menu) {
    menu = document.createElement('nav');
    menu.className = 'navbar-menu';
    inner.insertBefore(menu, actions);
  }

  let toggle = actions.querySelector('.hamburger-btn');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'hamburger-btn';
    toggle.setAttribute('aria-label', 'Naviqasiya menyusu');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
    actions.prepend(toggle);
  }

  const groups = [
    { title: 'Öyrənmə', links: [['Video dərslər', 'videos.html'], ['Sınaqlar', 'tests.html'], ['Müəllimlər', 'teachers.html']] },
    { title: 'Platforma', links: [['Ana səhifə', 'index.html'], ['Xəbərlər', 'news.html'], ['Uğurlar', 'success.html'], ['Yardım', 'faq.html']] },
    { title: 'Hesab', links: user
      ? [['Kabinet', 'dashboard.html'], ['Profili düzəlt', 'profile-edit.html'], ['Ödənişlər', 'payment.html']]
      : [['Daxil ol', 'login.html'], ['Qeydiyyat', 'register.html']] },
  ];

  if (user?.role === 'admin' || user?.userType === 'teacher') {
    const links = [['Müəllim paneli', 'teacher-panel.html']];
    if (user.role === 'admin') links.unshift(['Admin paneli', 'admin.html'], ['Sınaq redaktəsi', 'test-editor.html'], ['Xəbər əlavə et', 'news-add.html'], ['Video əlavə et', 'video-upload.html']);
    groups.push({ title: 'İdarəetmə', links });
  }

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  menu.setAttribute('aria-label', 'Əsas naviqasiya');
  menu.innerHTML = groups.map(group => `
    <section class="nav-group">
      <h3>${group.title}</h3>
      ${group.links.map(([label, href]) => `
        <a href="${href}"${href === currentPath ? ' class="active" aria-current="page"' : ''}>${label}</a>
      `).join('')}
    </section>`).join('');
  toggle.setAttribute('aria-controls', 'sharedNavigation');
  menu.id = 'sharedNavigation';

  if (!toggle.dataset.sharedNavReady) {
    toggle.dataset.sharedNavReady = 'true';
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      const icon = toggle.querySelector('i');
      if (icon) icon.className = open ? 'fas fa-times' : 'fas fa-bars';
    });
    menu.addEventListener('click', event => {
      if (!event.target.closest('a')) return;
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      const icon = toggle.querySelector('i');
      if (icon) icon.className = 'fas fa-bars';
    });
  }

  if (!document.documentElement.dataset.sharedNavDismissReady) {
    document.documentElement.dataset.sharedNavDismissReady = 'true';
    document.addEventListener('click', event => {
      const openMenu = document.getElementById('sharedNavigation');
      const button = document.querySelector('.hamburger-btn');
      if (!openMenu || openMenu.contains(event.target) || button?.contains(event.target)) return;
      openMenu.classList.remove('open');
      button?.setAttribute('aria-expanded', 'false');
      const icon = button?.querySelector('i');
      if (icon) icon.className = 'fas fa-bars';
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const openMenu = document.getElementById('sharedNavigation');
      const button = document.querySelector('.hamburger-btn');
      openMenu?.classList.remove('open');
      button?.setAttribute('aria-expanded', 'false');
      const icon = button?.querySelector('i');
      if (icon) icon.className = 'fas fa-bars';
    });
  }
}

let dailyLoginRequested = false;

async function updateNavbar() {
  const user = await API.getCurrentUser();
  renderSharedNavigation(user);
  if (user && user.role !== 'admin' && !dailyLoginRequested && API.points) {
    dailyLoginRequested = true;
    API.points.awardDailyLogin()
      .then(result => {
        if (result.earnedPoints) {
          window.dispatchEvent(new CustomEvent('points:updated', { detail: { userId: user.id } }));
        }
      })
      .catch(() => {});
  }

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
  renderSharedNavigation(API.getCachedUser());
  updateNavbar();

  // Wire dark-mode toggles
  document.querySelectorAll('.dark-mode-toggle').forEach(btn => {
    btn.addEventListener('click', toggleDarkMode);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const icon   = btn.querySelector('i');
    if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  });

});
