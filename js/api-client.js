/**
 * api-client.js  —  Centralized fetch wrapper for all /api/* endpoints.
 * Replaces all direct Storage.get/set calls for shared data.
 * localStorage is now only used for UI preferences (dark mode, language).
 */

const API = (() => {
  // ── Core fetch ────────────────────────────────────────────────────────────
  async function req(method, path, body) {
    const opts = {
      method,
      credentials: 'include',                          // send httpOnly cookie
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(path, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || 'Xəta baş verdi'), { status: r.status, data });
    return data;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const auth = {
    /** Returns { user } or throws */
    async me()                    { return req('GET',  '/api/auth/me'); },
    async login(email, password)  { return req('POST', '/api/auth/login',    { email, password }); },
    async register(name, email, password, userType) {
      return req('POST', '/api/auth/register', { name, email, password, userType });
    },
    async logout()                { return req('POST', '/api/auth/logout'); },
  };

  // ── Tests ─────────────────────────────────────────────────────────────────
  const tests = {
    async list(params = {})     { return req('GET', '/api/tests?' + new URLSearchParams(params)); },
    async get(id)               { return req('GET', `/api/tests/${id}`); },
    async create(data)          { return req('POST', '/api/tests', data); },
    async update(id, data)      { return req('PUT',  `/api/tests/${id}`, data); },
    async remove(id)            { return req('DELETE', `/api/tests/${id}`); },
  };

  // ── News ──────────────────────────────────────────────────────────────────
  const news = {
    async list(params = {})     { return req('GET', '/api/news?' + new URLSearchParams(params)); },
    async get(id)               { return req('GET', `/api/news/${id}`); },
    async create(data)          { return req('POST', '/api/news', data); },
    async update(id, data)      { return req('PUT',  `/api/news/${id}`, data); },
    async remove(id)            { return req('DELETE', `/api/news/${id}`); },
    async view(id)              { return req('POST', `/api/news/${id}?action=view`); },
  };

  // ── Users ─────────────────────────────────────────────────────────────────
  const users = {
    async list(params = {})     { return req('GET', '/api/users?' + new URLSearchParams(params)); },
    async get(id)               { return req('GET', `/api/users/${id}`); },
    async update(id, data)      { return req('PUT',  `/api/users/${id}`, data); },
    async remove(id)            { return req('DELETE', `/api/users/${id}`); },
  };

  // ── Teacher Tests ─────────────────────────────────────────────────────────
  const teacherTests = {
    async list(params = {})     { return req('GET', '/api/teacher-tests?' + new URLSearchParams(params)); },
    async submit(data)          { return req('POST', '/api/teacher-tests', data); },
    async approve(id)           { return req('PUT', '/api/teacher-tests', { id, action: 'approve' }); },
    async reject(id, adminNote) { return req('PUT', '/api/teacher-tests', { id, action: 'reject', adminNote }); },
  };

  // ── Premium ───────────────────────────────────────────────────────────────
  const premium = {
    async list()                    { return req('GET', '/api/premium'); },
    async request(packageType)      { return req('POST', '/api/premium', { packageType }); },
    async approve(id)               { return req('PUT',  '/api/premium', { id, action: 'approve' }); },
    async reject(id)                { return req('PUT',  '/api/premium', { id, action: 'reject' }); },
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    async get()                 { return req('GET', '/api/stats'); },
  };

  // ── Payments ──────────────────────────────────────────────────────────────
  const payments = {
    async list(params = {})     { return req('GET', '/api/payments?' + new URLSearchParams(params)); },
    async record(amount, method, plan) {
      return req('POST', '/api/payments', { amount, method, plan });
    },
  };

  // ── Session cache (in-memory, cleared on page reload) ─────────────────────
  let _currentUser = null;

  async function getCurrentUser() {
    if (_currentUser) return _currentUser;
    try {
      const { user } = await auth.me();
      _currentUser = user;
      return user;
    } catch {
      _currentUser = null;
      return null;
    }
  }

  function clearUserCache() {
    _currentUser = null;
  }

  async function logout() {
    try { await auth.logout(); } catch {}
    clearUserCache();
    window.location.href = '/index.html';
  }

  // ── Notification helper (uses notifications.js if available) ───────────────
  function notify(msg, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
      console.log(`[${type}] ${msg}`);
    }
  }

  return {
    auth, tests, news, users, teacherTests, premium, stats, payments,
    getCurrentUser, clearUserCache, logout, notify,
  };
})();

// Make globally available
window.API = API;
