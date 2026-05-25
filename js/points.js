/**
 * Points (Xal) Sistemi - Bizim Riyaziyyat
 * - Gündəlik giriş: 24 saatda 1 dəfə (tarix əsaslı)
 * - Video: izlənmə müddətinə görə, hər videodan 1 dəfə
 * - Sınaq: hər sınaqdan 1 dəfə
 */

const POINTS_CONFIG = {
    videoFull:   10,  // 80%+ izlənibsə
    videoHalf:    5,  // 40-79% izlənibsə
    videoMin:     2,  // 10-39% izlənibsə
    testPerfect: 50,
    testGood:    30,
    testPass:    15,
    testFail:     5,
    dailyLogin:   2,
};

// ==================== HELPERS ====================

// Always read/write directly from localStorage to avoid wrapper timing issues
function _getAll() {
    try { return JSON.parse(localStorage.getItem('userPoints') || '{}'); } catch { return {}; }
}
function _setAll(all) {
    localStorage.setItem('userPoints', JSON.stringify(all));
}

function getUserPoints(userId) {
    const all = _getAll();
    const defaults = { userId, total: 0, history: [], watchedVideos: [], completedTests: [], lastLoginDate: null };
    if (!all[userId]) return defaults;
    const rec = all[userId];
    return {
        ...defaults, ...rec,
        history:        Array.isArray(rec.history)        ? rec.history        : [],
        watchedVideos:  Array.isArray(rec.watchedVideos)  ? rec.watchedVideos  : [],
        completedTests: Array.isArray(rec.completedTests) ? rec.completedTests : [],
    };
}

function saveUserPoints(userId, data) {
    // Store userName for cross-device leaderboard
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user && user.id === userId && user.name) data.userName = user.name;

    const all = _getAll();
    all[userId] = data;
    _setAll(all);

    // Sync to Upstash immediately (non-blocking)
    if (typeof upstash !== 'undefined' && upstash) {
        upstash.set('userPoints', all, 86400 * 30)
            .then(() => console.log('✅ userPoints → Upstash'))
            .catch(e => console.warn('userPoints sync error:', e));
    }

    // Update leaderboard
    _buildAndSaveLeaderboard(all);

    // Notify UI listeners
    window.dispatchEvent(new CustomEvent('points:updated', { detail: { userId, total: data.total } }));
}

function _addHistoryEntry(data, amount, reason) {
    data.total = (data.total || 0) + amount;
    if (!Array.isArray(data.history)) data.history = [];
    data.history.unshift({
        amount, reason,
        date: _formatDate(new Date()),
        time: new Date().toLocaleTimeString('az-AZ'),
        timestamp: Date.now()
    });
    if (data.history.length > 50) data.history.length = 50;
}

function _formatDate(d) {
    // Always DD.MM.YYYY — avoids locale "pil" issue
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

function _showPointsToast(amount, reason) {
    if (typeof showNotification === 'function') {
        showNotification(`+${amount} xal qazandınız! (${reason})`, 'success', 3000);
        return;
    }
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:99999;
        background:linear-gradient(135deg,#fbbf24,#f59e0b);color:white;
        padding:14px 20px;border-radius:12px;font-weight:700;font-size:15px;
        box-shadow:0 4px 15px rgba(245,158,11,0.4);`;
    t.textContent = `+${amount} xal! ${reason}`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ==================== VIDEO ====================

/**
 * Call this when video ends or enough time has passed.
 * watchedPercent: 0-100 (how much of the video was watched)
 */
function awardVideoPoints(videoId, videoTitle, watchedPercent) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const data = getUserPoints(user.id);
    if (data.watchedVideos.includes(String(videoId))) {
        console.log('Video artıq izlənib, xal verilmir');
        return;
    }

    const pct = watchedPercent || 100; // default 100 if not provided (backward compat)
    let points = 0;
    let label = '';

    if (pct >= 80)      { points = POINTS_CONFIG.videoFull; label = 'tam izləndi'; }
    else if (pct >= 40) { points = POINTS_CONFIG.videoHalf; label = 'yarı izləndi'; }
    else if (pct >= 10) { points = POINTS_CONFIG.videoMin;  label = 'qismən izləndi'; }
    else {
        console.log('Video az izləndi, xal verilmir (<10%)');
        return;
    }

    const reason = `"${videoTitle}" videosu ${label}`;
    data.watchedVideos.push(String(videoId));
    _addHistoryEntry(data, points, reason);
    saveUserPoints(user.id, data);
    _showPointsToast(points, reason);
    console.log(`✅ +${points} xal: ${user.name} — ${reason}`);
}

// ==================== TEST ====================

function awardTestPoints(testTitle, score, total, testId) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return 0;

    const data = getUserPoints(user.id);

    if (testId && data.completedTests.includes(String(testId))) {
        console.log('Bu sınaqdan artıq xal qazanılıb');
        return 0;
    }

    const pct = Math.round((score / total) * 100);
    let points = POINTS_CONFIG.testFail;
    let label = 'Zəif';
    if (pct === 100)    { points = POINTS_CONFIG.testPerfect; label = 'Mükəmməl'; }
    else if (pct >= 80) { points = POINTS_CONFIG.testGood;    label = 'Yaxşı'; }
    else if (pct >= 60) { points = POINTS_CONFIG.testPass;    label = 'Keçid'; }

    const reason = `"${testTitle}" — ${pct}% (${label})`;
    if (testId) data.completedTests.push(String(testId));
    _addHistoryEntry(data, points, reason);
    saveUserPoints(user.id, data);
    _showPointsToast(points, reason);
    console.log(`✅ +${points} xal: ${user.name} — ${reason}`);
    return points;
}

// ==================== INIT ====================

// Flag: upstash data has been loaded at least once this page session
let _upstashReady = false;
let _dailyLoginAwarded = false;

function awardDailyLoginPoints() {
    // Only run after Upstash data is loaded — otherwise lastLoginDate may be stale
    if (!_upstashReady) return;
    if (_dailyLoginAwarded) return;
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const data = getUserPoints(user.id);
    const todayKey = new Date().toISOString().slice(0, 10);
    let storedKey = data.lastLoginDate || null;
    if (storedKey && storedKey.length > 10) {
        storedKey = new Date(storedKey).toISOString().slice(0, 10);
    }

    if (storedKey === todayKey) {
        console.log('Gündəlik giriş xalı artıq verilib');
        _dailyLoginAwarded = true;
        return;
    }

    _dailyLoginAwarded = true;
    data.lastLoginDate = todayKey;
    _addHistoryEntry(data, POINTS_CONFIG.dailyLogin, 'Gündəlik giriş');
    saveUserPoints(user.id, data);
    _showPointsToast(POINTS_CONFIG.dailyLogin, 'Gündəlik giriş');
    console.log(`✅ +${POINTS_CONFIG.dailyLogin} xal: ${user.name} — gündəlik giriş`);
}

function _initPoints() {
    _upstashReady = true;
    setTimeout(awardDailyLoginPoints, 100);
}

if (typeof window !== 'undefined') {
    window.addEventListener('upstash:loaded', _initPoints);
    // Fallback only if Upstash is completely disabled
    window.addEventListener('load', () => {
        if (typeof UPSTASH_CONFIG !== 'undefined' && !UPSTASH_CONFIG.enabled) {
            _upstashReady = true;
            setTimeout(awardDailyLoginPoints, 500);
        }
    });
}

function _buildAndSaveLeaderboard(allPoints) {
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    const lb = Object.values(allPoints)
        .map(p => {
            const u = allUsers.find(u => u.id === p.userId);
            return {
                userId:       p.userId,
                userName:     u ? u.name : (p.userName || 'İstifadəçi'),
                premium:      u ? (u.premium || false) : false,
                total:        p.total || 0,
                watchedCount: (p.watchedVideos  || []).length,
                testCount:    (p.completedTests || []).length
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

// backward compat
function updateLeaderboard() { _buildAndSaveLeaderboard(_getAll()); }

async function getLeaderboard() {
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const cloud = await upstash.get('leaderboard');
            if (cloud && cloud.length) return cloud;
        } catch (e) {}
    }
    return JSON.parse(localStorage.getItem('leaderboard') || '[]');
}

// ==================== INIT ====================

function _initPoints() {
    // _upstashReady and awardDailyLoginPoints defined above
    _upstashReady = true;
    setTimeout(awardDailyLoginPoints, 100);
}

if (typeof window !== 'undefined') {
    window.addEventListener('upstash:loaded', _initPoints);
    window.addEventListener('load', () => {
        if (typeof UPSTASH_CONFIG !== 'undefined' && !UPSTASH_CONFIG.enabled) {
            _upstashReady = true;
            setTimeout(awardDailyLoginPoints, 500);
        }
    });
}

console.log('🏆 Points sistemi yükləndi');
