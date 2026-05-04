/**
 * Points (Xal) System - Bizim Riyaziyyat
 * Video izləmə və sınaq nəticəsinə görə xal
 */

const POINTS_CONFIG = {
    videoWatch: 10,        // Video izləmə üçün xal
    testPerfect: 50,       // 100% sınaq üçün xal
    testGood: 30,          // 80-99% sınaq üçün xal
    testPass: 15,          // 60-79% sınaq üçün xal
    testFail: 5,           // 60%-dən az sınaq üçün xal (cəhd üçün)
    dailyLogin: 2,         // Gündəlik giriş üçün xal
};

// ==================== CORE FUNCTIONS ====================

function getUserPoints(userId) {
    const allPoints = Storage.get('userPoints') || {};
    return allPoints[userId] || {
        userId,
        total: 0,
        history: [],
        watchedVideos: [],
        lastLoginDate: null
    };
}

function saveUserPoints(userId, pointsData) {
    const allPoints = Storage.get('userPoints') || {};
    allPoints[userId] = pointsData;
    Storage.set('userPoints', allPoints);

    // Force Upstash sync
    if (typeof upstash !== 'undefined' && upstash) {
        upstash.set('userPoints', allPoints, 86400 * 90).catch(() => {});
    }

    // Update leaderboard
    updateLeaderboard();
}

function addPoints(userId, userName, amount, reason) {
    const data = getUserPoints(userId);
    data.total = (data.total || 0) + amount;
    data.history = data.history || [];
    data.history.unshift({
        amount,
        reason,
        date: new Date().toLocaleDateString('az-AZ'),
        time: new Date().toLocaleTimeString('az-AZ'),
        timestamp: Date.now()
    });

    // Keep last 50 history entries
    if (data.history.length > 50) data.history.length = 50;

    saveUserPoints(userId, data);

    // Show notification if on page
    if (typeof showNotification === 'function') {
        showNotification(`+${amount} xal qazandınız! (${reason})`, 'success', 3000);
    }

    console.log(`✅ +${amount} xal: ${userName} - ${reason}`);
    return data.total;
}

// ==================== VIDEO POINTS ====================

function awardVideoPoints(videoId, videoTitle) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const data = getUserPoints(user.id);
    data.watchedVideos = data.watchedVideos || [];

    // Only award once per video
    if (data.watchedVideos.includes(String(videoId))) {
        console.log('Video already watched, no points awarded');
        return;
    }

    data.watchedVideos.push(String(videoId));
    saveUserPoints(user.id, data);

    addPoints(user.id, user.name, POINTS_CONFIG.videoWatch, `"${videoTitle}" videosu izləndi`);
}

// ==================== TEST POINTS ====================

function awardTestPoints(testTitle, score, total) {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const percentage = Math.round((score / total) * 100);
    let points = POINTS_CONFIG.testFail;
    let label = 'Zəif';

    if (percentage === 100) {
        points = POINTS_CONFIG.testPerfect;
        label = 'Mükəmməl';
    } else if (percentage >= 80) {
        points = POINTS_CONFIG.testGood;
        label = 'Yaxşı';
    } else if (percentage >= 60) {
        points = POINTS_CONFIG.testPass;
        label = 'Keçid';
    }

    addPoints(user.id, user.name, points, `"${testTitle}" sınağı - ${percentage}% (${label})`);
    return points;
}

// ==================== DAILY LOGIN POINTS ====================

function awardDailyLoginPoints() {
    const user = getCurrentUser();
    if (!user || user.role === 'admin') return;

    const data = getUserPoints(user.id);
    const today = new Date().toDateString();

    if (data.lastLoginDate === today) return; // Already awarded today

    data.lastLoginDate = today;
    saveUserPoints(user.id, data);

    addPoints(user.id, user.name, POINTS_CONFIG.dailyLogin, 'Gündəlik giriş');
}

// ==================== LEADERBOARD ====================

function updateLeaderboard() {
    const allPoints = Storage.get('userPoints') || {};
    const allUsers = Storage.get('allUsers') || [];

    const leaderboard = Object.values(allPoints)
        .map(p => {
            const user = allUsers.find(u => u.id === p.userId);
            return {
                userId: p.userId,
                userName: user ? user.name : 'Naməlum',
                total: p.total || 0,
                watchedCount: (p.watchedVideos || []).length
            };
        })
        .filter(p => p.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 20); // Top 20

    Storage.set('leaderboard', leaderboard);

    if (typeof upstash !== 'undefined' && upstash) {
        upstash.set('leaderboard', leaderboard, 86400 * 7).catch(() => {});
    }

    return leaderboard;
}

async function getLeaderboard() {
    // Try Upstash first
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const cloud = await upstash.get('leaderboard');
            if (cloud) return cloud;
        } catch (e) {}
    }
    return Storage.get('leaderboard') || [];
}

// ==================== INIT ====================

// Award daily login points on page load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        setTimeout(awardDailyLoginPoints, 1000);
    });
}

console.log('🏆 Points system loaded');
