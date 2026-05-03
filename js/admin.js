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
    if (section === 'teachers') loadTeachers();
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

// User Actions
function viewUser(id) {
    const users = Storage.get('allUsers') || MOCK_USERS;
    const user = users.find(u => u.id === id);
    if (user) {
        // Get user's watched videos
        const watchedVideos = Storage.get('userVideos_' + user.id) || [];
        const videoCount = watchedVideos.length;
        
        const userTypeText = user.userType === 'teacher' ? '👨‍🏫 Müəllim' : '👨‍🎓 Şagird';
        
        alert(`👤 İstifadəçi Məlumatları\n\n` +
              `Ad: ${user.name}\n` +
              `Email: ${user.email}\n` +
              `Rol: ${user.role === 'admin' ? 'Admin' : 'İstifadəçi'}\n` +
              `Tip: ${userTypeText}\n` +
              `Balans: ${user.balance || 0} ₼\n` +
              `İzlənmiş Videolar: ${videoCount}\n` +
              `Demo Testlər: ${user.demoTests || 0}\n` +
              `Qeydiyyat: ${user.registeredAt ? new Date(user.registeredAt).toLocaleDateString('az-AZ') : 'N/A'}`);
    }
}

function editUser(id) {
    const users = Storage.get('allUsers') || MOCK_USERS;
    const user = users.find(u => u.id === id);
    if (user) {
        const name = prompt('Ad:', user.name);
        const balance = prompt('Balans:', user.balance);
        if (name) user.name = name;
        if (balance) user.balance = parseFloat(balance);
        Storage.set('allUsers', users);
        loadUsers();
        alert('İstifadəçi yeniləndi!');
    }
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
