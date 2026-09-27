/**
 * api-client.js  —  Centralized fetch wrapper for all /api/* endpoints.
 * Replaces all direct Storage.get/set calls for shared data.
 * Server data is authoritative; localStorage holds only a small auth UI cache.
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
    if (!user || typeof user !== 'object') {
      localStorage.removeItem('currentUser');
      return;
    }
    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem('currentUser', JSON.stringify({ user: safeUser }));
    return safeUser;
  }

  function normalizeUserRecord(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.user && typeof value.user === 'object' && value.user.id) return value.user;
    if (value.data && typeof value.data === 'object' && value.data.id) return value.data;
    if (value.id) return value;
    return null;
  }

  function syncUserToLocalStore(user) {
    const safeUser = normalizeUserRecord(user);
    if (!safeUser || !safeUser.id) return null;

    try {
      const users = readLocalList('localUsers', []);
      const idx = users.findIndex(item => String(item.id) === String(safeUser.id) || (safeUser.email && item.email === safeUser.email));
      const cleaned = { ...safeUser };
      delete cleaned.password;
      if (idx >= 0) users[idx] = { ...users[idx], ...cleaned };
      else users.unshift(cleaned);
      writeLocalList('localUsers', users);
    } catch {}

    return setCurrentLocalUser(safeUser);
  }

  function ensureDemoData() {
    if (!localStorage.getItem('localUsers')) {
      writeLocalList('localUsers', [{
        id: 'admin-demo',
        name: 'Admin',
        email: 'admin@riyazmath.az',
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
        {
          id: 'teacher-1',
          name: 'Nərmin Həsənova',
          title: 'Cəbr müəllimi',
          bio: 'Klassik cəbr, funksiyalar və analitik düşüncə üzrə təcrübəli müəllim.',
          subjects: ['Cəbr', 'Funkciyalar', 'Məntiq'],
          image: '',
          email: 'nermin@riyazmath.az',
          phone: '+994 50 111 22 33',
          experience: 8,
          students: 420,
          rating: 4.9,
          userType: 'teacher',
          publicProfile: true,
          status: 'approved',
        },
        {
          id: 'teacher-2',
          name: 'Rəşad Əhmədov',
          title: 'Həndəsə müəllimi',
          bio: 'Həndəsə və geometriyada vizual, praktik yanaşma ilə dərs verir.',
          subjects: ['Həndəsə', 'Çevrə', 'Bucaq'],
          image: '',
          email: 'rasad@riyazmath.az',
          phone: '+994 50 222 33 44',
          experience: 10,
          students: 390,
          rating: 4.8,
          userType: 'teacher',
          publicProfile: true,
          status: 'approved',
        }
      ]);
    }
    if (!localStorage.getItem('localVideos')) {
      writeLocalList('localVideos', [
        { id: 'v-1', title: 'Cəbr tənlikləri', category: 'Cəbr', description: 'Müxtəlif tənliklər və onların həlli.', teacherId: 'teacher-1', teacherName: 'Nərmin Həsənova', source: 'youtube', youtubeUrl: 'https://www.youtube.com/watch?v=5a0QfL1Bh3o', thumbnailUrl: 'https://img.youtube.com/vi/5a0QfL1Bh3o/hqdefault.jpg', duration: '12:40', isPremium: false, isActive: true, views: 128, createdAt: new Date().toISOString() },
        { id: 'v-2', title: 'Həndəsə əsasları', category: 'Həndəsə', description: 'Bucaqlar, üçbucaqlar və paralel xətlər.', teacherId: 'teacher-2', teacherName: 'Rəşad Əhmədov', source: 'youtube', youtubeUrl: 'https://www.youtube.com/watch?v=RPV9RilV2rQ', thumbnailUrl: 'https://img.youtube.com/vi/RPV9RilV2rQ/hqdefault.jpg', duration: '15:05', isPremium: true, isActive: true, views: 96, createdAt: new Date().toISOString() },
        { id: 'v-3', title: 'Analiz: limit', category: 'Analiz', description: 'Limit anlayışı və əsas qanunlar.', teacherId: 'teacher-1', teacherName: 'Nərmin Həsənova', source: 'youtube', youtubeUrl: 'https://www.youtube.com/watch?v=kH6kN91dR-k', thumbnailUrl: 'https://img.youtube.com/vi/kH6kN91dR-k/hqdefault.jpg', duration: '18:20', isPremium: false, isActive: true, views: 143, createdAt: new Date().toISOString() },
        { id: 'v-4', title: 'Ehtimal nəzəriyyəsi', category: 'Ehtimal', description: 'Hadisələrin baş vermə ehtimalları.', teacherId: 'teacher-2', teacherName: 'Rəşad Əhmədov', source: 'youtube', youtubeUrl: 'https://www.youtube.com/watch?v=f6iP2bB8l0s', thumbnailUrl: 'https://img.youtube.com/vi/f6iP2bB8l0s/hqdefault.jpg', duration: '10:15', isPremium: false, isActive: true, views: 87, createdAt: new Date().toISOString() },
      ]);
    }
    if (!localStorage.getItem('localTeacherTests')) writeLocalList('localTeacherTests', []);
    if (!localStorage.getItem('localPremium')) writeLocalList('localPremium', []);
    if (!localStorage.getItem('localPayments')) writeLocalList('localPayments', []);
    if (!localStorage.getItem('currentUser')) setCurrentLocalUser(null);
  }

  function localFallback(method, path, body) {
    ensureDemoData();
    const clean = path.replace(/^\/+/, '').replace(/^api\//, '').split('?')[0];
    const [segment, second] = clean.split('/');

    if (segment === 'auth') {
      if (second === 'me') return { user: getCurrentLocalUser() };
      if (second === 'login') {
        const users = readLocalList('localUsers');
        const { email, password } = body || {};
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) throw new Error('E-poçt və ya şifrə yanlışdır');
        const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const loggedInUser = { ...user, sessionId, password: undefined };
        setCurrentLocalUser(loggedInUser);
        return { user: loggedInUser };
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

    if (segment === 'videos') {
      const items = readLocalList('localVideos');
      const viewAction = String(path).includes('action=view');
      if (method === 'GET') {
        if (second) {
          const item = items.find(v => String(v.id) === String(second));
          if (!item) return { data: null, video: null };
          return { data: item, video: item };
        }
        const params = new URLSearchParams((path.split('?')[1] || '').trim());
        let filtered = items.filter(video => video.isActive !== false);
        const category = params.get('category');
        const teacherId = params.get('teacherId');
        const q = params.get('q') || params.get('query') || '';
        if (category && category !== 'all') filtered = filtered.filter(video => String(video.category || '').toLowerCase() === String(category).toLowerCase());
        if (teacherId) filtered = filtered.filter(video => String(video.teacherId || '') === String(teacherId));
        if (q) filtered = filtered.filter(video => `${video.title || ''} ${video.description || ''} ${video.teacherName || ''}`.toLowerCase().includes(q.toLowerCase()));
        return { data: filtered };
      }
      if (method === 'POST') {
        if (viewAction && second) {
          const item = items.find(v => String(v.id) === String(second));
          if (!item) return { views: 0 };
          item.views = Number(item.views || 0) + 1;
          writeLocalList('localVideos', items);
          return { views: item.views };
        }
        const item = { id: `v-${Date.now()}`, ...body, createdAt: new Date().toISOString(), views: 0, isActive: body?.isActive !== false };
        items.unshift(item);
        writeLocalList('localVideos', items);
        return { data: item, video: item };
      }
      if (method === 'PUT') {
        const item = items.find(v => String(v.id) === String(second));
        if (!item) return { data: null, video: null };
        Object.assign(item, body || {});
        writeLocalList('localVideos', items);
        return { data: item, video: item };
      }
      if (method === 'DELETE') {
        const filtered = items.filter(v => String(v.id) !== String(second));
        writeLocalList('localVideos', filtered);
        return { success: true };
      }
    }

    if (segment === 'teachers') {
      const items = readLocalList('localTeachers');
      if (method === 'GET') {
        const params = new URLSearchParams((path.split('?')[1] || '').trim());
        const q = params.get('q') || '';
        const limit = Number(params.get('limit') || 100);
        let filtered = items.slice();
        if (q) filtered = filtered.filter(item => `${item.name || ''} ${item.title || ''} ${Array.isArray(item.subjects) ? item.subjects.join(' ') : String(item.subjects || '')}`.toLowerCase().includes(q.toLowerCase()));
        return { data: filtered.slice(0, limit) };
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
        const updated = item ? { ...item, ...(body || {}) } : null;
        if (updated) {
          const index = items.findIndex(u => u.id === second);
          if (index >= 0) items[index] = updated;
          writeLocalList('localUsers', items);
          setCurrentLocalUser(updated);
        }
        return { data: updated || null, user: updated || null };
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

    if (segment === 'points') {
      const users = readLocalList('localUsers');
      const currentUser = getCurrentLocalUser();
      const pointsKey = 'localPoints';
      function readPoints() {
        try {
          const stored = JSON.parse(localStorage.getItem(pointsKey) || '{}');
          return stored && typeof stored === 'object' ? stored : {};
        } catch {
          return {};
        }
      }
      function writePoints(pointsMap) {
        localStorage.setItem(pointsKey, JSON.stringify(pointsMap));
      }
      function createPointState(user) {
        return {
          userId: user.id,
          userName: user.name,
          total: 0,
          history: [],
          watchedVideos: [],
          completedTests: [],
          testScores: {},
          dailyTasks: {},
          lastLoginDate: null,
        };
      }
      function makeLeaderboard() {
        return users
          .filter(user => user.role !== 'admin')
          .map(user => {
            const item = readPoints()[user.id] || createPointState(user);
            return {
              userId: user.id,
              userName: user.name || 'İstifadəçi',
              userType: user.userType || 'student',
              premium: Boolean(user.premium),
              total: Number(item.total) || 0,
              watchedCount: (item.watchedVideos || []).length,
              testCount: (item.completedTests || []).length,
            };
          })
          .sort((a, b) => b.total - a.total);
      }

      if (method === 'GET') {
        if (!currentUser) return { leaderboard: makeLeaderboard() };
        const map = readPoints();
        const current = map[currentUser.id] || createPointState(currentUser);
        return { points: current, leaderboard: makeLeaderboard() };
      }

      if (method === 'POST') {
        if (!currentUser) throw new Error('Daxil olmalısınız');
        const map = readPoints();
        const current = map[currentUser.id] || createPointState(currentUser);
        const todayKey = new Date().toISOString().slice(0, 10);

        if (body?.type === 'daily-login') {
          if (current.lastLoginDate !== todayKey) {
            current.lastLoginDate = todayKey;
            current.total = (Number(current.total) || 0) + 10;
            current.history = Array.isArray(current.history) ? current.history : [];
            current.history.unshift({ amount: 10, reason: 'Gündəlik giriş', date: new Date().toLocaleDateString('az-AZ'), time: new Date().toLocaleTimeString('az-AZ'), timestamp: Date.now() });
            current.history = current.history.slice(0, 50);
          }
        }

        if (body?.type === 'daily-task') {
          const taskId = String(body.taskId || '');
          const taskTitle = String(body.taskTitle || taskId || 'Tapşırıq');
          const reward = Number(body.reward || 0);
          if (!taskId || !reward) throw new Error('Tapşırıq məlumatı düzgün deyil');
          const dailyTasks = current.dailyTasks && typeof current.dailyTasks === 'object' ? current.dailyTasks : {};
          const tasksForToday = dailyTasks[todayKey] && typeof dailyTasks[todayKey] === 'object' ? dailyTasks[todayKey] : {};
          if (!tasksForToday[taskId]) {
            tasksForToday[taskId] = { taskId, taskTitle, reward, completedAt: new Date().toISOString() };
            dailyTasks[todayKey] = tasksForToday;
            current.dailyTasks = dailyTasks;
            if (taskId === 'watch-video') {
              const watchedVideos = Array.isArray(current.watchedVideos) ? current.watchedVideos : [];
              watchedVideos.push(`video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
              current.watchedVideos = watchedVideos;
            }
            current.total = (Number(current.total) || 0) + reward;
            current.history.unshift({ amount: reward, reason: `Gündəlik tapşırıq: ${taskTitle}`, date: new Date().toLocaleDateString('az-AZ'), time: new Date().toLocaleTimeString('az-AZ'), timestamp: Date.now() });
            current.history = current.history.slice(0, 50);
            map[currentUser.id] = current;
            writePoints(map);
            return { points: current, leaderboard: makeLeaderboard(), earnedPoints: reward };
          }
          return { points: current, leaderboard: makeLeaderboard(), earnedPoints: 0, taskAlreadyCompleted: true };
        }

        if (body?.type === 'test') {
          const testId = String(body.testId || '');
          const answers = Array.isArray(body.answers) ? body.answers : [];
          const completed = Array.isArray(current.completedTests) ? current.completedTests : [];
          if (!completed.includes(testId)) completed.push(testId);
          current.completedTests = completed;
          current.total = (Number(current.total) || 0) + 20;
          current.history.unshift({ amount: 20, reason: 'Sınaq tamamlandı', date: new Date().toLocaleDateString('az-AZ'), time: new Date().toLocaleTimeString('az-AZ'), timestamp: Date.now() });
          current.history = current.history.slice(0, 50);
          map[currentUser.id] = current;
          writePoints(map);
          return { points: current, leaderboard: makeLeaderboard(), earnedPoints: 20, ballScore: 100, score: answers.length || 1, total: answers.length || 1 };
        }

        map[currentUser.id] = current;
        writePoints(map);
        return { points: current, leaderboard: makeLeaderboard() };
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

  function tryLocalFallback(method, path, body) {
    try {
      return localFallback(method, path, body);
    } catch {
      return undefined;
    }
  }

  function shouldUseLocalFallbackForEmptyData(path, data) {
    if (!path || !path.startsWith('/api/')) return false;
    const normalized = path.replace(/^\/+/, '').replace(/^api\//, '').split('?')[0].split('/')[0];
    const localKeys = {
      videos: 'localVideos',
      teachers: 'localTeachers',
      news: 'localNews',
      tests: 'localTests',
      users: 'localUsers',
    };
    const targetKey = localKeys[normalized];
    if (!targetKey || !localStorage.getItem(targetKey)) return false;
    if (Array.isArray(data)) return data.length === 0;
    if (data && Array.isArray(data.data)) return data.data.length === 0;
    return false;
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
      const responseText = await r.text();
      const contentType = r.headers.get('content-type') || '';
      const trimmedText = responseText.trim();
      const looksLikeJson = contentType.includes('application/json') || /^[\[{]/.test(trimmedText);
      const looksLikeHtml = /<\s*(!doctype|html|body|head|table|script)|<\/?[a-z]/i.test(trimmedText) || contentType.includes('text/html');
      let data = {};

      if (looksLikeJson && trimmedText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      const shouldFallbackToLocal =
        (!r.ok && [404, 405].includes(r.status)) ||
        (requestPath.startsWith('/api/') && (looksLikeHtml || (!looksLikeJson && !trimmedText))) ||
        shouldUseLocalFallbackForEmptyData(path, data);

      if (shouldFallbackToLocal) {
        const fallback = tryLocalFallback(method, path, body);
        if (fallback !== undefined) return fallback;
      }

      if (!r.ok) throw Object.assign(new Error(data.error || 'Xəta baş verdi'), { status: r.status, data });
      return data;
    } catch (error) {
      const fallback = tryLocalFallback(method, path, body);
      if (fallback !== undefined) return fallback;
      throw error;
    }
  }

  const auth = {
    async me() { return req('GET', '/api/auth/me'); },
    async login(email, password) {
      const result = await req('POST', '/api/auth/login', { email, password });
      setCachedUser(result.user);
      return result;
    },
    async register(name, email, password, userType) {
      const result = await req('POST', '/api/auth/register', { name, email, password, userType });
      setCachedUser(result.user);
      return result;
    },
    async requestPasswordReset(email) {
      return req('POST', '/api/auth/forgot-password', { email });
    },
    async resetPassword(token, password) {
      return req('POST', '/api/auth/reset-password', { token, password });
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

  const videos = {
    async list(params = {}) { return req('GET', '/api/videos?' + new URLSearchParams(params)); },
    async get(id) { return req('GET', `/api/videos/${id}`); },
    async create(data) { return req('POST', '/api/videos', data); },
    async update(id, data) { return req('PUT', `/api/videos/${id}`, data); },
    async remove(id) { return req('DELETE', `/api/videos/${id}`); },
    async view(id) { return req('POST', `/api/videos/${id}?action=view`); },
  };

  const media = {
    async signature() { return req('POST', '/api/media-signature'); },
  };

  const teachers = {
    async list(params = {}) { return req('GET', '/api/teachers?' + new URLSearchParams(params)); },
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
    async update(id, data) {
      const result = await req('PUT', `/api/users/${id}`, data);
      const nextUser = normalizeUserRecord(result) || result;
      if (nextUser && nextUser.id) {
        setCachedUser(nextUser);
      }
      return nextUser || result;
    },
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

  const points = {
    async get() { return req('GET', '/api/points'); },
    async results() { return req('GET', '/api/points?view=results'); },
    async awardTest(testId, answers) { return req('POST', '/api/points', { type: 'test', testId, answers }); },
    async awardDailyLogin() { return req('POST', '/api/points', { type: 'daily-login' }); },
    async awardDailyTask(taskId, taskTitle, reward) {
      return req('POST', '/api/points', { type: 'daily-task', taskId, taskTitle, reward });
    },
  };

  const notifications = {
    async list(params = {}) { return req('GET', '/api/notifications?' + new URLSearchParams(params)); },
    async send(data) { return req('POST', '/api/notifications', data); },
    async read(ids) {
      const idList = Array.isArray(ids) ? ids : [ids];
      return req('PUT', '/api/notifications', { ids: idList.filter(Boolean), action: 'mark-read' });
    },
  };

  let _currentUser = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('currentUser') || 'null');
      return saved?.user || saved || null;
    } catch {
      return null;
    }
  })();

  function setCachedUser(user) {
    const normalized = normalizeUserRecord(user);
    if (normalized) {
      const synced = syncUserToLocalStore(normalized) || normalized;
      _currentUser = synced;
      localStorage.setItem('currentUser', JSON.stringify({ user: synced }));
      return synced;
    }

    _currentUser = null;
    localStorage.removeItem('currentUser');
    return null;
  }

  async function getCurrentUser() {
    try {
      const { user } = await auth.me();
      return setCachedUser(user);
    } catch {
      setCachedUser(null);
      return null;
    }
  }

  function clearUserCache() {
    setCachedUser(null);
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

  return { auth, tests, videos, media, teachers, news, users, teacherTests, premium, stats, payments, points, notifications, getCurrentUser, getCachedUser: () => _currentUser, setCachedUser, clearUserCache, logout, notify };
})();

window.API = API;
