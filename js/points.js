/**
 * Points (Xal) Sistemi - Bizim Riyaziyyat
 */

const POINTS_CONFIG = {
    videoWatch:  10,
    testPerfect: 50,
    testGood:    30,
    testPass:    15,
    testFail:     5,
    dailyLogin:   2,
};

// ==================== CORE ====================

function getUserPoints(userId) {
    const all = Storage.get('userPoints') || {};
    const defaults = {
        userId, total: 0, history: [],
        watchedVideos: [], completedTests: [], lastLoginDate: null
    };
    if (!all[userId]) return defaults;
    const rec = all[userId];
    return {
        ...defaults,
        ...rec,
        history:        Array.isArray(rec.history)        ? rec.history        : [],
        watchedVideos:  Array.isArray(rec.watchedVideos)  ? rec.watchedVideos  : [],
        completedTests: Array.isArray(rec.completedTests) ? rec.completedTests : [],
    };
}

// Single write — always call this, never call Storage.set('userPoints') directly
function saveUserPoints(userId, data) {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user && user.id === userId && user.name) data.userName = user.name;

    const all = Storage.get('userPoints') || {};
    all[userId] = data;
    // Write to localStorage immediately
    localStorage.setItem('userPoints', JSON.stringify(all));
    // Flush to Upstash (async, non-blocking)
    if (typeof upstash !== 'undefined' && upstash) {
        upstash.set('userPoints', all, 86400 * 30)
            .then(() => console.log('✅ userPoints → Upstash'))
            .catch(e => console.warn('userPoints flush error:', e));
    }
    // Update leaderboard in background
    _updateLeaderboardAsync(all);
    // Notify any listeners that points changed (e.g. dashboard UI)
    window.dispatchEvent(new CustomEvent('points:updated', { detail: { userId, data } }));
}

// Add points + history entry in ONE write
function addPoints(userId, userName, amount, reason) {
    const data = getUserPoints(userId);
    data.total = (data.total || 0) + amount;
    data.history.unshift({
        amount, reason,
        date: new Date().toLocaleDateString('az-AZ'),
        time: new Date().toLocaleTimeString('az-AZ'),
        timestamp: Date.now()
    });
    if (data.history.length > 50) data.history.length = 50;

    saveUserPoints(userId, data);
    _showPointsToast(amount, reason);
    console.log(`✅ +${amount} xal: ${userName} — ${reason}`);
    return data.total;
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

function awardVideoPoints(videoId, videoTitle) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const data = getUserPoints(user.id);
    if (data.watchedVideos.includes(String(videoId))) {
        console.log('Video artıq izlənib, xal verilmir');
        return;
    }

    // Mark watched + add points in ONE combined write
    data.watchedVideos.push(String(videoId));
    data.total = (data.total || 0) + POINTS_CONFIG.videoWatch;
    data.history.unshift({
        amount: POINTS_CONFIG.videoWatch,
        reason: `"${videoTitle}" videosu izləndi`,
        date: new Date().toLocaleDateString('az-AZ'),
        time: new Date().toLocaleTimeString('az-AZ'),
        timestamp: Date.now()
    });
    if (data.history.length > 50) data.history.length = 50;

    saveUserPoints(user.id, data);
    _showPointsToast(POINTS_CONFIG.videoWatch, `"${videoTitle}" videosu izləndi`);
    console.log(`✅ +${POINTS_CONFIG.videoWatch} xal: ${user.name} — video`);
}

// ==================== TEST ====================

function awardTestPoints(testTitle, score, total, testId) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return 0;

    const data = getUserPoints(user.id);

    // Only award once per test
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

    // Mark completed + add points in ONE combined write
    if (testId) data.completedTests.push(String(testId));
    data.total = (data.total || 0) + points;
    data.history.unshift({
        amount: points, reason,
        date: new Date().toLocaleDateString('az-AZ'),
        time: new Date().toLocaleTimeString('az-AZ'),
        timestamp: Date.now()
    });
    if (data.history.length > 50) data.history.length = 50;

    saveUserPoints(user.id, data);
    _showPointsToast(points, reason);
    console.log(`✅ +${points} xal: ${user.name} — ${reason}`);
    return points;
}

// ==================== DAILY LOGIN ====================

let _dailyLoginAwarded = false;

function awardDailyLoginPoints() {
    if (_dailyLoginAwarded) return;
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const data = getUserPoints(user.id);
    const todayKey = new Date().toISOString().slice(0, 10); // "2026-05-26"

    // Normalize any old format
    let storedKey = data.lastLoginDate || null;
    if (storedKey && storedKey.length > 10) {
        storedKey = new Date(storedKey).toISOString().slice(0, 10);
    }

    if (storedKey === todayKey) {
        console.log('Gündəlik giriş xalı artıq verilib');
        return;
    }

    _dailyLoginAwarded = true;

    // Update lastLoginDate + add points in ONE write
    data.lastLoginDate = todayKey;
    data.total = (data.total || 0) + POINTS_CONFIG.dailyLogin;
    data.history.unshift({
        amount: POINTS_CONFIG.dailyLogin,
        reason: 'Gündəlik giriş',
        date: new Date().toLocaleDateString('az-AZ'),
        time: new Date().toLocaleTimeString('az-AZ'),
        timestamp: Date.now()
    });
    if (data.history.length > 50) data.history.length = 50;

    saveUserPoints(user.id, data);
    _showPointsToast(POINTS_CONFIG.dailyLogin, 'Gündəlik giriş');
    console.log(`✅ +${POINTS_CONFIG.dailyLogin} xal: ${user.name} — gündəlik giriş`);
}

// ==================== LEADERBOARD ====================

function _updateLeaderboardAsync(allPoints) {
    // Run after current call stack to avoid blocking
    setTimeout(() => {
        const allUsers = Storage.get('allUsers') || [];
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
    }, 0);
}

// Keep for backward compat
function updateLeaderboard() {
    const allPoints = Storage.get('userPoints') || {};
    _updateLeaderboardAsync(allPoints);
}

async function getLeaderboard() {
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const cloud = await upstash.get('leaderboard');
            if (cloud && cloud.length) return cloud;
        } catch (e) {}
    }
    return Storage.get('leaderboard') || [];
}

// ==================== INIT ====================

function _initPoints() {
    setTimeout(awardDailyLoginPoints, 300);
}

if (typeof window !== 'undefined') {
    // Primary: after Upstash loads fresh data
    window.addEventListener('upstash:loaded', _initPoints);
    // Fallback: if Upstash disabled or event never fires
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (!_dailyLoginAwarded) awardDailyLoginPoints();
        }, 1500);
    });
}

console.log('🏆 Points sistemi yükləndi');
