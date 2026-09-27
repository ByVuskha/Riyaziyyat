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

window.addEventListener('storage', (event) => {
  if (event.key !== 'currentUser') return;
  try {
    const payload = event.newValue ? JSON.parse(event.newValue) : null;
    const user = payload && payload.user ? payload.user : null;
    API.setCachedUser(user);
  } catch {
    API.clearUserCache();
  }
});

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
    .hero, .section, .card, .footer, .admin-section, .stat-box {
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
function installNotificationBellStyles() {
  if (document.getElementById('header-notification-styles')) return;
  const style = document.createElement('style');
  style.id = 'header-notification-styles';
  style.textContent = `
    .header-notify-wrap { position: relative; display: inline-flex; align-items: center; }
    .header-notify-btn {
      position: relative; background: rgba(148, 163, 184, 0.12); border: 1px solid rgba(148, 163, 184, 0.2);
      color: #1f2937; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px; transition: all .2s ease; text-decoration: none;
    }
    .header-notify-btn:hover { background: rgba(99, 102, 241, 0.08); transform: translateY(-1px); }
    .header-notify-btn.has-new {
      animation: notifyBellPulse 1.8s ease-in-out infinite;
      box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35);
    }
    @keyframes notifyBellPulse {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.25); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .header-notify-badge {
      position: absolute; top: -3px; right: -2px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 99px;
      background: linear-gradient(135deg, #ef4444, #dc2626); color: white; font-size: 10px; font-weight: 800;
      display: none; align-items: center; justify-content: center; border: 2px solid #fff; line-height: 1;
      animation: badgePop .22s ease;
    }
    @keyframes badgePop {
      0% { transform: scale(0.7); }
      100% { transform: scale(1); }
    }
    .header-notify-menu {
      position: absolute; top: calc(100% + 12px); right: 0; width: min(360px, 90vw); background: rgba(255,255,255,0.98);
      backdrop-filter: blur(12px); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 18px; box-shadow: 0 18px 45px rgba(15,23,42,0.16);
      display: none; z-index: 2000; overflow: hidden;
    }
    .header-notify-menu.open { display: block; }
    .header-notify-header {
      display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #edf2f7; background: #f8fafc;
    }
    .header-notify-title { font-size: 12px; font-weight: 700; letter-spacing: .04em; color: #475569; text-transform: uppercase; }
    .header-notify-list { max-height: 320px; overflow-y: auto; }
    .header-notify-item {
      display: block; padding: 12px 14px; border-bottom: 1px solid #f1f5f9; text-decoration: none; color: inherit; background: white; transition: background .2s ease;
    }
    .header-notify-item.unread { background: #f8fafc; }
    .header-notify-item:hover { background: #f8fafc; }
    .header-notify-item strong { display: block; font-size: 13px; color: #111827; margin-bottom: 5px; }
    .header-notify-item p { margin: 0; color: #475569; font-size: 12px; line-height: 1.5; }
    .header-notify-meta { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 8px; }
    .header-notify-time { font-size: 10px; color: #94a3b8; }
    .header-notify-read { font-size: 10px; color: #10b981; font-weight: 700; }
    .header-notify-empty { padding: 26px 18px; text-align: center; color: #64748b; font-size: 12px; }
    .header-notify-footer { padding: 8px 12px; border-top: 1px solid #edf2f7; background: #f8fafc; }
    .header-notify-footer a { color: #4338ca; text-decoration: none; font-size: 12px; font-weight: 700; }
  `;
  document.head.appendChild(style);
}

function getNotificationReadKey(user) {
  if (!user) return 'guestNotificationsRead';
  return `notificationsRead:${user.id || user.email || 'anon'}`;
}

function getReadNotificationIds(user) {
  try {
    const raw = localStorage.getItem(getNotificationReadKey(user));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function setReadNotificationIds(user, ids) {
  localStorage.setItem(getNotificationReadKey(user), JSON.stringify(Array.from(new Set(ids || []))));
}

async function refreshHeaderNotifications(user) {
  const bell = document.getElementById('headerNotifBell');
  const count = document.getElementById('headerNotifCount');
  const menu = document.getElementById('headerNotifMenu');
  const list = document.getElementById('headerNotifList');
  if (!bell || !count || !menu || !list) return;

  if (!user) {
    bell.style.display = 'none';
    menu.classList.remove('open');
    return;
  }

  bell.style.display = 'inline-flex';

  try {
    const { data = [] } = await API.notifications.list();
    const readIds = getReadNotificationIds(user);
    const mapped = data.slice(0, 8).map(item => ({
      ...item,
      unread: !(Array.isArray(item.readBy) ? item.readBy.includes(String(user.id)) : false) && !readIds.includes(String(item.id)),
    }));
    const unreadCount = mapped.filter(item => item.unread).length;
    count.textContent = unreadCount > 9 ? '9+' : unreadCount;
    count.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    bell.classList.toggle('has-new', unreadCount > 0);

    if (!mapped.length) {
      list.innerHTML = '<div class="header-notify-empty">Hələ heç bir bildiriş yoxdur.</div>';
      return;
    }

    list.innerHTML = mapped.map(item => `
      <div class="header-notify-item ${item.unread ? 'unread' : ''}" data-notify-id="${item.id}">
        <strong>${item.title || 'Yeni bildiriş'}</strong>
        <p>${String(item.message || '').replace(/\n/g, '<br>')}</p>
        <div class="header-notify-meta">
          <span class="header-notify-time">${item.createdAt ? new Date(item.createdAt).toLocaleString('az-AZ') : 'İndiki vaxt'}</span>
          ${item.unread ? '<span class="header-notify-read">Oxunmayıb</span>' : '<span class="header-notify-read" style="color:#94a3b8;">Oxundu</span>'}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.header-notify-item').forEach(node => {
      const id = node.dataset.notifyId;
      node.addEventListener('click', async event => {
        if (event.target.closest('button')) return;
        const item = mapped.find(n => String(n.id) === String(id));
        if (!item || !item.unread) return;
        const nextRead = getReadNotificationIds(user);
        nextRead.push(String(id));
        setReadNotificationIds(user, nextRead);
        if (API.notifications && API.notifications.read) {
          try { await API.notifications.read(id); } catch {}
        }
        await refreshHeaderNotifications(user);
      });
    });
  } catch (error) {
    count.textContent = '0';
    count.style.display = 'none';
    list.innerHTML = '<div class="header-notify-empty">Bildirişlər yüklənmədi.</div>';
  }
}

async function markHeaderNotificationRead(user, id) {
  if (!user || !id) return;
  const readIds = getReadNotificationIds(user);
  if (!readIds.includes(String(id))) {
    readIds.push(String(id));
    setReadNotificationIds(user, readIds);
  }
  if (API.notifications && API.notifications.read) {
    try { await API.notifications.read(id); } catch {}
  }
  await refreshHeaderNotifications(user);
}

function renderSharedNavigation(user) {
  installNotificationBellStyles();
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

  let bellWrap = actions.querySelector('#headerNotifBellWrap');
  if (!bellWrap) {
    bellWrap = document.createElement('div');
    bellWrap.id = 'headerNotifBellWrap';
    bellWrap.className = 'header-notify-wrap';
    actions.insertBefore(bellWrap, actions.firstChild);
  }

  let bell = document.getElementById('headerNotifBell');
  if (!bell) {
    bell = document.createElement('button');
    bell.id = 'headerNotifBell';
    bell.type = 'button';
    bell.className = 'header-notify-btn';
    bell.setAttribute('aria-label', 'Bildirişlər');
    bell.innerHTML = '<i class="fas fa-bell"></i><span id="headerNotifCount" class="header-notify-badge">0</span>';
    bellWrap.appendChild(bell);
  }

  let notifyMenu = document.getElementById('headerNotifMenu');
  if (!notifyMenu) {
    notifyMenu = document.createElement('div');
    notifyMenu.id = 'headerNotifMenu';
    notifyMenu.className = 'header-notify-menu';
    bellWrap.appendChild(notifyMenu);
  }

  notifyMenu.innerHTML = `
    <div class="header-notify-header">
      <span class="header-notify-title">Bildirişlər</span>
      <button type="button" id="headerNotifClose" class="btn btn-sm btn-secondary" style="padding:5px 10px; font-size:11px;">Bağla</button>
    </div>
    <div id="headerNotifList" class="header-notify-list"></div>
    <div class="header-notify-footer"><a href="notifications.html">Bütün bildirişlər</a></div>
  `;

  const closeBtn = document.getElementById('headerNotifClose');
  closeBtn?.addEventListener('click', () => notifyMenu.classList.remove('open'));

  bell.onclick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    const isOpen = notifyMenu.classList.contains('open');
    notifyMenu.classList.toggle('open', !isOpen);
    bell.classList.toggle('has-new', !isOpen && Number(count.textContent.replace(/\D/g, '')) > 0);
    if (!isOpen) {
      const listItems = notifyMenu.querySelectorAll('.header-notify-item.unread');
      for (const item of listItems) {
        const id = item.dataset.notifyId;
        await markHeaderNotificationRead(user, id);
      }
    }
  };

  document.addEventListener('click', event => {
    const target = event.target;
    if (!notifyMenu.contains(target) && !bell.contains(target)) {
      notifyMenu.classList.remove('open');
    }
  });

  let adminLink = actions.querySelector('#navAdminLink');
  if (!adminLink) {
    adminLink = document.createElement('a');
    adminLink.id = 'navAdminLink';
    adminLink.href = 'admin.html';
    adminLink.className = 'btn btn-primary btn-sm nav-admin-button';
    adminLink.setAttribute('aria-label', 'Admin paneli');
    adminLink.innerHTML = '<i class="fas fa-shield-alt" aria-hidden="true"></i><span class="nav-admin-label">Admin paneli</span>';
    actions.appendChild(adminLink);
  }
  adminLink.style.display = user?.role === 'admin' ? 'inline-flex' : 'none';

  let sharedNavMenu = document.getElementById('sharedNavigation') || inner.querySelector('.navbar-menu');
  if (!sharedNavMenu) {
    sharedNavMenu = document.createElement('nav');
    sharedNavMenu.className = 'navbar-menu';
    inner.insertBefore(sharedNavMenu, actions);
  }

  let toggle = actions.querySelector('.hamburger-btn');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'hamburger-btn';
    toggle.setAttribute('aria-label', 'Naviqasiya menyusu');
    toggle.setAttribute('aria-expanded', 'false');
    actions.prepend(toggle);
  }

  if (!toggle.querySelector('.hamburger-label')) {
    toggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i><span class="hamburger-label">Menyu</span>';
  }
  toggle.setAttribute('aria-label', 'Naviqasiya menyusu');
  toggle.setAttribute('aria-expanded', toggle.getAttribute('aria-expanded') || 'false');

  const groups = [
    { title: 'Öyrənmə', links: [['Video dərslər', 'videos.html'], ['Sınaqlar', 'tests.html'], ['Müəllimlər', 'teachers.html']] },
    { title: 'Platforma', links: [['Ana səhifə', 'index.html'], ['Bildirişlər', 'notifications.html'], ['Xəbərlər', 'news.html'], ['Uğurlar', 'success.html'], ['Yardım', 'faq.html']] },
    { title: 'Hesab', links: user
      ? [['Şəxsi Kabinet', 'dashboard.html'], ['Profili düzəlt', 'profile-edit.html'], ['Ödənişlər', 'payment.html']]
      : [['Daxil ol', 'login.html'], ['Qeydiyyat', 'register.html']] },
  ];

  if (user?.role === 'admin' || user?.userType === 'teacher') {
    const links = [['Müəllim paneli', 'teacher-panel.html']];
    if (user.role === 'admin') links.unshift(['Admin paneli', 'admin.html'], ['Sınaq redaktəsi', 'test-editor.html'], ['Xəbər əlavə et', 'news-add.html'], ['Video əlavə et', 'video-upload.html']);
    groups.push({ title: 'İdarəetmə', links });
  }

  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  sharedNavMenu.setAttribute('aria-label', 'Əsas naviqasiya');
  sharedNavMenu.innerHTML = groups.map(group => `
    <section class="nav-group">
      <h3>${group.title}</h3>
      ${group.links.map(([label, href]) => `
        <a href="${href}"${href === currentPath ? ' class="active" aria-current="page"' : ''}>${label}</a>
      `).join('')}
    </section>`).join('');
  toggle.setAttribute('aria-controls', 'sharedNavigation');
  sharedNavMenu.id = 'sharedNavigation';
  if (sharedNavMenu.parentElement !== document.body) document.body.appendChild(sharedNavMenu);

  if (!toggle.dataset.sharedNavReady) {
    toggle.dataset.sharedNavReady = 'true';
    toggle.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      const isOpen = sharedNavMenu.classList.toggle('open');
      sharedNavMenu.style.display = isOpen ? 'flex' : 'none';
      sharedNavMenu.style.visibility = isOpen ? 'visible' : 'hidden';
      sharedNavMenu.style.opacity = isOpen ? '1' : '0';
      sharedNavMenu.style.pointerEvents = isOpen ? 'auto' : 'none';
      sharedNavMenu.style.transform = isOpen ? 'translateX(0)' : 'translateX(-120%)';

      toggle.setAttribute('aria-expanded', String(isOpen));
      const icon = toggle.querySelector('i');
      if (icon) icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
    });
    sharedNavMenu.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link) return;
      sharedNavMenu.classList.remove('open');
      sharedNavMenu.style.display = 'none';
      sharedNavMenu.style.visibility = 'hidden';
      sharedNavMenu.style.opacity = '0';
      sharedNavMenu.style.pointerEvents = 'none';
      sharedNavMenu.style.transform = 'translateX(-120%)';
      toggle.setAttribute('aria-expanded', 'false');
      const icon = toggle.querySelector('i');
      if (icon) icon.className = 'fas fa-bars';
      window.location.href = link.href;
    });
  }

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
    await refreshHeaderNotifications(user);
  } else {
    if (guestEl) guestEl.style.display = 'flex';
    if (userEl)  userEl.style.display  = 'none';
    const bell = document.getElementById('headerNotifBell');
    const count = document.getElementById('headerNotifCount');
    if (bell) bell.style.display = 'none';
    if (count) count.style.display = 'none';
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
