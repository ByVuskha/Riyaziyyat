// Auth state
function getCurrentUser() {
    return Storage.get('currentUser');
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function logout() {
    const user = getCurrentUser();
    if (user) {
        clearDeviceSession(user.id);
    }
    Storage.remove('currentUser');
    window.location.href = 'index.html';
}

// Update navbar based on auth state
function updateNavbar() {
    const user = getCurrentUser();
    const guestButtons = document.getElementById('guestButtons');
    const userButtons = document.getElementById('userButtons');
    const balanceBadge = document.getElementById('balanceBadge');
    const navUserName = document.getElementById('navUserName');
    const balanceAmount = document.getElementById('balanceAmount');

    if (user) {
        if (guestButtons) guestButtons.style.display = 'none';
        if (userButtons) userButtons.style.display = 'flex';
        
        // Show premium badge instead of balance
        if (balanceBadge) {
            if (user.premium) {
                balanceBadge.style.display = 'flex';
                balanceBadge.innerHTML = '<i class="fas fa-crown"></i> Premium';
                balanceBadge.style.background = 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)';
            } else {
                balanceBadge.style.display = 'none';
            }
        }
        
        if (navUserName) navUserName.textContent = user.name;
        
        // Show admin link if user is admin
        if (user.role === 'admin') {
            const navbarMenu = document.querySelector('.navbar-menu');
            if (navbarMenu && !document.getElementById('adminNavLink')) {
                const adminLink = document.createElement('a');
                adminLink.href = 'admin.html';
                adminLink.id = 'adminNavLink';
                adminLink.innerHTML = '<i class="fas fa-shield-alt"></i> Admin';
                adminLink.style.color = '#ef4444';
                adminLink.style.fontWeight = '600';
                navbarMenu.appendChild(adminLink);
            }
        }
    } else {
        if (guestButtons) guestButtons.style.display = 'flex';
        if (userButtons) userButtons.style.display = 'none';
        if (balanceBadge) balanceBadge.style.display = 'none';
        
        // Remove admin link if exists
        const adminLink = document.getElementById('adminNavLink');
        if (adminLink) adminLink.remove();
    }
}

// Generate unique device ID (stored in cookie for cross-tab sharing)
function getDeviceId() {
    // Check cookie first
    let deviceId = getCookie('deviceId');
    
    if (!deviceId) {
        // Check localStorage as fallback
        deviceId = localStorage.getItem('deviceId');
        
        if (!deviceId) {
            // Generate new device ID
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        
        // Save to both cookie and localStorage
        setCookie('deviceId', deviceId, 365); // 1 year
        localStorage.setItem('deviceId', deviceId);
    }
    
    return deviceId;
}

// Cookie helper functions
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/;SameSite=Strict';
}

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';
}

// Check if user is logged in on another device
async function checkDeviceSession(userId) {
    const currentDeviceId = getDeviceId();
    
    // Check from Upstash (cloud)
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const sessionKey = `user_session:${userId}`;
            const cloudSession = await upstash.get(sessionKey);
            
            if (cloudSession && cloudSession.deviceId !== currentDeviceId) {
                console.log('🔍 Device conflict detected in Upstash:', cloudSession.deviceId);
                return {
                    isActive: true,
                    deviceId: cloudSession.deviceId,
                    loginTime: cloudSession.loginTime,
                    attempts: cloudSession.loginAttempts || 0
                };
            }
        } catch (error) {
            console.error('Upstash check failed:', error);
        }
    }
    
    // Fallback to LocalStorage
    const sessions = Storage.get('userSessions') || {};
    const userSession = sessions[userId];
    
    if (userSession && userSession.deviceId !== currentDeviceId) {
        return {
            isActive: true,
            deviceId: userSession.deviceId,
            loginTime: userSession.loginTime,
            attempts: userSession.loginAttempts || 0
        };
    }
    
    return { isActive: false };
}

// Synchronous version for immediate check
function checkDeviceSessionSync(userId) {
    const sessions = Storage.get('userSessions') || {};
    const currentDeviceId = getDeviceId();
    const userSession = sessions[userId];
    
    if (userSession && userSession.deviceId !== currentDeviceId) {
        return {
            isActive: true,
            deviceId: userSession.deviceId,
            loginTime: userSession.loginTime,
            attempts: userSession.loginAttempts || 0
        };
    }
    
    return { isActive: false };
}

// Record unauthorized login attempt
async function recordUnauthorizedAttempt(userId, userName, email) {
    const currentDeviceId = getDeviceId();
    
    // Get current session from Upstash
    let attempts = 1;
    
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const sessionKey = `user_session:${userId}`;
            const session = await upstash.get(sessionKey);
            
            if (session) {
                attempts = (session.loginAttempts || 0) + 1;
                session.loginAttempts = attempts;
                session.lastAttempt = new Date().toISOString();
                session.lastAttemptDevice = currentDeviceId;
                
                // Update in Upstash
                await upstash.set(sessionKey, session, 86400 * 7);
                console.log(`⚠️ Yetkisiz cəhd qeydə alındı: User ${userId}, Cəhd ${attempts}`);
            }
        } catch (error) {
            console.error('Failed to record attempt in Upstash:', error);
        }
    }
    
    // Also update LocalStorage
    const sessions = Storage.get('userSessions') || {};
    const userSession = sessions[userId] || {};
    userSession.loginAttempts = attempts;
    userSession.lastAttempt = new Date().toISOString();
    sessions[userId] = userSession;
    Storage.set('userSessions', sessions);
    
    // Add to suspicious activities
    const suspicious = Storage.get('suspiciousActivities') || [];
    suspicious.unshift({
        id: Date.now(),
        userId: userId,
        userName: userName,
        email: email,
        activity: 'Yetkisiz cihazdan giriş cəhdi',
        attempts: attempts,
        deviceId: currentDeviceId,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString('az-AZ'),
        time: new Date().toLocaleTimeString('az-AZ'),
        status: attempts >= 2 ? 'blocked' : 'warning'
    });
    
    // Keep only last 100 activities
    if (suspicious.length > 100) {
        suspicious.length = 100;
    }
    
    Storage.set('suspiciousActivities', suspicious);
    
    // If 2nd attempt, freeze account
    if (attempts >= 2) {
        await freezeAccount(userId);
    }
    
    return attempts;
}

// Freeze account (block + clear balance)
async function freezeAccount(userId) {
    const allUsers = Storage.get('allUsers') || [];
    const user = allUsers.find(u => u.id === userId);
    
    if (user) {
        user.frozen = true;
        user.frozenAt = new Date().toISOString();
        user.frozenReason = 'Yetkisiz cihazdan təkrar giriş cəhdi';
        user.balanceBeforeFreeze = user.balance || 0;
        user.balance = 0; // Clear balance
        
        Storage.set('allUsers', allUsers);
        
        // Also save to Upstash
        if (typeof upstash !== 'undefined' && upstash) {
            try {
                await upstash.set('allUsers', allUsers, 86400 * 30); // 30 days
                console.log(`🚫 Hesab donduruldu və Upstash-a yazıldı: User ${userId}`);
            } catch (error) {
                console.error('Failed to sync frozen account to Upstash:', error);
            }
        }
        
        console.log(`🚫 Hesab donduruldu: User ${userId}`);
        
        // Log activity
        logActivity(user.name, 'Hesab donduruldu (təhlükəsizlik)', 'blocked');
    }
}

// Unfreeze account (admin only)
function unfreezeAccount(userId) {
    const allUsers = Storage.get('allUsers') || [];
    const user = allUsers.find(u => u.id === userId);
    
    if (user && user.frozen) {
        user.frozen = false;
        user.unfrozenAt = new Date().toISOString();
        user.unfrozenBy = getCurrentUser()?.name || 'Admin';
        // Balance is NOT restored automatically
        
        // Reset login attempts
        const sessions = Storage.get('userSessions') || {};
        if (sessions[userId]) {
            sessions[userId].loginAttempts = 0;
            Storage.set('userSessions', sessions);
        }
        
        Storage.set('allUsers', allUsers);
        
        console.log(`✅ Hesab açıldı: User ${userId}`);
        logActivity(user.name, 'Hesab açıldı (admin tərəfindən)', 'success');
        
        return true;
    }
    
    return false;
}

// Authorize new device (admin only)
function authorizeNewDevice(userId, newDeviceId) {
    const sessions = Storage.get('userSessions') || {};
    
    sessions[userId] = {
        deviceId: newDeviceId,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        loginAttempts: 0,
        authorizedBy: getCurrentUser()?.name || 'Admin',
        authorizedAt: new Date().toISOString()
    };
    
    Storage.set('userSessions', sessions);
    
    console.log(`✅ Yeni cihaz icazə verildi: User ${userId}, Device ${newDeviceId}`);
    
    return true;
}

// Set device session for user
async function setDeviceSession(userId) {
    const currentDeviceId = getDeviceId();
    
    const sessionData = {
        deviceId: currentDeviceId,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        loginAttempts: 0
    };
    
    // Save to LocalStorage
    const sessions = Storage.get('userSessions') || {};
    sessions[userId] = sessionData;
    Storage.set('userSessions', sessions);
    
    // Save to Upstash (cloud) - individual key per user
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const sessionKey = `user_session:${userId}`;
            await upstash.set(sessionKey, sessionData, 86400 * 7); // 7 days TTL
            console.log(`🔒 Cihaz sessiyası Upstash-a yazıldı: User ${userId}, Device ${currentDeviceId}`);
        } catch (error) {
            console.error('Failed to sync session to Upstash:', error);
        }
    }
    
    console.log(`🔒 Cihaz sessiyası yaradıldı: User ${userId}, Device ${currentDeviceId}`);
}

// Clear device session
function clearDeviceSession(userId) {
    const sessions = Storage.get('userSessions') || {};
    delete sessions[userId];
    Storage.set('userSessions', sessions);
}

// Login function with device restriction and activity logging
async function loginAsync(email, password, onDeviceConflict) {
    // Get all users from storage
    const allUsers = Storage.get('allUsers') || MOCK_USERS;
    
    const user = allUsers.find(u => u.email === email && u.password === password);
    if (!user) {
        return { success: false, message: 'Email və ya şifrə yanlışdır' };
    }
    
    // Check if account is frozen
    if (user.frozen) {
        return { 
            success: false, 
            frozen: true,
            message: '🚫 Hesabınız dondurulub!\n\nSəbəb: Yetkisiz cihazdan təkrar giriş cəhdi.\n\nHesabınızı açmaq üçün admin ilə əlaqə saxlayın.'
        };
    }
    
    // Check if user is logged in on another device (async check with Upstash)
    const deviceCheck = await checkDeviceSession(user.id);
    
    if (deviceCheck.isActive) {
        // Record unauthorized attempt
        const attempts = recordUnauthorizedAttempt(user.id, user.name, user.email);
        
        // If this is 2nd or more attempt, account is now frozen
        if (attempts >= 2) {
            return {
                success: false,
                frozen: true,
                message: '🚫 HESAB DONDURULDU!\n\n' +
                         'Təkrar yetkisiz giriş cəhdi aşkar edildi.\n\n' +
                         '⚠️ Hesabınız təhlükəsizlik məqsədilə donduruldu.\n' +
                         '💰 Balansınız təmizləndi.\n\n' +
                         'Hesabınızı açmaq üçün admin ilə əlaqə saxlayın.'
            };
        }
        
        // First attempt - show warning
        return { 
            success: false, 
            deviceConflict: true,
            attempts: attempts,
            user: user,
            message: '⚠️ XƏBƏRDARLIQ!\n\n' +
                     'Bu hesab başqa bir cihazda aktivdir.\n\n' +
                     '🚫 Yenidən cəhd etsəniz:\n' +
                     '• Hesabınız DONDURULACAQ\n' +
                     '• Balansınız SİLİNƏCƏK\n' +
                     '• Admin icazəsi tələb olunacaq\n\n' +
                     'Davam etmək istəyirsiniz?'
        };
    }
    
    // Set new device session
    setDeviceSession(user.id);
    
    const { password: _, ...safeUser } = user;
    Storage.set('currentUser', safeUser);
    
    // Log activity
    logActivity(user.name, 'Sistemə giriş etdi');
    
    return { success: true, user: safeUser };
}

// Synchronous login (fallback)
function login(email, password, onDeviceConflict) {
    // Get all users from storage
    const allUsers = Storage.get('allUsers') || MOCK_USERS;
    
    const user = allUsers.find(u => u.email === email && u.password === password);
    if (!user) {
        return { success: false, message: 'Email və ya şifrə yanlışdır' };
    }
    
    // Check if account is frozen
    if (user.frozen) {
        return { 
            success: false, 
            frozen: true,
            message: '🚫 Hesabınız dondurulub!\n\nSəbəb: Yetkisiz cihazdan təkrar giriş cəhdi.\n\nHesabınızı açmaq üçün admin ilə əlaqə saxlayın.'
        };
    }
    
    // Check if user is logged in on another device (sync check)
    const deviceCheck = checkDeviceSessionSync(user.id);
    
    if (deviceCheck.isActive) {
        // Record unauthorized attempt
        const attempts = recordUnauthorizedAttempt(user.id, user.name, user.email);
        
        // If this is 2nd or more attempt, account is now frozen
        if (attempts >= 2) {
            return {
                success: false,
                frozen: true,
                message: '🚫 HESAB DONDURULDU!\n\n' +
                         'Təkrar yetkisiz giriş cəhdi aşkar edildi.\n\n' +
                         '⚠️ Hesabınız təhlükəsizlik məqsədilə donduruldu.\n' +
                         '💰 Balansınız təmizləndi.\n\n' +
                         'Hesabınızı açmaq üçün admin ilə əlaqə saxlayın.'
            };
        }
        
        // First attempt - show warning
        return { 
            success: false, 
            deviceConflict: true,
            attempts: attempts,
            user: user,
            message: '⚠️ XƏBƏRDARLIQ!\n\n' +
                     'Bu hesab başqa bir cihazda aktivdir.\n\n' +
                     '🚫 Yenidən cəhd etsəniz:\n' +
                     '• Hesabınız DONDURULACAQ\n' +
                     '• Balansınız SİLİNƏCƏK\n' +
                     '• Admin icazəsi tələb olunacaq\n\n' +
                     'Davam etmək istəyirsiniz?'
        };
    }
    
    // Set new device session
    setDeviceSession(user.id);
    
    const { password: _, ...safeUser } = user;
    Storage.set('currentUser', safeUser);
    
    // Log activity
    logActivity(user.name, 'Sistemə giriş etdi');
    
    return { success: true, user: safeUser };
}

// Force login is now REMOVED - no longer allowed
// Users cannot force login from another device

// Helper function to log activity
function logActivity(user, action, status = 'success') {
    const activities = Storage.get('activities') || [];
    
    const activity = {
        id: Date.now(),
        user: user,
        action: action,
        date: new Date().toLocaleDateString('az-AZ'),
        timestamp: new Date().toISOString(),
        status: status
    };
    
    activities.unshift(activity);
    
    // Keep only last 100 activities
    if (activities.length > 100) {
        activities.length = 100;
    }
    
    Storage.set('activities', activities);
}

// Register function with device session and activity logging
function register(name, email, password, userType = 'student') {
    // Get all users from storage
    const allUsers = Storage.get('allUsers') || MOCK_USERS;
    
    const exists = allUsers.find(u => u.email === email);
    if (exists) return { success: false, message: 'Bu email artıq qeydiyyatdadır' };

    const newUser = {
        id: allUsers.length + 1,
        name, 
        email, 
        role: 'user', 
        userType: userType, // 'student' or 'teacher'
        premium: false, // Premium status
        premiumRequestedAt: null,
        premiumActivatedAt: null,
        premiumExpiresAt: null,
        demoTests: 3, // Free demo tests
        emailVerified: true,
        registeredAt: new Date().toISOString()
    };
    
    // Add to users list with password
    allUsers.push({ ...newUser, password });
    
    // Save all users to storage
    Storage.set('allUsers', allUsers);
    
    // If teacher, add to teachers list
    if (userType === 'teacher') {
        const teachers = Storage.get('teachers') || [];
        const teacherData = {
            id: Date.now(),
            name: name,
            email: email,
            title: 'Müəllim',
            bio: 'Peşəkar riyaziyyat müəllimi',
            subjects: 'Riyaziyyat',
            students: 0,
            rating: 5.0,
            phone: '',
            experience: 0,
            education: '',
            createdAt: new Date().toISOString()
        };
        teachers.push(teacherData);
        Storage.set('teachers', teachers);
        console.log('✅ Müəllim siyahısına əlavə edildi:', teacherData);
    }
    
    // Set device session
    setDeviceSession(newUser.id);
    
    // Set current user (without password)
    Storage.set('currentUser', newUser);
    
    // Log activity
    logActivity(name, 'Yeni qeydiyyat');
    
    return { success: true, user: newUser };
}

// Update user in storage
function updateUser(updates) {
    const user = getCurrentUser();
    if (!user) return false;
    const updatedUser = { ...user, ...updates };
    Storage.set('currentUser', updatedUser);
    updateNavbar();
    return true;
}

// Run on every page
document.addEventListener('DOMContentLoaded', updateNavbar);


// Check device session on every page load
function validateDeviceSession() {
    const user = getCurrentUser();
    if (!user) return;
    
    const deviceCheck = checkDeviceSession(user.id);
    
    if (deviceCheck.isActive) {
        // User is logged in on another device
        alert('⚠️ Hesabınız başqa bir cihazdan daxil olunub.\n\nTəhlükəsizlik məqsədilə bu cihazdan çıxış edilir.');
        logout();
    }
}

// Run device validation on every page
if (typeof window !== 'undefined') {
    window.addEventListener('load', validateDeviceSession);
    
    // Also check periodically (every 30 seconds)
    setInterval(validateDeviceSession, 30000);
}


// ==================== PREMIUM SYSTEM ====================

// Premium packages
const PREMIUM_PACKAGES = {
    monthly: {
        name: '1 Aylıq Premium',
        duration: 30,
        price: 10,
        description: '1 ay ərzində bütün premium məzmuna giriş'
    },
    halfYearly: {
        name: '6 Aylıq Premium',
        duration: 180,
        price: 50,
        description: '6 ay ərzində bütün premium məzmuna giriş',
        discount: '17% endirim'
    },
    yearly: {
        name: '1 İllik Premium',
        duration: 365,
        price: 100,
        description: '1 il ərzində bütün premium məzmuna giriş',
        discount: '17% endirim'
    }
};

// Request premium access with package selection
function requestPremium(packageType = 'monthly') {
    const user = getCurrentUser();
    if (!user) {
        return { success: false, message: 'Giriş etməlisiniz' };
    }
    
    if (user.premium) {
        return { success: false, message: 'Artıq premium üzvlüyünüz var' };
    }
    
    const package = PREMIUM_PACKAGES[packageType];
    if (!package) {
        return { success: false, message: 'Yanlış paket seçimi' };
    }
    
    // Update user
    const allUsers = Storage.get('allUsers') || [];
    const userIndex = allUsers.findIndex(u => u.id === user.id);
    
    if (userIndex !== -1) {
        allUsers[userIndex].premiumRequestedAt = new Date().toISOString();
        allUsers[userIndex].requestedPackage = packageType;
        Storage.set('allUsers', allUsers);
        
        // Update current user
        user.premiumRequestedAt = allUsers[userIndex].premiumRequestedAt;
        user.requestedPackage = packageType;
        Storage.set('currentUser', user);
        
        // Add to premium requests
        const requests = Storage.get('premiumRequests') || [];
        requests.unshift({
            id: Date.now(),
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            packageType: packageType,
            packageName: package.name,
            price: package.price,
            duration: package.duration,
            requestedAt: new Date().toISOString(),
            status: 'pending',
            date: new Date().toLocaleDateString('az-AZ'),
            time: new Date().toLocaleTimeString('az-AZ')
        });
        Storage.set('premiumRequests', requests);
        
        // Log activity
        logActivity(user.name, `Premium müraciət göndərdi (${package.name})`);
        
        return { 
            success: true, 
            message: 'Müraciətiniz göndərildi',
            package: package
        };
    }
    
    return { success: false, message: 'Xəta baş verdi' };
}

// Check if user has premium access
function hasPremiumAccess() {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Check if premium and not expired
    if (user.premium) {
        if (user.premiumExpiresAt) {
            const expiryDate = new Date(user.premiumExpiresAt);
            if (expiryDate > new Date()) {
                return true;
            } else {
                // Premium expired - auto downgrade
                autoDowngradePremium(user.id);
                return false;
            }
        }
        return true; // Lifetime premium (admin special)
    }
    
    return false;
}

// Auto downgrade expired premium
function autoDowngradePremium(userId) {
    const allUsers = Storage.get('allUsers') || [];
    const userIndex = allUsers.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
        allUsers[userIndex].premium = false;
        allUsers[userIndex].premiumExpiredAt = new Date().toISOString();
        Storage.set('allUsers', allUsers);
        
        // Update current user if logged in
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            currentUser.premium = false;
            currentUser.premiumExpiredAt = allUsers[userIndex].premiumExpiredAt;
            Storage.set('currentUser', currentUser);
        }
        
        console.log(`⏰ Premium müddəti bitdi: User ${userId}`);
        logActivity(allUsers[userIndex].name, 'Premium müddəti bitdi', 'warning');
    }
}

// Get premium status text
function getPremiumStatusText() {
    const user = getCurrentUser();
    if (!user) return 'Giriş edin';
    
    if (user.premium) {
        if (user.premiumExpiresAt) {
            const expiryDate = new Date(user.premiumExpiresAt);
            const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            
            if (daysLeft > 0) {
                return `Premium (${daysLeft} gün qalıb)`;
            } else {
                return 'Premium bitib';
            }
        }
        return 'Premium (Ömürlük)';
    }
    
    if (user.premiumRequestedAt) {
        const package = PREMIUM_PACKAGES[user.requestedPackage];
        return `Müraciət göndərilib (${package ? package.name : 'Premium'})`;
    }
    
    return 'Pulsuz';
}

// Get days until premium expires
function getPremiumDaysLeft() {
    const user = getCurrentUser();
    if (!user || !user.premium || !user.premiumExpiresAt) return null;
    
    const expiryDate = new Date(user.premiumExpiresAt);
    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    
    return daysLeft > 0 ? daysLeft : 0;
}
