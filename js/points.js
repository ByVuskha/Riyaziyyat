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
    const defaults = { userId, total: 0, history: [], watchedVideos: [], completedTests: [], lastLoginDate: null };
    if (!all[userId]) return defaults;
    // Merge with defaults to handle old records missing fields
    return {
        ...defaults,
        ...all[userId],
        history:        Array.isArray(all[userId].history)        ? all[userId].history        : [],
        watchedVideos:  Array.isArray(all[userId].watchedVideos)  ? all[userId].watchedVideos  : [],
        completedTests: Array.isArray(all[userId].completedTests) ? all[userId].completedTests : [],
    };
}

function saveUserPoints(userId, data) {
    // Store userName in points data so leaderboard works cross-device
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if (user && user.id === userId && user.name) {
        data.userName = user.name;
    }

    const all = Storage.get('userPoints') || {};
    all[userId] = data;
    Storage.set('userPoints', all);

    if (typeof Storage.flush === 'function') Storage.flush('userPoints');
    updateLeaderboard();
}

function addPoints(userId, userName, amount, reason) {
    const data = getUserPoints(userId);
    data.total = (data.total || 0) + amount;
    if (!Array.isArray(data.history)) data.history = [];
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
    if (!Array.isArray(data.watchedVideos)) data.watchedVideos = [];
    if (data.watchedVideos.includes(String(videoId))) return;

    data.watchedVideos.push(String(videoId));
    saveUserPoints(user.id, data);
    addPoints(user.id, user.name, POINTS_CONFIG.videoWatch, `"${videoTitle}" videosu izləndi`);
}

// ==================== TEST ====================

function awardTestPoints(testTitle, score, total, testId) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return 0;

    const data = getUserPoints(user.id);
    if (!Array.isArray(data.completedTests)) data.completedTests = [];

    // Only award once per test
    if (testId && data.completedTests.includes(String(testId))) {
        console.log('Bu sınaqdan artıq xal qazanılıb');
        return 0;
    }

    const pct = Math.round((score / total) * 100);
    let points = POINTS_CONFIG.testFail;
    let label = 'Zəif';

    if (pct === 100)      { points = POINTS_CONFIG.testPerfect; label = 'Mükəmməl'; }
    else if (pct >= 80)   { points = POINTS_CONFIG.testGood;    label = 'Yaxşı'; }
    else if (pct >= 60)   { points = POINTS_CONFIG.testPass;    label = 'Keçid'; }

    if (testId) data.completedTests.push(String(testId));
    saveUserPoints(user.id, data);

    addPoints(user.id, user.name, points, `"${testTitle}" — ${pct}% (${label})`);
    return points;
}

// ==================== DAILY LOGIN ====================

let _dailyLoginAwarded = false; // Prevent double-award within same page load

function awardDailyLoginPoints() {
    if (_dailyLoginAwarded) return;
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const data = getUserPoints(user.id);
    const today = new Date().toDateString(); // e.g. "Tue May 05 2026"

    // Normalize stored date — old records may use ISO format
    let storedDate = data.lastLoginDate;
    if (storedDate && storedDate.includes('T')) {
        storedDate = new Date(storedDate).toDateString();
    }

    if (storedDate === today) return; // Already awarded today

    _dailyLoginAwarded = true;
    data.lastLoginDate = today;
    saveUserPoints(user.id, data);
    addPoints(user.id, user.name, POINTS_CONFIG.dailyLogin, 'Gündəlik giriş');
}

// ==================== LEADERBOARD ====================

function updateLeaderboard() {
    const allPoints = Storage.get('userPoints') || {};
    const allUsers  = Storage.get('allUsers')   || [];

    const lb = Object.values(allPoints)
        .map(p => {
            const u = allUsers.find(u => u.id === p.userId);
            const name = u ? u.name : (p.userName || 'İstifadəçi');
            return {
                userId:       p.userId,
                userName:     name,
                premium:      u ? (u.premium || false) : false,
                total:        p.total || 0,
                watchedCount: (p.watchedVideos  || []).length,
                testCount:    (p.completedTests || []).length
            };
        })
        .filter(p => p.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 50);

    Storage.set('leaderboard', lb);
    if (typeof Storage.flush === 'function') Storage.flush('leaderboard');
    return lb;
}

async function getLeaderboard() {
    // Fresh from Upstash
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const cloud = await upstash.get('leaderboard');
            if (cloud && cloud.length) return cloud;
        } catch (e) {}
    }
    return Storage.get('leaderboard') || [];
}

// ==================== INIT ====================

// Run after Upstash data is loaded so daily login uses fresh data
function _initPoints() {
    setTimeout(awardDailyLoginPoints, 500);
}

if (typeof window !== 'undefined') {
    window.addEventListener('upstash:loaded', _initPoints);
    // Fallback if Upstash is disabled
    window.addEventListener('load', () => {
        if (typeof UPSTASH_CONFIG === 'undefined' || !UPSTASH_CONFIG.enabled) {
            setTimeout(awardDailyLoginPoints, 800);
        }
    });
}

console.log('🏆 Points sistemi yükləndi');
