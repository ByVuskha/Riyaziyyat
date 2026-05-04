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
        if (balanceBadge) balanceBadge.style.display = 'flex';
        if (navUserName) navUserName.textContent = user.name;
        if (balanceAmount) balanceAmount.textContent = user.balance || 0;
        
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

// Generate unique device ID
function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

// Check if user is logged in on another device
function checkDeviceSession(userId) {
    const sessions = Storage.get('userSessions') || {};
    const currentDeviceId = getDeviceId();
    const userSession = sessions[userId];
    
    if (userSession && userSession.deviceId !== currentDeviceId) {
        return {
            isActive: true,
            deviceId: userSession.deviceId,
            loginTime: userSession.loginTime
        };
    }
    
    return { isActive: false };
}

// Set device session for user
function setDeviceSession(userId) {
    const sessions = Storage.get('userSessions') || {};
    const currentDeviceId = getDeviceId();
    
    sessions[userId] = {
        deviceId: currentDeviceId,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };
    
    Storage.set('userSessions', sessions);
    console.log(`🔒 Cihaz sessiyası yaradıldı: User ${userId}, Device ${currentDeviceId}`);
}

// Clear device session
function clearDeviceSession(userId) {
    const sessions = Storage.get('userSessions') || {};
    delete sessions[userId];
    Storage.set('userSessions', sessions);
}

// Login function with device restriction and activity logging
function login(email, password) {
    // Get all users from storage
    const allUsers = Storage.get('allUsers') || MOCK_USERS;
    
    const user = allUsers.find(u => u.email === email && u.password === password);
    if (!user) {
        return { success: false, message: 'Email və ya şifrə yanlışdır' };
    }
    
    // Check if user is logged in on another device
    const deviceCheck = checkDeviceSession(user.id);
    
    if (deviceCheck.isActive) {
        const confirm = window.confirm(
            '⚠️ Diqqət!\n\n' +
            'Bu hesab başqa bir cihazda aktiv vəziyyətdədir.\n\n' +
            'Davam etsəniz, digər cihazdan çıxış ediləcək.\n\n' +
            'Davam etmək istəyirsiniz?'
        );
        
        if (!confirm) {
            return { success: false, message: 'Giriş ləğv edildi' };
        }
        
        console.log('⚠️ Digər cihazdan çıxış edilir...');
    }
    
    // Set new device session
    setDeviceSession(user.id);
    
    const { password: _, ...safeUser } = user;
    Storage.set('currentUser', safeUser);
    
    // Log activity
    logActivity(user.name, 'Sistemə giriş etdi');
    
    return { success: true, user: safeUser };
}

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
        balance: 0, 
        demoTests: 0,
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
            title: 'Müəllim', // Default title
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
