// Admin Panel JavaScript

// Check admin access
document.addEventListener('DOMContentLoaded', () => {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
        alert('Bu səhifəyə giriş yalnız adminlər üçündür!');
        window.location.href = 'index.html';
        return;
    }
    loadDashboardStats();
    loadUsers();
});

// Show section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    // Show selected section
    document.getElementById(section).classList.add('active');
    
    // Update menu
    document.querySelectorAll('.admin-menu-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.admin-menu-item').classList.add('active');
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        users: 'İstifadəçilər',
        videos: 'Video Dərslər',
        tests: 'Sınaqlar',
        news: 'Xəbərlər',
        payments: 'Ödənişlər',
        settings: 'Tənzimləmələr'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';
    
    // Load data for section
    if (section === 'users') loadUsers();
    if (section === 'videos') loadVideos();
    if (section === 'tests') loadTests();
    if (section === 'news') loadNews();
    if (section === 'payments') loadPayments();
}

// Load Dashboard Stats
function loadDashboardStats() {
    const users = Storage.get('allUsers') || MOCK_USERS;
    const videos = Storage.get('videos') || [];
    const tests = Storage.get('tests') || [];
    const payments = Storage.get('payments') || [];
    
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('totalVideos').textContent = videos.length;
    document.getElementById('totalTests').textContent = tests.length;
    
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    document.getElementById('totalRevenue').textContent = totalRevenue + ' ₼';
    
    // Load activity log
    loadActivityLog();
}

// Load Activity Log
function loadActivityLog() {
    const activities = Storage.get('activities') || [
        { user: 'Tələbə', action: 'Yeni qeydiyyat', date: '2024-01-15', status: 'success' },
        { user: 'Admin', action: 'Video əlavə etdi', date: '2024-01-15', status: 'success' },
        { user: 'Test User', action: 'Balans yüklədi', date: '2024-01-14', status: 'success' }
    ];
    
    const tbody = document.getElementById('activityLog');
    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray);">Fəaliyyət yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = activities.map(a => `
        <tr>
            <td><strong>${a.user}</strong></td>
            <td>${a.action}</td>
            <td>${a.date}</td>
            <td><span class="badge badge-${a.status === 'success' ? 'success' : 'warning'}">${a.status === 'success' ? 'Uğurlu' : 'Gözləyir'}</span></td>
        </tr>
    `).join('');
}

// Load Users
function loadUsers() {
    const users = Storage.get('allUsers') || MOCK_USERS;
    const tbody = document.getElementById('usersTable');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);">İstifadəçi yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role === 'admin' ? 'danger' : 'primary'}">${user.role === 'admin' ? 'Admin' : 'İstifadəçi'}</span></td>
            <td>${user.balance || 0} ₼</td>
            <td>2024-01-01</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewUser(${user.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editUser(${user.id})" title="Redaktə">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteUser(${user.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load Videos
function loadVideos() {
    const videos = Storage.get('videos') || [
        { id: 1, title: 'Riyaziyyata Giriş', category: 'Əsaslar', duration: '15:30', views: 1250, status: 'active' },
        { id: 2, title: 'Cəbr və Tənliklər', category: 'Cəbr', duration: '22:45', views: 890, status: 'active' },
        { id: 3, title: 'Həndəsə Əsasları', category: 'Həndəsə', duration: '18:20', views: 670, status: 'draft' }
    ];
    
    const tbody = document.getElementById('videosTable');
    tbody.innerHTML = videos.map(v => `
        <tr>
            <td>${v.id}</td>
            <td><strong>${v.title}</strong></td>
            <td>${v.category}</td>
            <td>${v.duration}</td>
            <td>${v.views}</td>
            <td><span class="badge badge-${v.status === 'active' ? 'success' : 'warning'}">${v.status === 'active' ? 'Aktiv' : 'Qaralama'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewVideo(${v.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editVideo(${v.id})" title="Redaktə">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteVideo(${v.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load Tests
function loadTests() {
    const tests = Storage.get('tests') || [
        { id: 1, title: 'Ümumi Riyaziyyat Testi', questions: 30, duration: '45 dəq', price: 5, status: 'active' },
        { id: 2, title: 'Cəbr Sınağı', questions: 25, duration: '40 dəq', price: 5, status: 'active' },
        { id: 3, title: 'Həndəsə Testi', questions: 20, duration: '35 dəq', price: 5, status: 'draft' }
    ];
    
    const tbody = document.getElementById('testsTable');
    tbody.innerHTML = tests.map(t => `
        <tr>
            <td>${t.id}</td>
            <td><strong>${t.title}</strong></td>
            <td>${t.questions}</td>
            <td>${t.duration}</td>
            <td>${t.price} ₼</td>
            <td><span class="badge badge-${t.status === 'active' ? 'success' : 'warning'}">${t.status === 'active' ? 'Aktiv' : 'Qaralama'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewTest(${t.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editTest(${t.id})" title="Redaktə">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteTest(${t.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load News
function loadNews() {
    const news = Storage.get('news') || [
        { id: 1, title: 'Yeni video dərslər əlavə edildi', category: 'Elan', date: '2024-01-15', status: 'published' },
        { id: 2, title: 'Sınaq sistemi yeniləndi', category: 'Yenilik', date: '2024-01-14', status: 'published' },
        { id: 3, title: 'Yeni kateqoriyalar gəlir', category: 'Elan', date: '2024-01-13', status: 'draft' }
    ];
    
    const tbody = document.getElementById('newsTable');
    tbody.innerHTML = news.map(n => `
        <tr>
            <td>${n.id}</td>
            <td><strong>${n.title}</strong></td>
            <td>${n.category}</td>
            <td>${n.date}</td>
            <td><span class="badge badge-${n.status === 'published' ? 'success' : 'warning'}">${n.status === 'published' ? 'Dərc edilib' : 'Qaralama'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewNews(${n.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editNews(${n.id})" title="Redaktə">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteNews(${n.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load Payments
function loadPayments() {
    const payments = Storage.get('payments') || [
        { id: 1, user: 'Tələbə', amount: 25, method: 'Kart', date: '2024-01-15', status: 'completed' },
        { id: 2, user: 'Test User', amount: 50, method: 'Kart', date: '2024-01-14', status: 'completed' },
        { id: 3, user: 'Demo User', amount: 10, method: 'Kart', date: '2024-01-13', status: 'pending' }
    ];
    
    const tbody = document.getElementById('paymentsTable');
    tbody.innerHTML = payments.map(p => `
        <tr>
            <td>${p.id}</td>
            <td><strong>${p.user}</strong></td>
            <td>${p.amount} ₼</td>
            <td>${p.method}</td>
            <td>${p.date}</td>
            <td><span class="badge badge-${p.status === 'completed' ? 'success' : 'warning'}">${p.status === 'completed' ? 'Tamamlandı' : 'Gözləyir'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewPayment(${p.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// User Actions
function viewUser(id) {
    alert('İstifadəçi məlumatları: ID ' + id);
}

function editUser(id) {
    alert('İstifadəçi redaktəsi: ID ' + id);
}

function deleteUser(id) {
    if (confirm('Bu istifadəçini silmək istədiyinizdən əminsiniz?')) {
        const users = Storage.get('allUsers') || MOCK_USERS;
        const filtered = users.filter(u => u.id !== id);
        Storage.set('allUsers', filtered);
        loadUsers();
        loadDashboardStats();
        alert('İstifadəçi silindi!');
    }
}

function showAddUserModal() {
    alert('Yeni istifadəçi əlavə et modalı (tezliklə)');
}

// Video Actions
function viewVideo(id) {
    alert('Video məlumatları: ID ' + id);
}

function editVideo(id) {
    alert('Video redaktəsi: ID ' + id);
}

function deleteVideo(id) {
    if (confirm('Bu videonu silmək istədiyinizdən əminsiniz?')) {
        alert('Video silindi!');
        loadVideos();
    }
}

function showAddVideoModal() {
    alert('Yeni video əlavə et modalı (tezliklə)');
}

// Test Actions
function viewTest(id) {
    alert('Test məlumatları: ID ' + id);
}

function editTest(id) {
    alert('Test redaktəsi: ID ' + id);
}

function deleteTest(id) {
    if (confirm('Bu testi silmək istədiyinizdən əminsiniz?')) {
        alert('Test silindi!');
        loadTests();
    }
}

function showAddTestModal() {
    alert('Yeni test əlavə et modalı (tezliklə)');
}

// News Actions
function viewNews(id) {
    alert('Xəbər məlumatları: ID ' + id);
}

function editNews(id) {
    alert('Xəbər redaktəsi: ID ' + id);
}

function deleteNews(id) {
    if (confirm('Bu xəbəri silmək istədiyinizdən əminsiniz?')) {
        alert('Xəbər silindi!');
        loadNews();
    }
}

function showAddNewsModal() {
    alert('Yeni xəbər əlavə et modalı (tezliklə)');
}

// Payment Actions
function viewPayment(id) {
    alert('Ödəniş məlumatları: ID ' + id);
}

// Settings
function saveSettings() {
    const settings = {
        siteName: document.getElementById('siteName').value,
        siteDomain: document.getElementById('siteDomain').value,
        testPrice: document.getElementById('testPrice').value,
        demoTests: document.getElementById('demoTests').value,
        siteEmail: document.getElementById('siteEmail').value,
        sitePhone: document.getElementById('sitePhone').value
    };
    
    Storage.set('siteSettings', settings);
    alert('Tənzimləmələr yadda saxlanıldı!');
}
