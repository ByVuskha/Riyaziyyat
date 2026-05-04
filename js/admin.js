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
    document.querySelectorAll('.admin-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(section);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
    }
    
    // Update menu
    document.querySelectorAll('.admin-menu-item').forEach(item => item.classList.remove('active'));
    if (event && event.target) {
        event.target.closest('.admin-menu-item').classList.add('active');
    }
    
    // Update title
    const titles = {
        dashboard: 'Dashboard',
        users: 'İstifadəçilər',
        teachers: 'Müəllimlər',
        videos: 'Video Dərslər',
        tests: 'Sınaqlar',
        testResults: 'Sınaq Nəticələri',
        siteEditor: 'Sayt Redaktoru',
        news: 'Xəbərlər',
        payments: 'Ödənişlər',
        settings: 'Tənzimləmələr'
    };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[section] || 'Dashboard';
    }
    
    // Load data for section
    if (section === 'users') loadUsers();
    if (section === 'teachers') loadTeachers();
    if (section === 'videos') loadVideos();
    if (section === 'tests') loadTests();
    if (section === 'testResults') loadTestResults();
    if (section === 'siteEditor') loadSiteSettings();
    if (section === 'news') loadNews();
    if (section === 'payments') loadPayments();
}

// Load Dashboard Stats
function loadDashboardStats() {
    const users = Storage.get('allUsers') || MOCK_USERS;
    const videos = Storage.get('videos') || [];
    const tests = Storage.get('tests') || [];
    const teachers = Storage.get('teachers') || [];
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">İstifadəçi yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const userTypeIcon = user.userType === 'teacher' ? '<i class="fas fa-chalkboard-teacher" style="color:var(--success);"></i>' : '<i class="fas fa-user-graduate" style="color:var(--primary);"></i>';
        const userTypeText = user.userType === 'teacher' ? 'Müəllim' : 'Şagird';
        
        return `
        <tr>
            <td>${user.id}</td>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role === 'admin' ? 'danger' : 'primary'}">${user.role === 'admin' ? 'Admin' : 'İstifadəçi'}</span></td>
            <td>${userTypeIcon} ${userTypeText}</td>
            <td>${user.balance || 0} ₼</td>
            <td>${user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('az-AZ') : '2024-01-01'}</td>
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
    `}).join('');
}

// Load Videos
function loadVideos() {
    const videos = Storage.get('videos') || [
        { id: 1, title: 'Riyaziyyata Giriş', category: 'Əsaslar', duration: '15:30', views: 1250, status: 'active', source: 'youtube' },
        { id: 2, title: 'Cəbr və Tənliklər', category: 'Cəbr', duration: '22:45', views: 890, status: 'active', source: 'youtube' },
        { id: 3, title: 'Həndəsə Əsasları', category: 'Həndəsə', duration: '18:20', views: 670, status: 'draft', source: 'youtube' }
    ];
    
    const tbody = document.getElementById('videosTable');
    tbody.innerHTML = videos.map(v => `
        <tr>
            <td>${v.id}</td>
            <td><strong>${v.title}</strong></td>
            <td>${v.category}</td>
            <td>${v.duration}</td>
            <td>${v.views}</td>
            <td>
                <span class="badge badge-${v.status === 'active' ? 'success' : 'warning'}">
                    ${v.status === 'active' ? 'Aktiv' : 'Qaralama'}
                </span>
                ${v.source === 'upload' ? '<span class="badge badge-primary" style="margin-left:5px;">Yüklənmiş</span>' : ''}
            </td>
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
    const news = Storage.get('news') || [];
    
    const tbody = document.getElementById('newsTable');
    
    if (news.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);">Xəbər yoxdur. <a href="news-add.html">İlk xəbəri əlavə edin</a></td></tr>';
        return;
    }
    
    tbody.innerHTML = news.map(n => `
        <tr>
            <td>${n.id}</td>
            <td><strong>${n.emoji} ${n.title}</strong></td>
            <td>${n.author}</td>
            <td>${n.date}</td>
            <td>${n.views || 0}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewNews(${n.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteNews(${n.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewNews(id) {
    const news = Storage.get('news') || [];
    const item = news.find(n => n.id === id);
    if (item) {
        alert(`${item.emoji} ${item.title}\n\n${item.text}\n\n📅 ${item.date}\n👤 ${item.author}\n👁️ ${item.views} baxış`);
    }
}

function deleteNews(id) {
    if (confirm('Bu xəbəri silmək istədiyinizdən əminsiniz?')) {
        const news = Storage.get('news') || [];
        const filtered = news.filter(n => n.id !== id);
        Storage.set('news', filtered);
        loadNews();
        alert('Xəbər silindi!');
    }
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

// User Actions - Inline Editing (No Popups)
function viewUser(id) {
    const users = Storage.get('allUsers') || MOCK_USERS;
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    // Expand row to show details inline
    const row = event.target.closest('tr');
    const existingDetails = row.nextElementSibling;
    
    if (existingDetails && existingDetails.classList.contains('user-details-row')) {
        existingDetails.remove();
        return;
    }
    
    const watchedVideos = Storage.get('userVideos_' + user.id) || [];
    const userTypeText = user.userType === 'teacher' ? '👨‍🏫 Müəllim' : '👨‍🎓 Şagird';
    
    const detailsRow = document.createElement('tr');
    detailsRow.className = 'user-details-row';
    detailsRow.innerHTML = `
        <td colspan="8" style="background:#f8fafc;padding:25px;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;">
                <div>
                    <h4 style="font-size:14px;color:var(--gray);margin-bottom:10px;">Əsas Məlumat</h4>
                    <p><strong>Ad:</strong> ${user.name}</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Rol:</strong> ${user.role === 'admin' ? 'Admin' : 'İstifadəçi'}</p>
                    <p><strong>Tip:</strong> ${userTypeText}</p>
                </div>
                <div>
                    <h4 style="font-size:14px;color:var(--gray);margin-bottom:10px;">Statistika</h4>
                    <p><strong>Balans:</strong> ${user.balance || 0} ₼</p>
                    <p><strong>İzlənmiş Videolar:</strong> ${watchedVideos.length}</p>
                    <p><strong>Demo Testlər:</strong> ${user.demoTests || 0}</p>
                    <p><strong>Qeydiyyat:</strong> ${user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('az-AZ') : 'N/A'}</p>
                </div>
                <div>
                    <h4 style="font-size:14px;color:var(--gray);margin-bottom:10px;">Əməliyyatlar</h4>
                    <button class="btn btn-primary btn-sm" onclick="editUserInline(${user.id})" style="margin-bottom:8px;width:100%;">
                        <i class="fas fa-edit"></i> Redaktə Et
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})" style="width:100%;">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </div>
        </td>
    `;
    
    row.after(detailsRow);
}

function editUserInline(id) {
    const users = Storage.get('allUsers') || MOCK_USERS;
    const user = users.find(u => u.id === id);
    if (!user) return;
    
    const detailsRow = document.querySelector('.user-details-row');
    if (!detailsRow) return;
    
    detailsRow.innerHTML = `
        <td colspan="8" style="background:#f8fafc;padding:25px;">
            <h4 style="margin-bottom:20px;"><i class="fas fa-edit"></i> İstifadəçini Redaktə Et</h4>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;">
                <div class="form-group">
                    <label>Ad</label>
                    <input type="text" class="form-control" id="editUserName_${id}" value="${user.name}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" id="editUserEmail_${id}" value="${user.email}" disabled style="background:#e2e8f0;">
                </div>
                <div class="form-group">
                    <label>Balans (₼)</label>
                    <input type="number" class="form-control" id="editUserBalance_${id}" value="${user.balance || 0}">
                </div>
                <div class="form-group">
                    <label>Rol</label>
                    <select class="form-control" id="editUserRole_${id}">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>İstifadəçi</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:15px;">
                <button class="btn btn-primary" onclick="saveUserEdit(${id})">
                    <i class="fas fa-save"></i> Yadda Saxla
                </button>
                <button class="btn btn-secondary" onclick="document.querySelector('.user-details-row').remove()">
                    <i class="fas fa-times"></i> Ləğv Et
                </button>
            </div>
        </td>
    `;
}

function saveUserEdit(id) {
    const users = Storage.get('allUsers') || MOCK_USERS;
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return;
    
    const name = document.getElementById(`editUserName_${id}`).value;
    const balance = parseFloat(document.getElementById(`editUserBalance_${id}`).value) || 0;
    const role = document.getElementById(`editUserRole_${id}`).value;
    
    users[index].name = name;
    users[index].balance = balance;
    users[index].role = role;
    
    Storage.set('allUsers', users);
    
    document.querySelector('.user-details-row').remove();
    loadUsers();
    
    // Show success message inline
    const successMsg = document.createElement('div');
    successMsg.className = 'alert alert-success';
    successMsg.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;animation:slideIn 0.3s;';
    successMsg.innerHTML = '<i class="fas fa-check-circle"></i> İstifadəçi yeniləndi!';
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 3000);
}

function editUser(id) {
    editUserInline(id);
    // Scroll to the row
    event.target.closest('tr').scrollIntoView({ behavior: 'smooth', block: 'center' });
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

function toggleUserForm() {
    const form = document.getElementById('addUserForm');
    if (form.style.display === 'none') {
        form.style.display = 'block';
        // Clear form
        document.getElementById('newUserName').value = '';
        document.getElementById('newUserEmail').value = '';
        document.getElementById('newUserPassword').value = '';
        document.getElementById('newUserPhone').value = '';
        document.getElementById('newUserRole').value = 'user';
        document.getElementById('newUserBalance').value = '0';
    } else {
        form.style.display = 'none';
    }
}

function saveNewUser() {
    const name = document.getElementById('newUserName').value;
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const phone = document.getElementById('newUserPhone').value;
    const role = document.getElementById('newUserRole').value;
    const balance = parseFloat(document.getElementById('newUserBalance').value) || 0;
    
    if (!name || !email || !password) {
        alert('Zəhmət olmasa bütün məcburi sahələri doldurun!');
        return;
    }
    
    if (password.length < 6) {
        alert('Şifrə minimum 6 simvol olmalıdır!');
        return;
    }
    
    const users = Storage.get('allUsers') || MOCK_USERS;
    
    // Check if email exists
    if (users.find(u => u.email === email)) {
        alert('Bu email artıq qeydiyyatdadır!');
        return;
    }
    
    const newUser = {
        id: users.length + 1,
        name: name,
        email: email,
        password: password,
        phone: phone,
        role: role,
        balance: balance,
        demoTests: 3,
        active: true,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    Storage.set('allUsers', users);
    
    toggleUserForm();
    loadUsers();
    loadDashboardStats();
    alert('İstifadəçi uğurla əlavə edildi!');
}

function showAddUserModal() {
    toggleUserForm();
}

// Video Actions
function viewVideo(id) {
    const videos = Storage.get('videos') || [];
    const video = videos.find(v => v.id === id);
    if (video) {
        alert(`Başlıq: ${video.title}\nKateqoriya: ${video.category}\nMüddət: ${video.duration}\nBaxış: ${video.views}\nStatus: ${video.status}`);
    }
}

function editVideo(id) {
    window.location.href = `video-upload.html?id=${id}`;
}

function deleteVideo(id) {
    if (confirm('Bu videonu silmək istədiyinizdən əminsiniz?')) {
        alert('Video silindi!');
        loadVideos();
    }
}

function showAddVideoModal() {
    window.location.href = 'video-upload.html';
}

// Test Actions
function viewTest(id) {
    alert('Test məlumatları: ID ' + id);
}

function editTest(id) {
    window.location.href = `test-editor.html?id=${id}`;
}

function deleteTest(id) {
    if (confirm('Bu testi silmək istədiyinizdən əminsiniz?')) {
        alert('Test silindi!');
        loadTests();
    }
}

function showAddTestModal() {
    window.location.href = 'test-editor.html';
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
    const title = prompt('Xəbər başlığı:');
    const category = prompt('Kateqoriya:');
    const content = prompt('Məzmun:');
    
    if (title && category && content) {
        const news = Storage.get('news') || [];
        const newNews = {
            id: news.length + 1,
            title: title,
            category: category,
            content: content,
            date: new Date().toLocaleDateString('az-AZ'),
            status: 'published'
        };
        news.push(newNews);
        Storage.set('news', news);
        loadNews();
        alert('Xəbər əlavə edildi!');
    }
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


// Load Teachers
function loadTeachers() {
    const teachers = Storage.get('teachers') || [
        { id: 1, name: 'Dr. Əli Məmmədov', title: 'Professor', subjects: 'Cəbr, Analiz', experience: 25, students: 2500, rating: 4.9 },
        { id: 2, name: 'Leyla Həsənova', title: 'Müəllim', subjects: 'Həndəsə', experience: 15, students: 1800, rating: 4.8 },
        { id: 3, name: 'Rəşad Əliyev', title: 'Mütəxəssis', subjects: 'Analiz', experience: 20, students: 2200, rating: 4.9 }
    ];
    
    const tbody = document.getElementById('teachersTable');
    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--gray);">Müəllim yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = teachers.map(t => `
        <tr>
            <td>${t.id}</td>
            <td><strong>${t.name}</strong></td>
            <td>${t.title}</td>
            <td>${t.subjects}</td>
            <td>${t.experience} il</td>
            <td>${t.students}</td>
            <td><span class="badge badge-success">${t.rating} ⭐</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-view" onclick="viewTeacher(${t.id})" title="Bax">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon btn-edit" onclick="editTeacher(${t.id})" title="Redaktə">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteTeacher(${t.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Teacher Actions
function viewTeacher(id) {
    const teachers = Storage.get('teachers') || [];
    const teacher = teachers.find(t => t.id === id);
    if (teacher) {
        alert(`Ad: ${teacher.name}\nVəzifə: ${teacher.title}\nİxtisas: ${teacher.subjects}\nTəcrübə: ${teacher.experience} il\nTələbə: ${teacher.students}\nReytinq: ${teacher.rating}`);
    }
}

function editTeacher(id) {
    const teachers = Storage.get('teachers') || [];
    const teacher = teachers.find(t => t.id === id);
    if (teacher) {
        const name = prompt('Ad:', teacher.name);
        const title = prompt('Vəzifə:', teacher.title);
        if (name) teacher.name = name;
        if (title) teacher.title = title;
        Storage.set('teachers', teachers);
        loadTeachers();
        alert('Müəllim yeniləndi!');
    }
}

function deleteTeacher(id) {
    if (confirm('Bu müəllimi silmək istədiyinizdən əminsiniz?')) {
        alert('Müəllim silindi!');
        loadTeachers();
    }
}

function toggleTeacherForm() {
    const form = document.getElementById('addTeacherForm');
    if (form.style.display === 'none') {
        form.style.display = 'block';
        // Clear form
        document.getElementById('newTeacherName').value = '';
        document.getElementById('newTeacherTitle').value = '';
        document.getElementById('newTeacherSubjects').value = '';
        document.getElementById('newTeacherImage').value = '';
        document.getElementById('newTeacherExperience').value = '0';
        document.getElementById('newTeacherEmail').value = '';
        document.getElementById('newTeacherPhone').value = '';
        document.getElementById('newTeacherBio').value = '';
    } else {
        form.style.display = 'none';
    }
}

function saveNewTeacher() {
    const name = document.getElementById('newTeacherName').value;
    const title = document.getElementById('newTeacherTitle').value;
    const subjects = document.getElementById('newTeacherSubjects').value;
    const image = document.getElementById('newTeacherImage').value;
    const experience = parseInt(document.getElementById('newTeacherExperience').value) || 0;
    const email = document.getElementById('newTeacherEmail').value;
    const phone = document.getElementById('newTeacherPhone').value;
    const bio = document.getElementById('newTeacherBio').value;
    
    if (!name || !title || !subjects) {
        alert('Zəhmət olmasa bütün məcburi sahələri doldurun!');
        return;
    }
    
    const teachers = Storage.get('teachers') || [];
    const newTeacher = {
        id: teachers.length + 1,
        name: name,
        title: title,
        subjects: subjects,
        image: image,
        experience: experience,
        email: email,
        phone: phone,
        bio: bio,
        students: 0,
        rating: 5.0,
        active: true,
        createdAt: new Date().toISOString()
    };
    
    teachers.push(newTeacher);
    Storage.set('teachers', teachers);
    
    toggleTeacherForm();
    loadTeachers();
    loadDashboardStats();
    alert('Müəllim uğurla əlavə edildi!');
}

function showAddTeacherModal() {
    toggleTeacherForm();
}


// ==================== TEST RESULTS ====================

function loadTestResults() {
    const results = Storage.get('testResults') || [];
    const stats = Storage.get('testStats') || {};
    const tests = Storage.get('tests') || [];
    
    // Statistikaları hesabla
    const totalAttempts = results.length;
    const uniqueUsers = new Set(results.map(r => r.userEmail)).size;
    const avgScore = results.length > 0 
        ? Math.round(results.reduce((sum, r) => sum + r.percentage, 0) / results.length)
        : 0;
    const passRate = results.length > 0
        ? Math.round((results.filter(r => r.percentage >= 60).length / results.length) * 100)
        : 0;
    
    // Statistikaları göstər
    document.getElementById('totalTestAttempts').textContent = totalAttempts;
    document.getElementById('uniqueTestTakers').textContent = uniqueUsers;
    document.getElementById('avgTestScore').textContent = avgScore + '%';
    document.getElementById('passRate').textContent = passRate + '%';
    
    // Filtr dropdown-unu doldur
    const filterTest = document.getElementById('filterTest');
    const testIds = [...new Set(results.map(r => r.testId))];
    filterTest.innerHTML = '<option value="">Hamısı</option>';
    testIds.forEach(testId => {
        const test = tests.find(t => t.id == testId);
        const testTitle = test ? test.title : `Sınaq ${testId}`;
        filterTest.innerHTML += `<option value="${testId}">${testTitle}</option>`;
    });
    
    // Nəticələri göstər
    renderTestResults(results);
}

function renderTestResults(results = null) {
    if (!results) {
        results = Storage.get('testResults') || [];
    }
    
    const tbody = document.getElementById('testResultsTable');
    
    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:40px;">Nəticə yoxdur</td></tr>';
        return;
    }
    
    // Tarixə görə sırala (ən yeni əvvəl)
    results.sort((a, b) => b.timestamp - a.timestamp);
    
    tbody.innerHTML = results.map(r => {
        const date = new Date(r.date).toLocaleString('az-AZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const statusColor = r.percentage >= 80 ? 'success' : r.percentage >= 60 ? 'warning' : 'danger';
        const statusText = r.percentage >= 80 ? 'Əla' : r.percentage >= 60 ? 'Yaxşı' : 'Zəif';
        
        return `
            <tr>
                <td>${date}</td>
                <td>
                    <div style="font-weight:600;">${r.userName}</div>
                    <div style="font-size:12px;color:var(--gray);">${r.userEmail}</div>
                </td>
                <td>${r.testTitle}</td>
                <td><strong>${r.score}/${r.total}</strong></td>
                <td><strong>${r.percentage}%</strong></td>
                <td><span class="badge badge-${statusColor}">${statusText}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-view" onclick="viewTestResult('${r.timestamp}')" title="Ətraflı">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteTestResult('${r.timestamp}')" title="Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterTestResults() {
    const testFilter = document.getElementById('filterTest').value;
    const userFilter = document.getElementById('filterUser').value.toLowerCase();
    
    let results = Storage.get('testResults') || [];
    
    // Sınaq filtri
    if (testFilter) {
        results = results.filter(r => r.testId == testFilter);
    }
    
    // İstifadəçi filtri
    if (userFilter) {
        results = results.filter(r => 
            r.userName.toLowerCase().includes(userFilter) ||
            r.userEmail.toLowerCase().includes(userFilter)
        );
    }
    
    renderTestResults(results);
}

function viewTestResult(timestamp) {
    const results = Storage.get('testResults') || [];
    const result = results.find(r => r.timestamp == timestamp);
    
    if (!result) {
        alert('Nəticə tapılmadı!');
        return;
    }
    
    const info = `
📊 Sınaq Nəticəsi

👤 İstifadəçi: ${result.userName}
📧 Email: ${result.userEmail}
📝 Sınaq: ${result.testTitle}

✅ Düzgün: ${result.score}
❌ Səhv: ${result.total - result.score}
📊 Ümumi: ${result.total}
📈 Faiz: ${result.percentage}%

📅 Tarix: ${new Date(result.date).toLocaleString('az-AZ')}
    `.trim();
    
    alert(info);
}

function deleteTestResult(timestamp) {
    if (!confirm('Bu nəticəni silmək istədiyinizə əminsiniz?')) {
        return;
    }
    
    let results = Storage.get('testResults') || [];
    results = results.filter(r => r.timestamp != timestamp);
    Storage.set('testResults', results);
    
    loadTestResults();
    alert('Nəticə silindi!');
}

function exportTestResults() {
    const results = Storage.get('testResults') || [];
    
    if (results.length === 0) {
        alert('Export ediləcək nəticə yoxdur!');
        return;
    }
    
    // CSV formatında export
    let csv = 'Tarix,İstifadəçi,Email,Sınaq,Bal,Ümumi,Faiz\n';
    
    results.forEach(r => {
        const date = new Date(r.date).toLocaleString('az-AZ');
        csv += `"${date}","${r.userName}","${r.userEmail}","${r.testTitle}",${r.score},${r.total},${r.percentage}%\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sinaq-neticeleri-${Date.now()}.csv`;
    link.click();
    
    alert('Nəticələr export edildi!');
}


// ==================== SITE EDITOR ====================

// Tab switching
function switchEditorTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.editor-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
    
    // Show selected tab
    document.getElementById('editor' + tab.charAt(0).toUpperCase() + tab.slice(1)).style.display = 'block';
    event.target.classList.add('active');
}

// Load site settings
function loadSiteSettings() {
    const settings = Storage.get('siteSettings') || getDefaultSettings();
    
    // Branding
    if (settings.branding) {
        document.getElementById('siteName').value = settings.branding.name || 'Bizim Riyaziyyat';
        document.getElementById('logoShort').value = settings.branding.logoShort || 'BR';
        document.getElementById('siteSlogan').value = settings.branding.slogan || 'Riyaziyyatı Asan Öyrən';
        document.getElementById('metaDescription').value = settings.branding.metaDescription || '';
    }
    
    // Colors
    if (settings.colors) {
        document.getElementById('colorPrimary').value = settings.colors.primary || '#3b82f6';
        document.getElementById('colorSecondary').value = settings.colors.secondary || '#8b5cf6';
        document.getElementById('colorSuccess').value = settings.colors.success || '#10b981';
        document.getElementById('colorWarning').value = settings.colors.warning || '#f59e0b';
        document.getElementById('colorDanger').value = settings.colors.danger || '#ef4444';
        document.getElementById('colorDark').value = settings.colors.dark || '#1e293b';
    }
    
    // Typography
    if (settings.typography) {
        document.getElementById('fontFamily').value = settings.typography.fontFamily || "'Inter', sans-serif";
        document.getElementById('fontSize').value = settings.typography.fontSize || 16;
        document.getElementById('fontSizeValue').textContent = (settings.typography.fontSize || 16) + 'px';
        document.getElementById('headingFont').value = settings.typography.headingFont || "'Inter', sans-serif";
        document.getElementById('lineHeight').value = settings.typography.lineHeight || 1.6;
        document.getElementById('lineHeightValue').textContent = settings.typography.lineHeight || 1.6;
    }
    
    // Content
    if (settings.content) {
        document.getElementById('heroTitle').value = settings.content.heroTitle || 'Riyaziyyatı Asan Öyrən';
        document.getElementById('heroSubtitle').value = settings.content.heroSubtitle || '';
        document.getElementById('ctaButton1').value = settings.content.ctaButton1 || 'İndi Başla';
        document.getElementById('ctaButton2').value = settings.content.ctaButton2 || 'Pulsuz Sınaq';
        document.getElementById('statVideos').value = settings.content.statVideos || '500+';
        document.getElementById('statStudents').value = settings.content.statStudents || '10K+';
        document.getElementById('statTests').value = settings.content.statTests || '1000+';
        document.getElementById('statSatisfaction').value = settings.content.statSatisfaction || '98%';
    }
    
    // Footer
    if (settings.footer) {
        document.getElementById('footerEmail').value = settings.footer.email || 'info@bizimriyaziyyat.az';
        document.getElementById('footerPhone').value = settings.footer.phone || '+994 50 123 45 67';
        document.getElementById('footerInstagram').value = settings.footer.instagram || '@bizimriyaziyyat';
        document.getElementById('footerTelegram').value = settings.footer.telegram || '@bizimriyaziyyat';
        document.getElementById('footerCopyright').value = settings.footer.copyright || '© 2026 Bizim Riyaziyyat';
        document.getElementById('footerDescription').value = settings.footer.description || '';
    }
    
    // Range input listeners
    document.getElementById('fontSize').addEventListener('input', function() {
        document.getElementById('fontSizeValue').textContent = this.value + 'px';
    });
    
    document.getElementById('lineHeight').addEventListener('input', function() {
        document.getElementById('lineHeightValue').textContent = this.value;
    });
}

// Get default settings
function getDefaultSettings() {
    return {
        branding: {
            name: 'Bizim Riyaziyyat',
            logoShort: 'BR',
            slogan: 'Riyaziyyatı Asan Öyrən',
            metaDescription: 'Azərbaycanın ən böyük riyaziyyat öyrənmə platforması'
        },
        colors: {
            primary: '#3b82f6',
            secondary: '#8b5cf6',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            dark: '#1e293b'
        },
        typography: {
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            headingFont: "'Inter', sans-serif",
            lineHeight: 1.6
        },
        content: {
            heroTitle: 'Riyaziyyatı Asan Öyrən',
            heroSubtitle: 'Peşəkar müəllimlərdən video dərslər, sınaqlar və interaktiv tapşırıqlarla riyaziyyatı mənimsə.',
            ctaButton1: 'İndi Başla',
            ctaButton2: 'Pulsuz Sınaq',
            statVideos: '500+',
            statStudents: '10K+',
            statTests: '1000+',
            statSatisfaction: '98%'
        },
        footer: {
            email: 'info@bizimriyaziyyat.az',
            phone: '+994 50 123 45 67',
            instagram: '@bizimriyaziyyat',
            telegram: '@bizimriyaziyyat',
            copyright: '© 2026 Bizim Riyaziyyat. Bütün hüquqlar qorunur.',
            description: 'Azərbaycanın ən böyük riyaziyyat öyrənmə platforması. Hər yaşdan tələbə üçün.'
        }
    };
}

// Save site settings
function saveSiteSettings() {
    const settings = {
        branding: {
            name: document.getElementById('siteName').value,
            logoShort: document.getElementById('logoShort').value,
            slogan: document.getElementById('siteSlogan').value,
            metaDescription: document.getElementById('metaDescription').value
        },
        colors: {
            primary: document.getElementById('colorPrimary').value,
            secondary: document.getElementById('colorSecondary').value,
            success: document.getElementById('colorSuccess').value,
            warning: document.getElementById('colorWarning').value,
            danger: document.getElementById('colorDanger').value,
            dark: document.getElementById('colorDark').value
        },
        typography: {
            fontFamily: document.getElementById('fontFamily').value,
            fontSize: parseInt(document.getElementById('fontSize').value),
            headingFont: document.getElementById('headingFont').value,
            lineHeight: parseFloat(document.getElementById('lineHeight').value)
        },
        content: {
            heroTitle: document.getElementById('heroTitle').value,
            heroSubtitle: document.getElementById('heroSubtitle').value,
            ctaButton1: document.getElementById('ctaButton1').value,
            ctaButton2: document.getElementById('ctaButton2').value,
            statVideos: document.getElementById('statVideos').value,
            statStudents: document.getElementById('statStudents').value,
            statTests: document.getElementById('statTests').value,
            statSatisfaction: document.getElementById('statSatisfaction').value
        },
        footer: {
            email: document.getElementById('footerEmail').value,
            phone: document.getElementById('footerPhone').value,
            instagram: document.getElementById('footerInstagram').value,
            telegram: document.getElementById('footerTelegram').value,
            copyright: document.getElementById('footerCopyright').value,
            description: document.getElementById('footerDescription').value
        },
        updatedAt: new Date().toISOString()
    };
    
    Storage.set('siteSettings', settings);
    
    // Apply CSS variables
    applySiteStyles(settings);
    
    alert('✅ Dəyişikliklər saxlanıldı və tətbiq edildi!');
}

// Apply site styles
function applySiteStyles(settings) {
    const root = document.documentElement;
    
    // Colors
    if (settings.colors) {
        root.style.setProperty('--primary', settings.colors.primary);
        root.style.setProperty('--secondary', settings.colors.secondary);
        root.style.setProperty('--success', settings.colors.success);
        root.style.setProperty('--warning', settings.colors.warning);
        root.style.setProperty('--danger', settings.colors.danger);
        root.style.setProperty('--dark', settings.colors.dark);
    }
    
    // Typography
    if (settings.typography) {
        root.style.setProperty('--font-family', settings.typography.fontFamily);
        document.body.style.fontFamily = settings.typography.fontFamily;
        document.body.style.fontSize = settings.typography.fontSize + 'px';
        document.body.style.lineHeight = settings.typography.lineHeight;
        
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(h => {
            h.style.fontFamily = settings.typography.headingFont;
        });
    }
}

// Preview site
function previewSite() {
    window.open('index.html', '_blank');
}

// Reset to defaults
function resetSiteSettings() {
    if (!confirm('Bütün dəyişiklikləri sıfırlamaq istədiyinizə əminsiniz?')) {
        return;
    }
    
    Storage.remove('siteSettings');
    loadSiteSettings();
    alert('✅ Tənzimləmələr sıfırlandı!');
}


// ==================== TEACHERS ====================

function loadTeachers() {
    const teachers = Storage.get('teachers') || [];
    const tbody = document.getElementById('teachersTable');
    
    if (!tbody) {
        console.warn('teachersTable not found');
        return;
    }
    
    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:40px;">Müəllim yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = teachers.map(t => `
        <tr>
            <td>${t.id}</td>
            <td>
                <div style="font-weight:600;">${t.name}</div>
                <div style="font-size:12px;color:var(--gray);">${t.email}</div>
            </td>
            <td>${t.title || 'Müəllim'}</td>
            <td>${t.subjects || '-'}</td>
            <td>${t.students || 0}</td>
            <td>
                <span style="color:#f59e0b;">★</span> ${t.rating || 5.0}
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon btn-edit" onclick="editTeacher(${t.id})" title="Redaktə">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteTeacher(${t.id})" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editTeacher(id) {
    const teachers = Storage.get('teachers') || [];
    const teacher = teachers.find(t => t.id === id);
    
    if (!teacher) {
        alert('Müəllim tapılmadı!');
        return;
    }
    
    // Create edit modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal" style="max-width:600px;">
            <h2>Müəllimi Redaktə Et</h2>
            
            <div class="form-group">
                <label>Ad Soyad</label>
                <input type="text" class="form-control" id="editTeacherName" value="${teacher.name}">
            </div>
            
            <div class="form-group">
                <label>Email</label>
                <input type="email" class="form-control" id="editTeacherEmail" value="${teacher.email}" disabled style="background:#f1f5f9;">
            </div>
            
            <div class="form-group">
                <label>Vəzifə/Başlıq</label>
                <input type="text" class="form-control" id="editTeacherTitle" value="${teacher.title || ''}">
            </div>
            
            <div class="form-group">
                <label>Bio</label>
                <textarea class="form-control" id="editTeacherBio" rows="3">${teacher.bio || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>Fənlər (vergüllə ayırın)</label>
                <input type="text" class="form-control" id="editTeacherSubjects" value="${teacher.subjects || ''}">
            </div>
            
            <div class="form-group">
                <label>Şəkil URL</label>
                <input type="url" class="form-control" id="editTeacherImage" value="${teacher.image || ''}" placeholder="https://example.com/image.jpg">
                <small style="color:var(--gray);font-size:12px;">Müəllimin şəklinin URL-ni daxil edin</small>
            </div>
            
            <div class="form-grid">
                <div class="form-group">
                    <label>Telefon</label>
                    <input type="tel" class="form-control" id="editTeacherPhone" value="${teacher.phone || ''}">
                </div>
                
                <div class="form-group">
                    <label>Təcrübə (il)</label>
                    <input type="number" class="form-control" id="editTeacherExperience" value="${teacher.experience || 0}">
                </div>
                
                <div class="form-group">
                    <label>Reytinq</label>
                    <input type="number" class="form-control" id="editTeacherRating" min="1" max="5" step="0.1" value="${teacher.rating || 5.0}">
                </div>
            </div>
            
            <div class="form-group">
                <label>Təhsil</label>
                <textarea class="form-control" id="editTeacherEducation" rows="2">${teacher.education || ''}</textarea>
            </div>
            
            <div style="display:flex;gap:10px;margin-top:25px;">
                <button class="btn btn-primary" onclick="saveTeacherEdit(${id})">
                    <i class="fas fa-save"></i> Yadda Saxla
                </button>
                <button class="btn btn-secondary" onclick="closeTeacherModal()">
                    <i class="fas fa-times"></i> Ləğv Et
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function saveTeacherEdit(id) {
    const teachers = Storage.get('teachers') || [];
    const index = teachers.findIndex(t => t.id === id);
    
    if (index === -1) {
        alert('Müəllim tapılmadı!');
        return;
    }
    
    // Update teacher data
    teachers[index] = {
        ...teachers[index],
        name: document.getElementById('editTeacherName').value,
        title: document.getElementById('editTeacherTitle').value,
        bio: document.getElementById('editTeacherBio').value,
        subjects: document.getElementById('editTeacherSubjects').value,
        image: document.getElementById('editTeacherImage').value,
        phone: document.getElementById('editTeacherPhone').value,
        experience: parseInt(document.getElementById('editTeacherExperience').value) || 0,
        rating: parseFloat(document.getElementById('editTeacherRating').value) || 5.0,
        education: document.getElementById('editTeacherEducation').value,
        updatedAt: new Date().toISOString()
    };
    
    Storage.set('teachers', teachers);
    
    // Also update in allUsers if exists
    const allUsers = Storage.get('allUsers') || [];
    const userIndex = allUsers.findIndex(u => u.email === teachers[index].email);
    if (userIndex !== -1) {
        allUsers[userIndex].name = teachers[index].name;
        Storage.set('allUsers', allUsers);
    }
    
    closeTeacherModal();
    loadTeachers();
    alert('✅ Müəllim məlumatları yeniləndi!');
}

function deleteTeacher(id) {
    if (!confirm('Bu müəllimi silmək istədiyinizə əminsiniz?')) {
        return;
    }
    
    let teachers = Storage.get('teachers') || [];
    teachers = teachers.filter(t => t.id !== id);
    Storage.set('teachers', teachers);
    
    loadTeachers();
    alert('✅ Müəllim silindi!');
}

function closeTeacherModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
}


// ==================== SYNC TO UPSTASH ====================

async function syncAllData() {
    if (typeof syncToUpstash === 'undefined') {
        alert('⚠️ Upstash sinxronlaşdırma mövcud deyil!');
        return;
    }
    
    const confirmSync = confirm('Bütün məlumatları Upstash-a sinxronlaşdırmaq istəyirsiniz?\n\nBu, digər cihazlarda məlumatların görünməsini təmin edəcək.');
    
    if (!confirmSync) return;
    
    try {
        // Show loading
        const loadingMsg = document.createElement('div');
        loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:30px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.2);z-index:10000;text-align:center;';
        loadingMsg.innerHTML = `
            <div class="spinner" style="margin:0 auto 15px;"></div>
            <h3 style="margin-bottom:10px;">Sinxronlaşdırılır...</h3>
            <p style="color:var(--gray);font-size:14px;">Zəhmət olmasa gözləyin</p>
        `;
        document.body.appendChild(loadingMsg);
        
        // Sync to Upstash
        await syncToUpstash();
        
        // Remove loading
        loadingMsg.remove();
        
        // Show success
        alert('✅ Məlumatlar uğurla sinxronlaşdırıldı!\n\nİndi digər cihazlarda da görünəcək.');
        
    } catch (error) {
        console.error('Sync error:', error);
        alert('❌ Sinxronlaşdırma zamanı xəta baş verdi:\n' + error.message);
    }
}
