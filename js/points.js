/**
 * Points (Xal) Sistemi - Bizim Riyaziyyat
 *
 * Qaydalar:
 * - Gündəlik giriş: gündə 1 dəfə, yalnız Upstash data yüklənəndən sonra
 * - Video: izlənmə faizinə görə, hər videodan 1 dəfə
 * - Sınaq: hər sınaqdan 1 dəfə
 */

const POINTS_CONFIG = {
    videoFull:   10,  // 80%+
    videoHalf:    5,  // 40-79%
    videoMin:     2,  // 10-39%
    testPerfect: 50,
    testGood:    30,
    testPass:    15,
    testFail:     5,
    dailyLogin:   2,
};

// ── Storage helpers (bypass wrapper to avoid timing issues) ───────────────────
function _getAll() {
    try { return JSON.parse(localStorage.getItem('userPoints') || '{}'); } catch { return {}; }
}
function _setAll(all) {
    localStorage.setItem('userPoints', JSON.stringify(all));
}

// ── Core ──────────────────────────────────────────────────────────────────────
function getUserPoints(userId) {
    const all = _getAll();
    const def = { userId, total: 0, history: [], watchedVideos: [], completedTests: [], lastLoginDate: null };
    if (!all[userId]) return def;
    const r = all[userId];
    return {
        ...def, ...r,
        history:        Array.isArray(r.history)        ? r.history        : [],
        watchedVideos:  Array.isArray(r.watchedVideos)  ? r.watchedVideos  : [],
        completedTests: Array.isArray(r.completedTests) ? r.completedTests : [],
    };
}

function saveUserPoints(userId, data) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user && user.id === userId && user.name) data.userName = user.name;

    const all = _getAll();
    all[userId] = data;
    _setAll(all);

    // Sync to Upstash (non-blocking)
    if (typeof upstash !== 'undefined' && upstash) {
        upstash.set('userPoints', all, 86400 * 30)
            .then(() => console.log('✅ userPoints → Upstash'))
            .catch(e => console.warn('userPoints sync:', e));
    }

    _buildLeaderboard(all);

    // Notify UI (dashboard, success page)
    window.dispatchEvent(new CustomEvent('points:updated', { detail: { userId, total: data.total } }));
}

function _addEntry(data, amount, reason) {
    data.total = (data.total || 0) + amount;
    if (!Array.isArray(data.history)) data.history = [];
    const d = new Date();
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    data.history.unshift({
        amount, reason,
        date: `${dd}.${mm}.${d.getFullYear()}`,
        time: d.toLocaleTimeString('az-AZ'),
        timestamp: Date.now()
    });
    if (data.history.length > 50) data.history.length = 50;
}

function _toast(amount, reason) {
    if (typeof showNotification === 'function') {
        showNotification(`+${amount} xal qazandınız! (${reason})`, 'success', 3000);
        return;
    }
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:99999;
        background:linear-gradient(135deg,#fbbf24,#f59e0b);color:white;
        padding:14px 20px;border-radius:12px;font-weight:700;font-size:15px;
        box-shadow:0 4px 15px rgba(245,158,11,.4);`;
    t.textContent = `+${amount} xal! ${reason}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ── Video ─────────────────────────────────────────────────────────────────────
function awardVideoPoints(videoId, videoTitle, watchedPercent) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const data = getUserPoints(user.id);
    if (data.watchedVideos.includes(String(videoId))) return;

    const pct = watchedPercent || 100;
    let points = 0, label = '';
    if      (pct >= 80) { points = POINTS_CONFIG.videoFull; label = 'tam izləndi'; }
    else if (pct >= 40) { points = POINTS_CONFIG.videoHalf; label = 'yarı izləndi'; }
    else if (pct >= 10) { points = POINTS_CONFIG.videoMin;  label = 'qismən izləndi'; }
    else return;

    const reason = `"${videoTitle}" videosu ${label}`;
    data.watchedVideos.push(String(videoId));
    _addEntry(data, points, reason);
    saveUserPoints(user.id, data);
    _toast(points, reason);
}

// ── Test ──────────────────────────────────────────────────────────────────────
function awardTestPoints(testTitle, score, total, testId) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return 0;

    const data = getUserPoints(user.id);
    if (testId && data.completedTests.includes(String(testId))) return 0;

    const pct = Math.round((score / total) * 100);
    let points = POINTS_CONFIG.testFail, label = 'Zəif';
    if      (pct === 100) { points = POINTS_CONFIG.testPerfect; label = 'Mükəmməl'; }
    else if (pct >= 80)   { points = POINTS_CONFIG.testGood;    label = 'Yaxşı'; }
    else if (pct >= 60)   { points = POINTS_CONFIG.testPass;    label = 'Keçid'; }

    const reason = `"${testTitle}" — ${pct}% (${label})`;
    if (testId) data.completedTests.push(String(testId));
    _addEntry(data, points, reason);
    saveUserPoints(user.id, data);
    _toast(points, reason);
    return points;
}

// ── Daily login ───────────────────────────────────────────────────────────────
// Use a session-level key stored in sessionStorage so it resets per browser tab
// but NOT per page navigation within the same tab.
// The actual date check uses Upstash-loaded lastLoginDate.

function awardDailyLoginPoints() {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    // Session guard — only award once per browser session (tab)
    const sessionKey = `dailyLogin_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    const data = getUserPoints(user.id);
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Normalize stored date
    let stored = data.lastLoginDate || null;
    if (stored && stored.length > 10) stored = new Date(stored).toISOString().slice(0, 10);

    if (stored === todayKey) {
        // Already awarded today — mark session so we don't check again
        sessionStorage.setItem(sessionKey, '1');
        return;
    }

    // Mark session immediately to prevent double-award on fast re-renders
    sessionStorage.setItem(sessionKey, '1');

    data.lastLoginDate = todayKey;
    _addEntry(data, POINTS_CONFIG.dailyLogin, 'Gündəlik giriş');
    saveUserPoints(user.id, data);
    _toast(POINTS_CONFIG.dailyLogin, 'Gündəlik giriş');
    console.log(`✅ +${POINTS_CONFIG.dailyLogin} xal — gündəlik giriş`);
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function _buildLeaderboard(allPoints) {
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const lb = Object.values(allPoints)
        .map(p => {
            const u = allUsers.find(u => String(u.id) === String(p.userId));
            return {
                userId:       p.userId,
                userName:     u ? u.name : (p.userName || 'İstifadəçi'),
                premium:      u ? !!u.premium : false,
                total:        p.total || 0,
                watchedCount: (p.watchedVideos  || []).length,
                testCount:    (p.completedTests || []).length,
            };
        })
        .filter(p => p.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 50);

    localStorage.setItem('leaderboard', JSON.stringify(lb));
    if (typeof upstash !== 'undefined' && upstash) {
        upstash.set('leaderboard', lb, 86400 * 30).catch(() => {});
    }
    return lb;
}

function updateLeaderboard() { _buildLeaderboard(_getAll()); }

async function getLeaderboard() {
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const c = await upstash.get('leaderboard');
            if (c && c.length) return c;
        } catch (e) {}
    }
    return JSON.parse(localStorage.getItem('leaderboard') || '[]');
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Run awardDailyLoginPoints only after Upstash data is loaded (so lastLoginDate is fresh)
if (typeof window !== 'undefined') {
    window.addEventListener('upstash:loaded', () => {
        setTimeout(awardDailyLoginPoints, 100);
    });
    // Fallback: Upstash disabled
    window.addEventListener('load', () => {
        if (typeof UPSTASH_CONFIG !== 'undefined' && !UPSTASH_CONFIG.enabled) {
            setTimeout(awardDailyLoginPoints, 300);
        }
    });
}

console.log('🏆 Points sistemi yükləndi');
