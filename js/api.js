// API Configuration
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

function ensureLocalDemoData() {
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
    if (!localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', JSON.stringify({ user: null }));
    }
}

function getCurrentLocalUser() {
    try {
        const raw = localStorage.getItem('currentUser');
        if (!raw) return null;
        const payload = JSON.parse(raw);
        return payload && payload.user ? payload.user : null;
    } catch {
        return null;
    }
}

function setCurrentLocalUser(user) {
    localStorage.setItem('currentUser', JSON.stringify({ user }));
}

function localFallback(method, path, body) {
    ensureLocalDemoData();
    const clean = path.replace(/^\//, '').split('?')[0];
    const [segment, sub] = clean.split('/');

    if (segment === 'auth') {
        if (sub === 'me') return { user: getCurrentLocalUser() };
        if (sub === 'login') {
            const users = readLocalList('localUsers');
            const { email, password } = body || {};
            const user = users.find(u => u.email === email && u.password === password);
            if (!user) throw new Error('E-poçt və ya şifrə yanlışdır');
            setCurrentLocalUser({ ...user, password: undefined });
            return { user: { ...user, password: undefined } };
        }
        if (sub === 'register') {
            const users = readLocalList('localUsers');
            const payload = body || {};
            if (users.some(u => u.email === payload.email)) throw new Error('Bu e-poçt artıq qeydiyyatdan keçib');
            const user = { id: `user-${Date.now()}`, name: payload.name || 'Yeni İstifadəçi', email: payload.email, password: payload.password, role: 'user', userType: payload.userType || 'student', premium: false, balance: 0, points: 0, registeredAt: new Date().toISOString() };
            users.push(user);
            writeLocalList('localUsers', users);
            setCurrentLocalUser({ ...user, password: undefined });
            return { user: { ...user, password: undefined } };
        }
        if (sub === 'logout') {
            setCurrentLocalUser(null);
            return { success: true };
        }
    }

    if (segment === 'tests') {
        const items = readLocalList('localTests');
        if (method === 'GET') {
            if (sub) {
                const item = items.find(t => t.id === sub);
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
            const item = items.find(t => t.id === sub);
            Object.assign(item || {}, body || {});
            writeLocalList('localTests', items);
            return { data: item || null, test: item || null };
        }
        if (method === 'DELETE') {
            writeLocalList('localTests', items.filter(t => t.id !== sub));
            return { success: true };
        }
    }

    if (segment === 'news') {
        const items = readLocalList('localNews');
        if (method === 'GET') {
            if (sub) {
                const item = items.find(n => n.id === sub);
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
            const item = items.find(n => n.id === sub);
            Object.assign(item || {}, body || {});
            writeLocalList('localNews', items);
            return { data: item || null, news: item || null };
        }
        if (method === 'DELETE') {
            writeLocalList('localNews', items.filter(n => n.id !== sub));
            return { success: true };
        }
    }

    if (segment === 'users') {
        const items = readLocalList('localUsers');
        if (method === 'GET') {
            if (sub) {
                const item = items.find(u => u.id === sub);
                return { data: item || null, user: item || null };
            }
            return { data: items };
        }
        if (method === 'PUT') {
            const item = items.find(u => u.id === sub);
            Object.assign(item || {}, body || {});
            writeLocalList('localUsers', items);
            return { data: item || null, user: item || null };
        }
        if (method === 'DELETE') {
            writeLocalList('localUsers', items.filter(u => u.id !== sub));
            return { success: true };
        }
    }

    return { data: [] };
}

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const requestPath = endpoint.startsWith('/api') ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(requestPath, {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers }
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.warn('Falling back to local demo data:', error);
        return localFallback((options.method || 'GET').toUpperCase(), endpoint, options.body ? JSON.parse(options.body) : undefined);
    }
}

// Auth API
const AuthAPI = {
    register: async (data) => await apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: async (email, password) => await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    getCurrentUser: async () => await apiCall('/auth/me'),
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
    }
};

// Video API
const VideoAPI = {
    getAll: async () => await apiCall('/videos'),
    getById: async (id) => await apiCall(`/videos/${id}`),
    create: async (data) => await apiCall('/videos', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => await apiCall(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id) => await apiCall(`/videos/${id}`, { method: 'DELETE' }),
    incrementView: async (id) => await apiCall(`/videos/${id}/view`, { method: 'POST' }),
    getByCategory: async (category) => await apiCall(`/videos/category/${category}`),
    getByTeacher: async (teacherId) => await apiCall(`/videos/teacher/${teacherId}`)
};

// News API
const NewsAPI = {
    getAll: async () => await apiCall('/news'),
    getById: async (id) => await apiCall(`/news/${id}`),
    create: async (data) => await apiCall('/news', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => await apiCall(`/news/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id) => await apiCall(`/news/${id}`, { method: 'DELETE' }),
    incrementView: async (id) => await apiCall(`/news/${id}/view`, { method: 'POST' })
};

// User API
const UserAPI = {
    getAll: async () => await apiCall('/users'),
    getById: async (id) => await apiCall(`/users/${id}`),
    update: async (id, data) => await apiCall(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getWatchedVideos: async (id) => await apiCall(`/users/${id}/videos`)
};

// Teacher API
const TeacherAPI = {
    getAll: async () => await apiCall('/teachers'),
    getById: async (id) => await apiCall(`/teachers/${id}`),
    create: async (data) => await apiCall('/teachers', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id, data) => await apiCall(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id) => await apiCall(`/teachers/${id}`, { method: 'DELETE' })
};

const MigrationHelper = {
    async migrateVideos() {
        const videos = readLocalList('videos') || [];
        for (const video of videos) {
            try { await VideoAPI.create(video); } catch (error) { console.error('Migration failed', error); }
        }
    },
    async migrateNews() {
        const news = readLocalList('news') || [];
        for (const item of news) {
            try { await NewsAPI.create(item); } catch (error) { console.error('Migration failed', error); }
        }
    },
    async migrateAll() {
        await this.migrateVideos();
        await this.migrateNews();
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthAPI, VideoAPI, NewsAPI, UserAPI, TeacherAPI, MigrationHelper };
}
