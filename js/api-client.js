/**
 * api-client.js  —  Centralized fetch wrapper for all /api/* endpoints.
 * Replaces all direct Storage.get/set calls for shared data.
 * localStorage is now only used for UI preferences (dark mode, language).
 */

const API = (() => {
  const API_BASE_URL = '/api';

  function readLocalList(key, fallback = []) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function writeLocalList(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function getCurrentLocalUser() {
    try {
      const saved = JSON.parse(localStorage.getItem('currentUser') || '{"user":null}');
      return saved && saved.user ? saved.user : null;
    } catch {
      return null;
    }
  }

  function setCurrentLocalUser(user) {
    localStorage.setItem('currentUser', JSON.stringify({ user }));
  }

  function ensureDemoData() {
    if (!localStorage.getItem('localUsers')) {
      writeLocalList('localUsers', [{
        id: 'admin-demo',
        name: 'Admin',
        email: 'admin@riyaziyyat.az',
        password: 'admin123',
        role: 'admin',
        userType: 'teacher',
        premium: true,
        balance: 150,
        points: 2500,
        registeredAt: new Date().toISOString()
      }]);
    }
    if (!localStorage.getItem('localTests')) {
      writeLocalList('localTests', [
        { id: 't-1', title: 'Cəbr Əsasları', category: 'Cəbr', questionCount: 10, duration: 20, isPremium: false, difficulty: 'Asan', emoji: '📐', createdAt: new Date().toISOString() },
        { id: 't-2', title: 'Həndəsə Praktikası', category: 'Həndəsə', questionCount: 12, duration: 25, isPremium: true, difficulty: 'Orta', emoji: '📏', createdAt: new Date().toISOString() }
      ]);
    }
    if (!localStorage.getItem('localNews')) {
      writeLocalList('localNews', [
        { id: 'n-1', title: 'Yeni riyaziyyat dərsləri', author: 'Admin', emoji: '✨', views: 120, createdAt: new Date().toISOString() },
        { id: 'n-2', title: 'Yazılışlara hazırlıq', author: 'Komanda', emoji: '🧠', views: 96, createdAt: new Date().toISOString() }
      ]);
    }
    if (!localStorage.getItem('localTeachers')) {
      writeLocalList('localTeachers', [
        { id: 'teacher-1', name: 'Nərmin Həsənova', subject: 'Cəbr', status: 'approved' },
        { id: 'teacher-2', name: 'Rəşad Əhmədov', subject: 'Həndəsə', status: 'approved' }
      ]);
    }
    if (!localStorage.getItem('localTeacherTests')) writeLocalList('localTeacherTests', []);
    if (!localStorage.getItem('localPremium')) writeLocalList('localPremium', []);
    if (!localStorage.getItem('localPayments')) writeLocalList('localPayments', []);
    if (!localStorage.getItem('currentUser')) setCurrentLocalUser(null);
  }

  function localFallback(method, path, body) {
    ensureDemoData();
    const clean = path.replace(/^\//, '').split('?')[0];
    const [segment, second] = clean.split('/');

    if (segment === 'auth') {
      if (second === 'me') return { user: getCurrentLocalUser() };
      if (second === 'login') {
        const users = readLocalList('localUsers');
        const { email, password } = body || {};
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) throw new Error('E-poçt və ya şifrə yanlışdır');
        setCurrentLocalUser({ ...user, password: undefined });
        return { user: { ...user, password: undefined } };
      }
      if (second === 'register') {
        const users = readLocalList('localUsers');
        const payload = body || {};
        if (users.some(u => u.email === payload.email)) throw new Error('Bu e-poçt artıq qeydiyyatdan keçib');
        const user = {
          id: `user-${Date.now()}`,
          name: payload.name || 'Yeni İstifadəçi',
          email: payload.email,
          password: payload.password,
          role: 'user',
          userType: payload.userType || 'student',
          premium: false,
          balance: 0,
          points: 0,
          registeredAt: new Date().toISOString()
        };
        users.push(user);
        writeLocalList('localUsers', users);
        setCurrentLocalUser({ ...user, password: undefined });
        return { user: { ...user, password: undefined } };
      }
      if (second === 'logout') {
        setCurrentLocalUser(null);
        return { success: true };
      }
    }

    if (segment === 'tests') {
      const items = readLocalList('localTests');
      if (method === 'GET') {
        if (second) {
          const item = items.find(t => t.id === second);
          return { data: item || null, test: item || null };
        }
        return { data: items };
      }
      if (method === 'POST') {
        const item = { id: `t-${Date.now()}`, ...body, createdAt: new Date().toISOString() };
        items.unshift(item);
        writeLocalList('localTests', items);
        return { data: item, test: item };
      }
      if (method === 'PUT') {
        const item = items.find(t => t.id === second);
        Object.assign(item || {}, body || {});
        writeLocalList('localTests', items);
        return { data: item || null, test: item || null };
      }
      if (method === 'DELETE') {
        const filtered = items.filter(t => t.id !== second);
        writeLocalList('localTests', filtered);
        return { success: true };
      }
    }

    if (segment === 'news') {
      const items = readLocalList('localNews');
      if (method === 'GET') {
        if (second) {
          const item = items.find(n => n.id === second);
          return { data: item || null, news: item || null };
        }
        return { data: items };
      }
      if (method === 'POST') {
        const item = { id: `n-${Date.now()}`, ...body, createdAt: new Date().toISOString(), views: 0 };
        items.unshift(item);
        writeLocalList('localNews', items);
        return { data: item, news: item };
      }
      if (method === 'PUT') {
        const item = items.find(n => n.id === second);
        Object.assign(item || {}, body || {});
        writeLocalList('localNews', items);
        return { data: item || null, news: item || null };
      }
      if (method === 'DELETE') {
        const filtered = items.filter(n => n.id !== second);
        writeLocalList('localNews', filtered);
        return { success: true };
      }
    }

    if (segment === 'users') {
      const items = readLocalList('localUsers');
      if (method === 'GET') {
        if (second) {
          const item = items.find(u => u.id === second);
          return { data: item || null, user: item || null };
        }
        return { data: items };
      }
      if (method === 'PUT') {
        const item = items.find(u => u.id === second);
        Object.assign(item || {}, body || {});
        writeLocalList('localUsers', items);
        return { data: item || null, user: item || null };
      }
      if (method === 'DELETE') {
        const filtered = items.filter(u => u.id !== second);
        writeLocalList('localUsers', filtered);
        return { success: true };
      }
    }

    if (segment === 'teacher-tests') {
      const items = readLocalList('localTeacherTests');
      if (method === 'GET') return { data: items };
      if (method === 'POST') {
        const item = { id: `tt-${Date.now()}`, ...body, createdAt: new Date().toISOString(), status: 'pending' };
        items.unshift(item);
        writeLocalList('localTeacherTests', items);
        return { data: item };
      }
      if (method === 'PUT') {
        const item = items.find(t => t.id === body.id);
        if (!item) return { data: null };
        item.status = body.action === 'approve' ? 'approved' : 'rejected';
        if (body.adminNote) item.adminNote = body.adminNote;
        writeLocalList('localTeacherTests', items);
        return { data: item };
      }
    }

    if (segment === 'premium') {
      const items = readLocalList('localPremium');
      if (method === 'GET') return { data: items };
      if (method === 'POST') {
        const item = { id: `premium-${Date.now()}`, ...body, requestedAt: new Date().toISOString(), status: 'pending' };
        items.unshift(item);
        writeLocalList('localPremium', items);
        return { data: item };
      }
      if (method === 'PUT') {
        const item = items.find(t => t.id === body.id);
        if (!item) return { data: null };
        item.status = body.action === 'approve' ? 'approved' : 'rejected';
        writeLocalList('localPremium', items);
        return { data: item };
      }
    }

    if (segment === 'payments') {
      const items = readLocalList('localPayments');
      if (method === 'GET') return { data: items };
      if (method === 'POST') {
        const item = { id: `pay-${Date.now()}`, ...body, createdAt: new Date().toISOString() };
        items.unshift(item);
        writeLocalList('localPayments', items);
        return { data: item };
      }
    }

    if (segment === 'stats') {
      const users = readLocalList('localUsers');
      const tests = readLocalList('localTests');
      const news = readLocalList('localNews');
      const teachers = readLocalList('localTeachers');
      return {
        users: users.length,
        tests: tests.length,
        news: news.length,
        teachers: teachers.length,
        premium: users.filter(u => u.premium).length,
      };
    }

    return { data: [] };
  }

  function buildRequestPath(path) {
    if (!path) return '/';
    return path.startsWith('/api') ? path : `${API_BASE_URL}${path}`;
  }

  async function req(method, path, body) {
    const opts = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    try {
      const requestPath = buildRequestPath(path);
      const r = await fetch(requestPath, opts);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(data.error || 'Xəta baş verdi'), { status: r.status, data });
      return data;
    } catch (error) {
      const localData = localFallback(method, path, body && typeof body === 'string' ? JSON.parse(body) : body);
      if (localData) return localData;
      throw error;
    }
  }

  const auth = {
    async me() { return req('GET', '/api/auth/me'); },
    async login(email, password) { return req('POST', '/api/auth/login', { email, password }); },
    async register(name, email, password, userType) {
      return req('POST', '/api/auth/register', { name, email, password, userType });
    },
    async logout() { return req('POST', '/api/auth/logout'); },
  };

  const tests = {
    async list(params = {}) { return req('GET', '/api/tests?' + new URLSearchParams(params)); },
    async get(id) { return req('GET', `/api/tests/${id}`); },
    async create(data) { return req('POST', '/api/tests', data); },
    async update(id, data) { return req('PUT', `/api/tests/${id}`, data); },
    async remove(id) { return req('DELETE', `/api/tests/${id}`); },
  };

  const news = {
    async list(params = {}) { return req('GET', '/api/news?' + new URLSearchParams(params)); },
    async get(id) { return req('GET', `/api/news/${id}`); },
    async create(data) { return req('POST', '/api/news', data); },
    async update(id, data) { return req('PUT', `/api/news/${id}`, data); },
    async remove(id) { return req('DELETE', `/api/news/${id}`); },
    async view(id) { return req('POST', `/api/news/${id}?action=view`); },
  };

  const users = {
    async list(params = {}) { return req('GET', '/api/users?' + new URLSearchParams(params)); },
    async get(id) { return req('GET', `/api/users/${id}`); },
    async update(id, data) { return req('PUT', `/api/users/${id}`, data); },
    async remove(id) { return req('DELETE', `/api/users/${id}`); },
  };

  const teacherTests = {
    async list(params = {}) { return req('GET', '/api/teacher-tests?' + new URLSearchParams(params)); },
    async submit(data) { return req('POST', '/api/teacher-tests', data); },
    async approve(id) { return req('PUT', '/api/teacher-tests', { id, action: 'approve' }); },
    async reject(id, adminNote) { return req('PUT', '/api/teacher-tests', { id, action: 'reject', adminNote }); },
  };

  const premium = {
    async list() { return req('GET', '/api/premium'); },
    async request(packageType) { return req('POST', '/api/premium', { packageType }); },
    async approve(id) { return req('PUT', '/api/premium', { id, action: 'approve' }); },
    async reject(id) { return req('PUT', '/api/premium', { id, action: 'reject' }); },
  };

  const stats = {
    async get() { return req('GET', '/api/stats'); },
  };

  const payments = {
    async list(params = {}) { return req('GET', '/api/payments?' + new URLSearchParams(params)); },
    async record(amount, method, plan) { return req('POST', '/api/payments', { amount, method, plan }); },
  };

  let _currentUser = null;

  async function getCurrentUser() {
    if (_currentUser) return _currentUser;
    try {
      const { user } = await auth.me();
      _currentUser = user || null;
      return user || null;
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
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = '/index.html';
  }

  function notify(msg, type = 'info') {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
      console.log(`[${type}] ${msg}`);
    }
  }

  return { auth, tests, news, users, teacherTests, premium, stats, payments, getCurrentUser, clearUserCache, logout, notify };
})();

window.API = API;
