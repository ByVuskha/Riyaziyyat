/**
 * Security Module - Bizim Riyaziyyat
 * XSS, CSRF, Input validation, Rate limiting
 */

// ==================== INPUT SANITIZATION ====================

function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

function sanitizeInput(value) {
    if (typeof value !== 'string') return value;
    return value.trim().replace(/[<>\"']/g, '');
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function validatePassword(password) {
    return password && password.length >= 6;
}

function validateName(name) {
    return name && name.trim().length >= 2 && name.trim().length <= 100;
}

// ==================== RATE LIMITING ====================

const rateLimiter = {
    attempts: {},
    
    check(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
        const now = Date.now();
        if (!this.attempts[key]) {
            this.attempts[key] = { count: 0, firstAttempt: now };
        }
        
        const record = this.attempts[key];
        
        // Reset if window expired
        if (now - record.firstAttempt > windowMs) {
            record.count = 0;
            record.firstAttempt = now;
        }
        
        record.count++;
        
        if (record.count > maxAttempts) {
            const waitMs = windowMs - (now - record.firstAttempt);
            const waitMin = Math.ceil(waitMs / 60000);
            return { allowed: false, waitMinutes: waitMin };
        }
        
        return { allowed: true, remaining: maxAttempts - record.count };
    },
    
    reset(key) {
        delete this.attempts[key];
    }
};

// ==================== ADMIN ACCESS GUARD ====================

function requireAdmin() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return false;
    }
    if (user.role !== 'admin') {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ==================== SESSION SECURITY ====================

// Validate session integrity
function validateSession() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Check required fields
    if (!user.id || !user.email || !user.role) {
        console.warn('⚠️ Invalid session data, logging out');
        Storage.remove('currentUser');
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user still exists and is not frozen
    const allUsers = Storage.get('allUsers') || [];
    const dbUser = allUsers.find(u => u.id === user.id);
    
    if (!dbUser) {
        console.warn('⚠️ User not found in database');
        Storage.remove('currentUser');
        window.location.href = 'login.html';
        return;
    }
    
    if (dbUser.frozen) {
        console.warn('⚠️ Account is frozen');
        Storage.remove('currentUser');
        showNotification('Hesabınız dondurulub. Admin ilə əlaqə saxlayın.', 'error', 0);
        setTimeout(() => window.location.href = 'login.html', 3000);
        return;
    }
    
    // Sync premium status from DB
    if (dbUser.premium !== user.premium || dbUser.premiumExpiresAt !== user.premiumExpiresAt) {
        const updated = { ...user, premium: dbUser.premium, premiumExpiresAt: dbUser.premiumExpiresAt };
        Storage.set('currentUser', updated);
    }
}

// ==================== ACTIVE USERS TRACKING ====================

function updateActiveUser() {
    const user = getCurrentUser();
    if (!user) return;
    
    const activeUsers = Storage.get('activeUsers') || {};
    const now = Date.now();
    
    activeUsers[user.id] = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        role: user.role,
        premium: user.premium || false,
        page: window.location.pathname.split('/').pop() || 'index.html',
        lastSeen: now,
        deviceId: localStorage.getItem('deviceId') || 'unknown'
    };
    
    // Clean up users inactive for more than 5 minutes
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    Object.keys(activeUsers).forEach(id => {
        if (activeUsers[id].lastSeen < fiveMinutesAgo) {
            delete activeUsers[id];
        }
    });
    
    // Save to both LocalStorage AND Upstash directly
    Storage.set('activeUsers', activeUsers);
    
    // Force immediate Upstash sync for real-time tracking
    if (typeof upstash !== 'undefined' && upstash) {
        upstash.set('activeUsers', activeUsers, 600).catch(() => {}); // 10 min TTL
    }
}

function removeActiveUser() {
    const user = getCurrentUser();
    if (!user) return;
    
    const activeUsers = Storage.get('activeUsers') || {};
    delete activeUsers[user.id];
    Storage.set('activeUsers', activeUsers);
    
    // Sync removal to Upstash
    if (typeof upstash !== 'undefined' && upstash) {
        upstash.set('activeUsers', activeUsers, 600).catch(() => {});
    }
}

// Track active user on every page
if (typeof window !== 'undefined') {
    // Update on load
    window.addEventListener('load', () => {
        validateSession();
        updateActiveUser();
    });
    
    // Update every 2 minutes
    setInterval(updateActiveUser, 2 * 60 * 1000);
    
    // Remove on page leave
    window.addEventListener('beforeunload', removeActiveUser);
    
    // Update on user activity
    ['click', 'keypress', 'scroll'].forEach(event => {
        document.addEventListener(event, () => {
            const user = getCurrentUser();
            if (user) updateActiveUser();
        }, { passive: true, once: false });
    });
}

console.log('🔒 Security module loaded');
