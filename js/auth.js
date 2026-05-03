// Auth state
function getCurrentUser() {
    return Storage.get('currentUser');
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function logout() {
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

// Login function
function login(email, password) {
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (user) {
        const { password: _, ...safeUser } = user;
        Storage.set('currentUser', safeUser);
        return { success: true, user: safeUser };
    }
    return { success: false, message: 'Email və ya şifrə yanlışdır' };
}

// Register function
function register(name, email, password) {
    const exists = MOCK_USERS.find(u => u.email === email);
    if (exists) return { success: false, message: 'Bu email artıq qeydiyyatdadır' };

    const newUser = {
        id: MOCK_USERS.length + 1,
        name, email, role: 'user', balance: 0, demoTests: 0
    };
    MOCK_USERS.push({ ...newUser, password });
    Storage.set('currentUser', newUser);
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
