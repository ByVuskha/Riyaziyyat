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
    delete safeUser.passwordPlain;
    delete safeUser.passwordDisplay;
    localStorage.setItem('currentUser', JSON.stringify({ user: safeUser }));
    return safeUser;
  }

  function getDeviceInfo() {
    try {
      const rawBrowser = navigator.userAgent || 'unknown';
      const screen = typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '';
      const info = {
        userAgent: rawBrowser,
        platform: navigator.platform || '',
        browser: navigator.userAgentData?.brands?.map(b => b.brand).join(' ') || navigator.appName || 'Browser',
        language: navigator.language || 'az-AZ',
        screen,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      };
      const storageKey = 'deviceFingerprint';
      let deviceId = localStorage.getItem(storageKey);
      if (!deviceId) {
        deviceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem(storageKey, deviceId);
      }
      return { ...info, deviceId };
    } catch {
      return { deviceId: `fallback-${Date.now()}` };
    }
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
      delete cleaned.passwordPlain;
      delete cleaned.passwordDisplay;
      if (idx >= 0) users[idx] = { ...users[idx], ...cleaned };
      else users.unshift(cleaned);
      writeLocalList('localUsers', users);
    } catch {}

    return setCurrentLocalUser(safeUser);
  }

  function ensureDemoData() {
    const seededUsers = [
      {
        id: 'admin-001',
        name: 'Admin',
        email: 'admin@riyazmath.az',
        password: 'admin123',
        role: 'admin',
        userType: 'admin',
        premium: true,
        balance: 0,
        points: 0,
        deviceId: 'admin-device-default',
        deviceStatus: 'approved',
        knownDevices: [{ deviceId: 'admin-device-default', browser: 'Local browser', platform: 'Browser', lastSeenAt: new Date().toISOString() }],
        registeredAt: '2024-01-15T09:00:00.000Z',
      },
      {
        id: 'user-101',
        name: 'Aysel Nuriyeva',
        email: 'aysel@example.com',
        password: 'pass123',
        role: 'user',
        userType: 'student',
        premium: false,
        balance: 25,
        points: 280,
        deviceId: 'student-device-default',
        deviceStatus: 'approved',
        knownDevices: [{ deviceId: 'student-device-default', browser: 'Local browser', platform: 'Browser', lastSeenAt: new Date().toISOString() }],
        registeredAt: '2024-02-10T10:20:00.000Z',
      }
    ];

    const seededTeachers = [
      {
        id: 'teacher-1',
        name: 'Nermin Əliyeva',
        email: 'nermin@riyazmath.az',
        title: 'Riyaziyyat müəllimi',
        subjects: ['Cəbr', 'Həndəsə'],
        experience: 8,
        rating: 4.9,
        profilePicture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
        bio: 'Tənliklər və həndəsə mövzularında dərsləri sadə və tətbiqetməyə uyğun izah edir.',
        publicProfile: true,
        canAddTests: true,
      },
      {
        id: 'teacher-2',
        name: 'Rasim Qasımov',
        email: 'rasim@riyazmath.az',
        title: 'Analiz müəllimi',
        subjects: ['Analiz', 'Trigonometriya'],
        experience: 10,
        rating: 4.8,
        profilePicture: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
        bio: 'Limit, törəmə və inteqral mövzularında praktiki yanaşma tətbiq edir.',
        publicProfile: true,
        canAddTests: true,
      },
      {
        id: 'teacher-3',
        name: 'Leyla Məmmədova',
        email: 'leyla@riyazmath.az',
        title: 'Dərs planlaşdırma müəllimi',
        subjects: ['Məntiq', 'Hesablama'],
        experience: 7,
        rating: 4.7,
        profilePicture: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80',
        bio: 'Məntiqi düşünmə bacarıqlarını inkişaf etdirən interaktiv dərslər keçirir.',
        publicProfile: true,
        canAddTests: true,
      }
    ];

    const seededVideos = [
      { id: 'v-1', title: 'Cəbr: Tənliklər və dəyişənlər', category: 'cebr', teacherId: 'teacher-1', teacherName: 'Nermin Əliyeva', description: 'Tənliklərin həlli metodları və sadə nümunələr.', youtubeUrl: 'https://www.youtube.com/watch?v=2Vv-6vN_Kmc', duration: '12:35', views: 1840, isActive: true },
      { id: 'v-2', title: 'Həndəsə: Üçbucaq və bucaqlar', category: 'hendese', teacherId: 'teacher-1', teacherName: 'Nermin Əliyeva', description: 'Üçbucağın xassələri və bucaqların hesablanması.', youtubeUrl: 'https://www.youtube.com/watch?v=4f4N1xlgx0o', duration: '15:12', views: 1560, isActive: true },
      { id: 'v-3', title: 'Analiz: Limit anlayışı', category: 'analiz', teacherId: 'teacher-2', teacherName: 'Rasim Qasımov', description: 'Limitin fiziki və riyazi mənası.', youtubeUrl: 'https://www.youtube.com/watch?v=Qf9U4Ff7mQ0', duration: '18:08', views: 2230, isActive: true },
      { id: 'v-4', title: 'Ehtimal nəzəriyyəsi: əsas anlayışlar', category: 'ehtimal', teacherId: 'teacher-2', teacherName: 'Rasim Qasımov', description: 'Hadisələrin ehtimalı və statistik hesablamalar.', youtubeUrl: 'https://www.youtube.com/watch?v=1Aiy2JzF9kQ', duration: '10:42', views: 1330, isActive: true }
    ];

    const seededNews = [
      { id: 'n-1', title: 'Yeni riyaziyyat proqramı istifadəyə verildi', summary: 'Yeni mövzular və praktiki sınaqlar platformaya əlavə edildi.', content: 'Platformada əlavə olunan yeni riyaziyyat blokları ilə tələbələr daha strukturlaşdırılmış şəkildə öyrənməyə başlayacaqlar.', publishedAt: '2025-03-01T10:00:00.000Z', views: 1200 },
      { id: 'n-2', title: 'Yazılışlara hazırlıq kampaniyası başladı', summary: 'İmtahan hazırlığı üçün xüsusi dərs paketi açıldı.', content: 'Hər həftə yeni tapşırıqlar və testlər yayımlanacaq.', publishedAt: '2025-03-12T12:30:00.000Z', views: 980 }
    ];

    const seededTests = [
      { id: 't-1', title: 'Cəbr Əsasları', category: 'cebr', questionCount: 8, difficulty: 'Asan', duration: 20, createdAt: '2025-02-15T09:00:00.000Z' },
      { id: 't-2', title: 'Həndəsə Praktikası', category: 'hendese', questionCount: 10, difficulty: 'Orta', duration: 25, createdAt: '2025-02-20T09:00:00.000Z' },
      { id: 't-3', title: 'Analiz üzrə mini sınaq', category: 'analiz', questionCount: 6, difficulty: 'Çətin', duration: 18, createdAt: '2025-03-05T09:00:00.000Z' }
    ];

    const baseSecrets = {
      localUsers: { items: seededUsers, predicate: item => item.email === 'admin@riyazmath.az' || item.email === 'aysel@example.com' },
      localTeachers: { items: seededTeachers, predicate: item => item.email === 'nermin@riyazmath.az' || item.email === 'rasim@riyazmath.az' || item.email === 'leyla@riyazmath.az' },
      localVideos: { items: seededVideos, predicate: item => ['v-1', 'v-2', 'v-3', 'v-4'].includes(String(item.id)) },
      localNews: { items: seededNews, predicate: item => ['n-1', 'n-2'].includes(String(item.id)) },
      localTests: { items: seededTests, predicate: item => ['t-1', 't-2', 't-3'].includes(String(item.id)) },
      localTeacherTests: { items: [], predicate: () => false },
      localPremium: { items: [], predicate: () => false },
      localPayments: { items: [], predicate: () => false },
    };

    Object.entries(baseSecrets).forEach(([key, config]) => {
      const current = readLocalList(key, []);
      if (!current.length) {
        writeLocalList(key, config.items);
        return;
      }
      const cleaned = current.filter(item => !config.predicate(item));
      if (cleaned.length !== current.length) {
        writeLocalList(key, [...config.items, ...cleaned]);
      }
    });

    const loadedUsers = readLocalList('localUsers', []);
    if (!loadedUsers.some(item => item.email === 'admin@riyazmath.az')) {
      loadedUsers.unshift(seededUsers[0]);
      writeLocalList('localUsers', loadedUsers);
    }

    if (!localStorage.getItem('currentUser')) setCurrentLocalUser(null);
    const points = JSON.parse(localStorage.getItem('localPoints') || '{}');
    if (!points['admin-001']) points['admin-001'] = { userId: 'admin-001', userName: 'Admin', total: 0, history: [], watchedVideos: [], completedTests: [], testScores: {}, dailyTasks: {}, lastLoginDate: null };
    localStorage.setItem('localPoints', JSON.stringify(points));
  }

  ensureDemoData();

  const LOCAL_DAILY_TASKS = {
    'watch-video': { title: 'Video izlə', reward: 15 },
    'solve-test': { title: 'Sınaq həll et', reward: 20 },
    'read-news': { title: 'Xəbər oxu', reward: 10 },
    login: { title: 'Giriş et', reward: 10 },
  };

  function applyLocalDailyTask(points, taskId, options = {}) {
    const task = LOCAL_DAILY_TASKS[taskId];
    if (!task) throw new Error('Dəstəklənməyən gündəlik tapşırıq');
    const today = new Date().toISOString().slice(0, 10);
    const dailyTasks = points.dailyTasks && typeof points.dailyTasks === 'object' ? points.dailyTasks : {};
    const todayTasks = dailyTasks[today] && typeof dailyTasks[today] === 'object' ? dailyTasks[today] : {};
    if (todayTasks[taskId]) return { earnedPoints: 0, taskAlreadyCompleted: true };

    todayTasks[taskId] = { taskId, taskTitle: task.title, reward: task.reward, completedAt: new Date().toISOString() };
    dailyTasks[today] = todayTasks;
    points.dailyTasks = dailyTasks;
    if (taskId === 'watch-video' && options.videoId) {
      points.watchedVideos = Array.isArray(points.watchedVideos) ? points.watchedVideos : [];
      if (!points.watchedVideos.includes(String(options.videoId))) points.watchedVideos.push(String(options.videoId));
    }
    points.total = (Number(points.total) || 0) + task.reward;
    points.history = Array.isArray(points.history) ? points.history : [];
    points.history.unshift({
      amount: task.reward,
      reason: `Gündəlik tapşırıq: ${task.title}`,
      date: new Date().toLocaleDateString('az-AZ'),
      time: new Date().toLocaleTimeString('az-AZ'),
      timestamp: Date.now(),
    });
    points.history = points.history.slice(0, 50);
    return { earnedPoints: task.reward, taskAlreadyCompleted: false };
  }

  function awardLocalDailyTask(taskId, options = {}) {
    const user = getCurrentLocalUser();
    if (!user || user.role === 'admin') return { earnedPoints: 0, taskAlreadyCompleted: false };
    let pointsMap = {};
    try { pointsMap = JSON.parse(localStorage.getItem('localPoints') || '{}'); } catch {}
    const points = pointsMap[user.id] || {
      userId: user.id, userName: user.name, total: 0, history: [], watchedVideos: [],
      completedTests: [], testScores: {}, dailyTasks: {}, lastLoginDate: null,
    };
    const result = applyLocalDailyTask(points, taskId, options);
    pointsMap[user.id] = points;
    localStorage.setItem('localPoints', JSON.stringify(pointsMap));
    const users = readLocalList('localUsers');
    const userIndex = users.findIndex(item => String(item.id) === String(user.id));
    if (userIndex >= 0) {
      users[userIndex].points = points.total;
      writeLocalList('localUsers', users);
    }
    return { ...result, points };
  }

  function localFallback(method, path, body) {
    ensureDemoData();
    const clean = path.replace(/^\/+/, '').replace(/^api\//, '').split('?')[0];
    const [segment, second] = clean.split('/');

    if (segment === 'auth') {
      if (second === 'me') return { user: getCurrentLocalUser() };
      if (second === 'login') {
        const users = readLocalList('localUsers');
        const { email, password, deviceInfo } = body || {};
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const user = users.find(u => String(u.email || '').trim().toLowerCase() === normalizedEmail && String(u.password || '') === String(password || ''));
        if (!user) throw new Error('E-poçt və ya şifrə yanlışdır');
        if (user.frozen) throw new Error('Hesabınız bloklanıb. Admin təsdiqi tələb olunur.');

        const deviceId = String((deviceInfo && deviceInfo.deviceId) || localStorage.getItem('deviceFingerprint') || `${Date.now()}`);
        const knownDevices = Array.isArray(user.knownDevices) ? user.knownDevices : [];
        const hasKnownDevice = knownDevices.some(device => String(device.deviceId) === String(deviceId));
        if (user.deviceId && user.deviceId !== deviceId && !hasKnownDevice) {
          if (user.role === 'admin') {
            user.deviceId = deviceId;
            user.deviceStatus = 'approved';
            user.pendingDeviceId = null;
            user.pendingDeviceInfo = null;
            user.deviceMismatchCount = 0;
            user.frozen = false;
          } else {
            const nextCount = Number(user.deviceMismatchCount || 0) + 1;
            user.deviceMismatchCount = nextCount;
            user.deviceStatus = 'pending_review';
            user.pendingDeviceId = deviceId;
            user.pendingDeviceInfo = { deviceId, browser: 'Local browser', platform: 'Browser', ...deviceInfo, requestedAt: new Date().toISOString() };
            user.frozen = nextCount >= 2;
            writeLocalList('localUsers', users);
            if (user.frozen) {
              throw Object.assign(new Error('Başqa cihazdan giriş cəhd edildi. Hesab bloklandı. Yalnız admin icazə verə bilər.'), {
                status: 403,
                data: { error: 'Başqa cihazdan giriş cəhd edildi. Hesab bloklandı. Yalnız admin icazə verə bilər.', deviceBlocked: true },
              });
            }
            throw Object.assign(new Error('Başqa cihazdan giriş cəhdi qeydə alındı. Admin icazəsi tələb olunur.'), {
              status: 403,
              data: { error: 'Başqa cihazdan giriş cəhdi qeydə alındı. Admin icazəsi tələb olunur.', warning: true },
            });
          }
        }

        if (user.loginApproved === false || user.loginRequestStatus === 'pending' || user.loginRequestStatus === 'rejected') {
          throw Object.assign(new Error('Giriş icazəsi admin tərəfindən təsdiqlənməlidir.'), {
            status: 403,
            data: { error: 'Giriş icazəsi admin tərəfindən təsdiqlənməlidir.' },
          });
        }

        const pendingOtherDevice = Boolean(user.pendingDeviceId && String(user.pendingDeviceId) !== deviceId);
        user.deviceId = deviceId;
        if (!pendingOtherDevice) {
          user.deviceStatus = 'approved';
          user.pendingDeviceId = null;
          user.pendingDeviceInfo = null;
          user.deviceMismatchCount = 0;
        }
        user.frozen = false;
        user.knownDevices = knownDevices.some(device => String(device.deviceId) === String(deviceId)) ? knownDevices : [...knownDevices, { deviceId, browser: 'Local browser', platform: 'Browser', lastSeenAt: new Date().toISOString() }];
        writeLocalList('localUsers', users);

        const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const loggedInUser = { ...user, sessionId, password: undefined };
        setCurrentLocalUser(loggedInUser);
        return { user: loggedInUser };
      }
      if (second === 'register-code') {
        const payload = body || {};
        const email = String(payload.email || '').trim().toLowerCase();
        if (!email || !payload.password) throw new Error('Email və şifrə tələb olunur');
        const code = String(Math.floor(100000 + Math.random() * 900000));
        localStorage.setItem(`localRegisterCode:${email}`, JSON.stringify({ code, name: payload.name || 'Yeni istifadəçi', password: payload.password, userType: payload.userType || 'student', createdAt: Date.now() }));
        return { ok: true, message: `Təsdiq kodu ${email} ünvanına göndərildi.`, code };
      }
      if (second === 'approve-device') {
        const admin = getCurrentLocalUser();
        if (!admin || admin.role !== 'admin') throw new Error('Admin icazəsi tələb olunur.');
        const users = readLocalList('localUsers');
        const target = users.find(user => String(user.id) === String(body?.userId));
        const deviceId = String(body?.deviceId || '').trim();
        if (!target) throw new Error('İstifadəçi tapılmadı.');
        if (!deviceId) throw new Error('Təsdiqlənəcək cihaz ID-si tələb olunur.');
        const pendingInfo = target.pendingDeviceInfo || {};
        const knownDevices = Array.isArray(target.knownDevices) ? target.knownDevices : [];
        if (!knownDevices.some(device => String(device.deviceId) === deviceId)) {
          knownDevices.push({
            ...pendingInfo,
            deviceId,
            firstSeenAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
          });
        }
        target.deviceId = deviceId;
        target.knownDevices = knownDevices;
        target.deviceStatus = 'approved';
        target.pendingDeviceId = null;
        target.pendingDeviceInfo = null;
        target.deviceMismatchCount = 0;
        target.loginApproved = true;
        target.loginRequestStatus = 'approved';
        target.frozen = false;
        target.sessionId = null;
        writeLocalList('localUsers', users);
        return { ok: true, user: target };
      }
      if (second === 'register') {
        const users = readLocalList('localUsers');
        const payload = body || {};
        const normalizedEmail = String(payload.email || '').trim().toLowerCase();
        const pendingKey = `localRegisterCode:${normalizedEmail}`;
        const pending = JSON.parse(localStorage.getItem(pendingKey) || 'null');
        const finalName = String(payload.name || pending?.name || 'Yeni İstifadəçi').trim();
        const finalPassword = payload.password || pending?.password;
        const finalUserType = payload.userType || pending?.userType || 'student';
        if (!normalizedEmail || !finalPassword) throw new Error('Email və şifrə tələb olunur');
        if (pending && String(payload.verificationCode || '').trim() !== String(pending.code || '').trim()) {
          throw new Error('Email təsdiq kodu yanlışdır');
        }
        if (users.some(u => String(u.email || '').trim().toLowerCase() === normalizedEmail)) throw new Error('Bu e-poçt artıq qeydiyyatdan keçib');

        const deviceInfo = payload.deviceInfo || { deviceId: localStorage.getItem('deviceFingerprint') || `local-${Date.now()}` };
        const finalDeviceId = String(deviceInfo.deviceId || localStorage.getItem('deviceFingerprint') || `local-${Date.now()}`);
        const user = {
          id: `user-${Date.now()}`,
          name: finalName,
          email: normalizedEmail,
          password: finalPassword,
          role: 'user',
          userType: finalUserType,
          premium: false,
          balance: 0,
          points: 0,
          pendingDeviceId: null,
          pendingDeviceInfo: null,
          deviceId: finalDeviceId,
          deviceStatus: 'approved',
          deviceMismatchCount: 0,
          knownDevices: [{ deviceId: finalDeviceId, browser: 'Local browser', platform: 'Browser', lastSeenAt: new Date().toISOString() }],
          registeredAt: new Date().toISOString()
        };
        users.push(user);
        writeLocalList('localUsers', users);
        localStorage.removeItem(pendingKey);
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
      const action = new URLSearchParams((path.split('?')[1] || '').trim()).get('action');
      if (method === 'POST' && second && (action === 'watch-start' || action === 'watch-complete')) {
        const user = getCurrentLocalUser();
        if (!user) throw Object.assign(new Error('Giriş tələb olunur'), { status: 401 });
        const video = items.find(item => String(item.id) === String(second));
        if (!video) throw new Error('Video tapılmadı');
        const sessionKey = `localVideoWatch:${user.id}:${second}`;
        if (action === 'watch-start') {
          localStorage.setItem(sessionKey, String(Date.now()));
          return { started: true };
        }
        const startedAt = Number(localStorage.getItem(sessionKey));
        if (!startedAt) throw new Error('Video izləmə sessiyası tapılmadı');
        const parts = String(video.duration || '').split(':').map(Number);
        const duration = parts.length === 2 ? parts[0] * 60 + parts[1] : parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0;
        const minimumSeconds = duration ? Math.max(5, Math.min(120, Math.ceil(duration * 0.8))) : 15;
        if (Date.now() - startedAt < minimumSeconds * 1000) throw new Error('Video izləmə müddəti tamamlanmayıb');
        localStorage.removeItem(sessionKey);
        return { completed: true, ...awardLocalDailyTask('watch-video', { videoId: second }) };
      }
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
        if (action === 'view' && second) {
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
      const action = new URLSearchParams((path.split('?')[1] || '').trim()).get('action');
      if (method === 'POST' && second && action === 'view') {
        const item = items.find(news => String(news.id) === String(second));
        if (!item) throw new Error('Xəbər tapılmadı');
        item.views = Number(item.views || 0) + 1;
        writeLocalList('localNews', items);
        const user = getCurrentLocalUser();
        if (user) localStorage.setItem(`localNewsRead:${user.id}:${second}`, String(Date.now()));
        return { views: item.views };
      }
      if (method === 'POST' && second && action === 'complete-read') {
        const user = getCurrentLocalUser();
        if (!user) throw Object.assign(new Error('Giriş tələb olunur'), { status: 401 });
        const key = `localNewsRead:${user.id}:${second}`;
        const startedAt = Number(localStorage.getItem(key));
        if (!startedAt || Date.now() - startedAt < 20000) throw new Error('Xəbəri oxumaq üçün ən azı 20 saniyə səhifədə qalın');
        localStorage.removeItem(key);
        return { completed: true, ...awardLocalDailyTask('read-news') };
      }
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
      if (method === 'POST') {
        const payload = body || {};
        if (items.some(u => String(u.email || '').trim().toLowerCase() === String(payload.email || '').trim().toLowerCase())) {
          throw new Error('Bu e-poçt artıq qeydiyyatdan keçib');
        }
        const user = {
          id: `user-${Date.now()}`,
          name: payload.name || 'Yeni İstifadəçi',
          email: String(payload.email || '').trim(),
          password: payload.password || 'pass123',
          role: payload.role || 'user',
          userType: payload.userType || 'student',
          premium: Boolean(payload.premium),
          balance: Number(payload.balance || 0),
          points: Number(payload.points || 0),
          deviceId: payload.deviceId || `user-${Date.now()}`,
          deviceStatus: 'approved',
          knownDevices: [{ deviceId: payload.deviceId || `user-${Date.now()}`, browser: 'Local browser', platform: 'Browser', lastSeenAt: new Date().toISOString() }],
          registeredAt: new Date().toISOString(),
          ...payload,
        };
        items.unshift(user);
        writeLocalList('localUsers', items);
        setCurrentLocalUser({ ...user, password: undefined });
        return { data: user, user };
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
        if (item.status !== 'pending') throw new Error('Bu sınaq artıq nəzərdən keçirilib');
        item.status = body.action === 'approve' ? 'approved' : 'rejected';
        if (body.adminNote) item.adminNote = body.adminNote;
        writeLocalList('localTeacherTests', items);
        if (body.action === 'approve' && Array.isArray(item.questions) && item.questions.length) {
          const tests = readLocalList('localTests');
          if (!tests.some(test => String(test.teacherTestId) === String(item.id))) {
            const publishedTest = {
              ...item,
              id: `t-${item.id}`,
              teacherTestId: item.id,
              category: item.topic || item.category || 'Ümumi',
              questionCount: item.questions.length,
              createdAt: new Date().toISOString(),
            };
            delete publishedTest.status;
            delete publishedTest.adminNote;
            tests.unshift(publishedTest);
            writeLocalList('localTests', tests);
          }
        }
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
          const dailyTasks = current.dailyTasks && typeof current.dailyTasks === 'object' ? current.dailyTasks : {};
          const tasksForToday = dailyTasks[todayKey] && typeof dailyTasks[todayKey] === 'object' ? dailyTasks[todayKey] : {};
          if (!tasksForToday.login) {
            tasksForToday.login = { taskId: 'login', taskTitle: 'Giriş et', reward: 10, completedAt: new Date().toISOString() };
            dailyTasks[todayKey] = tasksForToday;
            current.dailyTasks = dailyTasks;
          }
        }

        if (body?.type === 'daily-task') {
          throw new Error('Gündəlik tapşırıqlar yalnız təsdiqlənmiş fəaliyyət tamamlandıqda verilir');
        }

        if (body?.type === 'test') {
          const testId = String(body.testId || '');
          const answers = Array.isArray(body.answers) ? body.answers : [];
          const completed = Array.isArray(current.completedTests) ? current.completedTests : [];
          if (completed.includes(testId)) throw new Error('Bu sınaq artıq işlənib');
          completed.push(testId);
          current.completedTests = completed;
          current.total = (Number(current.total) || 0) + 20;
          current.history.unshift({ amount: 20, reason: 'Sınaq tamamlandı', date: new Date().toLocaleDateString('az-AZ'), time: new Date().toLocaleTimeString('az-AZ'), timestamp: Date.now() });
          current.history = current.history.slice(0, 50);
          const dailyTaskEarnedPoints = applyLocalDailyTask(current, 'solve-test').earnedPoints;
          map[currentUser.id] = current;
          writePoints(map);
          return { points: current, leaderboard: makeLeaderboard(), earnedPoints: 20, dailyTaskEarnedPoints, ballScore: 100, score: answers.length || 1, total: answers.length || 1 };
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
      const looksLikeHtml = contentType.includes('text/html') || /^\s*<(?:!doctype\s+html|html|head|body)\b/i.test(trimmedText);
      let data = {};
      const isRegistrationVerificationRequest = /^\/api\/auth\/(?:register-code|register)(?:\?|$)/.test(requestPath);

      if (looksLikeJson && trimmedText) {
        try {
          data = JSON.parse(responseText);
        } catch {
          data = {};
        }
      }

      const shouldFallbackToLocal =
        !isRegistrationVerificationRequest && (
          (!r.ok && [404, 405].includes(r.status)) ||
          (requestPath.startsWith('/api/') && (looksLikeHtml || (!looksLikeJson && !trimmedText))) ||
          shouldUseLocalFallbackForEmptyData(path, data)
        );

      if (shouldFallbackToLocal) {
        const fallback = tryLocalFallback(method, path, body);
        if (fallback !== undefined) return fallback;
      }

      if (!r.ok) throw Object.assign(new Error(data.error || 'Xəta baş verdi'), { status: r.status, data });
      return data;
    } catch (error) {
      if (error.status) throw error;
      if (/^\/api\/auth\/(?:register-code|register)(?:\?|$)/.test(buildRequestPath(path))) {
        throw new Error('Email doğrulaması üçün serverə qoşulmaq mümkün olmadı. Bir az sonra yenidən cəhd edin.');
      }
      const fallback = tryLocalFallback(method, path, body);
      if (fallback !== undefined) return fallback;
      throw error;
    }
  }

  const auth = {
    async me() { return req('GET', '/api/auth/me'); },
    async login(email, password) {
      const result = await req('POST', '/api/auth/login', { email, password, deviceInfo: getDeviceInfo() });
      setCachedUser(result.user);
      return result;
    },
    async sendRegistrationCode(name, email, password, userType) {
      return req('POST', '/api/auth/register-code', { name, email, password, userType, deviceInfo: getDeviceInfo() });
    },
    async register(email, verificationCode, extra = {}) {
      const payload = typeof email === 'object' ? email : { email, verificationCode, ...extra };
      const result = await req('POST', '/api/auth/register', payload);
      if (result.user) setCachedUser(result.user);
      return result;
    },
    async approveDevice(userId, deviceId) {
      return req('POST', '/api/auth/approve-device', { userId, deviceId });
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
    async startWatch(id) { return req('POST', `/api/videos/${id}?action=watch-start`); },
    async completeWatch(id) { return req('POST', `/api/videos/${id}?action=watch-complete`); },
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
    async completeRead(id) { return req('POST', `/api/news/${id}?action=complete-read`); },
  };

  const users = {
    async list(params = {}) { return req('GET', '/api/users?' + new URLSearchParams(params)); },
    async get(id) { return req('GET', `/api/users/${id}`); },
    async create(data = {}) {
      const payload = { ...data, password: data.password || 'pass123' };
      const result = await req('POST', '/api/users', payload);
      const nextUser = normalizeUserRecord(result) || result;
      if (nextUser && nextUser.id) {
        setCachedUser(nextUser);
      }
      return nextUser || result;
    },
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
