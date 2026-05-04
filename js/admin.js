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
        suspicious: 'Şübhəli Fəaliyyətlər',
        premium: 'Premium İdarəetməsi',
        leaderboard: 'Xal Liderliyi',
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
    if (section === 'suspicious') {
        loadSuspiciousActivities();
        loadFrozenAccounts();
    }
    if (section === 'leaderboard') loadPointsLeaderboard();
    if (section === 'premium') {
        loadPremiumRequestsEnhanced();
        loadPremiumUsers();
    }
    if (section === 'activeUsers') {
        startActiveUsersTracking();
        // Update stats
        setTimeout(() => {
            const activeUsers = Storage.get('activeUsers') || {};
            const now = Date.now();
            const fiveMin = 5 * 60 * 1000;
            const active = Object.values(activeUsers).filter(u => now - u.lastSeen < fiveMin);
            const premium = active.filter(u => u.premium).length;
            const free = active.filter(u => !u.premium && u.role !== 'admin').length;
            
            const totalEl = document.getElementById('activeCountTotal');
            const premiumEl = document.getElementById('activePremiumCount');
            const freeEl = document.getElementById('activeFreeCount');
            const updateEl = document.getElementById('activeLastUpdate');
            
            if (totalEl) totalEl.textContent = active.length;
            if (premiumEl) premiumEl.textContent = premium;
            if (freeEl) freeEl.textContent = free;
            if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('az-AZ');
        }, 100);
    } else {
        stopActiveUsersTracking();
    }
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
    
    // Active users count
    const activeUsers = Storage.get('activeUsers') || {};
    const now = Date.now();
    const activeCount = Object.values(activeUsers).filter(u => now - u.lastSeen < 5 * 60 * 1000).length;
    const activeEl = document.getElementById('activeUsersCount');
    if (activeEl) activeEl.textContent = activeCount;
    
    // Premium users count
    const premiumUsers = users.filter(u => u.premium).length;
    const premiumEl = document.getElementById('totalPremiumUsers');
    if (premiumEl) premiumEl.textContent = premiumUsers;
    
    // Pending premium requests
    const requests = Storage.get('premiumRequests') || [];
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const badge = document.getElementById('premiumPendingBadge');
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }
    
    // Load charts and activity
    loadRecentRegistrations();
    loadActiveUsers();
    loadActivityLog();
}

// Load Recent Registrations Chart
function loadRecentRegistrations() {
    const users = Storage.get('allUsers') || MOCK_USERS;
    
    // Get registrations from last 7 days
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' });
        
        const count = users.filter(u => {
            if (!u.registeredAt) return false;
            const regDate = new Date(u.registeredAt);
            return regDate.toDateString() === date.toDateString();
        }).length;
        
        last7Days.push({ date: dateStr, count });
    }
    
    // Create simple bar chart
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    const maxCount = Math.max(...last7Days.map(d => d.count), 1);
    
    chartContainer.innerHTML = `
        <div style="display:flex;align-items:flex-end;justify-content:space-around;height:100%;padding:20px;">
            ${last7Days.map(day => `
                <div style="display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;">
                    <div style="background:var(--primary);width:30px;height:${(day.count / maxCount) * 200}px;border-radius:4px;transition:all 0.3s;" title="${day.count} qeydiyyat"></div>
                    <span style="font-size:11px;color:var(--gray);">${day.date}</span>
                    <span style="font-size:13px;font-weight:600;color:var(--primary);">${day.count}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Load Active Users
function loadActiveUsers() {
    const sessions = Storage.get('userSessions') || {};
    const users = Storage.get('allUsers') || [];
    
    const activeCount = Object.keys(sessions).length;
    const totalUsers = users.length;
    const percentage = totalUsers > 0 ? Math.round((activeCount / totalUsers) * 100) : 0;
    
    const chartContainers = document.querySelectorAll('.chart-container');
    if (chartContainers.length < 2) return;
    
    const activeUsersChart = chartContainers[1];
    
    activeUsersChart.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;">
            <div style="position:relative;width:150px;height:150px;">
                <svg viewBox="0 0 36 36" style="transform:rotate(-90deg);">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#e2e8f0" stroke-width="3"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="var(--success)" stroke-width="3" 
                            stroke-dasharray="${percentage} 100" stroke-linecap="round"></circle>
                </svg>
                <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                    <div style="font-size:32px;font-weight:800;color:var(--success);">${activeCount}</div>
                    <div style="font-size:12px;color:var(--gray);">Aktiv</div>
                </div>
            </div>
            <div style="margin-top:15px;text-align:center;">
                <div style="font-size:14px;color:var(--gray);">Ümumi: ${totalUsers}</div>
                <div style="font-size:13px;color:var(--success);font-weight:600;">${percentage}% Aktiv</div>
            </div>
        </div>
    `;
}

// Load Activity Log
function loadActivityLog() {
    const activities = Storage.get('activities') || [];
    const users = Storage.get('allUsers') || [];
    const videos = Storage.get('videos') || [];
    const tests = Storage.get('tests') || [];
    
    // Generate recent activities
    const recentActivities = [];
    
    // Recent registrations
    const recentUsers = users
        .filter(u => u.registeredAt)
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
        .slice(0, 3);
    
    recentUsers.forEach(u => {
        recentActivities.push({
            user: u.name,
            action: 'Yeni qeydiyyat',
            date: new Date(u.registeredAt).toLocaleDateString('az-AZ'),
            status: 'success',
            icon: 'user-plus'
        });
    });
    
    // Recent videos
    const recentVideos = videos
        .filter(v => v.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2);
    
    recentVideos.forEach(v => {
        recentActivities.push({
            user: 'Admin',
            action: `Video əlavə edildi: "${v.title}"`,
            date: new Date(v.createdAt).toLocaleDateString('az-AZ'),
            status: 'success',
            icon: 'video'
        });
    });
    
    // Recent tests
    const recentTests = tests
        .filter(t => t.createdAt)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 2);
    
    recentTests.forEach(t => {
        recentActivities.push({
            user: 'Admin',
            action: `Sınaq əlavə edildi: "${t.title}"`,
            date: new Date(t.createdAt).toLocaleDateString('az-AZ'),
            status: 'success',
            icon: 'clipboard-list'
        });
    });
    
    // Sort by date and take last 10
    recentActivities.sort((a, b) => {
        const dateA = new Date(a.date.split('.').reverse().join('-'));
        const dateB = new Date(b.date.split('.').reverse().join('-'));
        return dateB - dateA;
    });
    
    const displayActivities = recentActivities.slice(0, 10);
    
    const tbody = document.getElementById('activityLog');
    
    if (displayActivities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray);">Fəaliyyət yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = displayActivities.map(a => `
        <tr>
            <td>
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:35px;height:35px;border-radius:50%;background:#eef2ff;display:flex;align-items:center;justify-content:center;">
                        <i class="fas fa-${a.icon}" style="color:var(--primary);font-size:14px;"></i>
                    </div>
                    <strong>${a.user}</strong>
                </div>
            </td>
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

// Load News - Only user-added news
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
            <td><strong>${n.emoji || '📰'} ${n.title}</strong></td>
            <td>${n.author || 'Admin'}</td>
            <td>${n.date}</td>
            <td>${n.views || 0}</td>
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

function viewNews(id) {
    const news = Storage.get('news') || [];
    const item = news.find(n => n.id === id);
    if (!item) return;
    
    const row = event.target.closest('tr');
    const existingDetails = row.nextElementSibling;
    
    if (existingDetails && existingDetails.classList.contains('news-details-row')) {
        existingDetails.remove();
        return;
    }
    
    const detailsRow = document.createElement('tr');
    detailsRow.className = 'news-details-row';
    detailsRow.innerHTML = `
        <td colspan="6" style="background:#f8fafc;padding:25px;">
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
                <div>
                    <h4 style="font-size:18px;margin-bottom:15px;">${item.emoji || '📰'} ${item.title}</h4>
                    <p style="white-space:pre-wrap;line-height:1.6;">${item.content || item.text}</p>
                    <div style="margin-top:15px;padding-top:15px;border-top:1px solid var(--border);">
                        <small style="color:var(--gray);">
                            📅 ${item.date} | 👤 ${item.author || 'Admin'} | 👁️ ${item.views || 0} baxış
                        </small>
                    </div>
                </div>
                <div>
                    <h4 style="font-size:14px;color:var(--gray);margin-bottom:10px;">Əməliyyatlar</h4>
                    <button class="btn btn-primary btn-sm" onclick="editNews(${item.id})" style="margin-bottom:8px;width:100%;">
                        <i class="fas fa-edit"></i> Redaktə Et
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteNews(${item.id})" style="width:100%;">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </div>
        </td>
    `;
    
    row.after(detailsRow);
}

function editNews(id) {
    const news = Storage.get('news') || [];
    const item = news.find(n => n.id === id);
    if (!item) return;
    
    const detailsRow = document.querySelector('.news-details-row');
    if (!detailsRow) {
        // If not in details view, create edit row
        const row = event.target.closest('tr');
        const editRow = document.createElement('tr');
        editRow.className = 'news-details-row';
        editRow.innerHTML = getNewsEditHTML(item);
        row.after(editRow);
    } else {
        detailsRow.innerHTML = getNewsEditHTML(item);
    }
}

function getNewsEditHTML(item) {
    return `
        <td colspan="6" style="background:#f8fafc;padding:25px;max-height:500px;overflow-y:auto;">
            <h4 style="margin-bottom:20px;"><i class="fas fa-edit"></i> Xəbəri Redaktə Et</h4>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;">
                <div class="form-group">
                    <label>Başlıq</label>
                    <input type="text" class="form-control" id="editNewsTitle_${item.id}" value="${item.title}">
                </div>
                <div class="form-group">
                    <label>Emoji</label>
                    <input type="text" class="form-control" id="editNewsEmoji_${item.id}" value="${item.emoji || '📰'}" maxlength="2">
                </div>
            </div>
            <div class="form-group">
                <label>Məzmun</label>
                <textarea class="form-control" id="editNewsContent_${item.id}" rows="6">${item.content || item.text}</textarea>
            </div>
            <div style="display:flex;gap:10px;margin-top:15px;">
                <button class="btn btn-primary" onclick="saveNewsEdit(${item.id})">
                    <i class="fas fa-save"></i> Yadda Saxla
                </button>
                <button class="btn btn-secondary" onclick="document.querySelector('.news-details-row').remove()">
                    <i class="fas fa-times"></i> Ləğv Et
                </button>
            </div>
        </td>
    `;
}

function saveNewsEdit(id) {
    const news = Storage.get('news') || [];
    const index = news.findIndex(n => n.id === id);
    if (index === -1) return;
    
    news[index].title = document.getElementById(`editNewsTitle_${id}`).value;
    news[index].emoji = document.getElementById(`editNewsEmoji_${id}`).value;
    news[index].content = document.getElementById(`editNewsContent_${id}`).value;
    news[index].text = document.getElementById(`editNewsContent_${id}`).value;
    
    Storage.set('news', news);
    
    document.querySelector('.news-details-row').remove();
    loadNews();
    showSuccessMessage('Xəbər yeniləndi!');
}

function deleteNews(id) {
    if (!confirm('Bu xəbəri silmək istədiyinizdən əminsiniz?')) {
        return;
    }
    const news = Storage.get('news') || [];
    const filtered = news.filter(n => n.id !== id);
    Storage.set('news', filtered);
    
    const detailsRow = document.querySelector('.news-details-row');
    if (detailsRow) detailsRow.remove();
    
    loadNews();
    showSuccessMessage('Xəbər silindi!');
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
    showSuccessMessage('İstifadəçi yeniləndi!');
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

// Video Actions - Inline Editing
function viewVideo(id) {
    const videos = Storage.get('videos') || [];
    const video = videos.find(v => v.id === id);
    if (!video) return;
    
    const row = event.target.closest('tr');
    const existingDetails = row.nextElementSibling;
    
    if (existingDetails && existingDetails.classList.contains('video-details-row')) {
        existingDetails.remove();
        return;
    }
    
    const detailsRow = document.createElement('tr');
    detailsRow.className = 'video-details-row';
    detailsRow.innerHTML = `
        <td colspan="7" style="background:#f8fafc;padding:25px;">
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
                <div>
                    <h4 style="font-size:14px;color:var(--gray);margin-bottom:10px;">Video Məlumatları</h4>
                    <p><strong>Başlıq:</strong> ${video.title}</p>
                    <p><strong>Kateqoriya:</strong> ${video.category}</p>
                    <p><strong>Müddət:</strong> ${video.duration}</p>
                    <p><strong>Baxış:</strong> ${video.views}</p>
                    <p><strong>Status:</strong> ${video.status === 'active' ? 'Aktiv' : 'Qaralama'}</p>
                    ${video.description ? `<p><strong>Təsvir:</strong> ${video.description}</p>` : ''}
                </div>
                <div>
                    <h4 style="font-size:14px;color:var(--gray);margin-bottom:10px;">Əməliyyatlar</h4>
                    <button class="btn btn-primary btn-sm" onclick="editVideoInline(${video.id})" style="margin-bottom:8px;width:100%;">
                        <i class="fas fa-edit"></i> Redaktə Et
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteVideo(${video.id})" style="width:100%;">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </div>
        </td>
    `;
    
    row.after(detailsRow);
}

function editVideoInline(id) {
    const videos = Storage.get('videos') || [];
    const video = videos.find(v => v.id === id);
    if (!video) return;
    
    const detailsRow = document.querySelector('.video-details-row');
    if (!detailsRow) return;
    
    detailsRow.innerHTML = `
        <td colspan="7" style="background:#f8fafc;padding:25px;max-height:500px;overflow-y:auto;">
            <h4 style="margin-bottom:20px;"><i class="fas fa-edit"></i> Videonu Redaktə Et</h4>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;">
                <div class="form-group">
                    <label>Başlıq</label>
                    <input type="text" class="form-control" id="editVideoTitle_${id}" value="${video.title}">
                </div>
                <div class="form-group">
                    <label>Kateqoriya</label>
                    <select class="form-control" id="editVideoCategory_${id}">
                        <option value="Həndəsə" ${video.category === 'Həndəsə' ? 'selected' : ''}>Həndəsə</option>
                        <option value="Cəbr" ${video.category === 'Cəbr' ? 'selected' : ''}>Cəbr</option>
                        <option value="Analiz" ${video.category === 'Analiz' ? 'selected' : ''}>Analiz</option>
                        <option value="Triqonometriya" ${video.category === 'Triqonometriya' ? 'selected' : ''}>Triqonometriya</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Müddət</label>
                    <input type="text" class="form-control" id="editVideoDuration_${id}" value="${video.duration}">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select class="form-control" id="editVideoStatus_${id}">
                        <option value="active" ${video.status === 'active' ? 'selected' : ''}>Aktiv</option>
                        <option value="draft" ${video.status === 'draft' ? 'selected' : ''}>Qaralama</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Təsvir</label>
                <textarea class="form-control" id="editVideoDescription_${id}" rows="3">${video.description || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;margin-top:15px;">
                <button class="btn btn-primary" onclick="saveVideoEdit(${video.id})">
                    <i class="fas fa-save"></i> Yadda Saxla
                </button>
                <button class="btn btn-secondary" onclick="document.querySelector('.video-details-row').remove()">
                    <i class="fas fa-times"></i> Ləğv Et
                </button>
            </div>
        </td>
    `;
}

function saveVideoEdit(id) {
    const videos = Storage.get('videos') || [];
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) return;
    
    videos[index].title = document.getElementById(`editVideoTitle_${id}`).value;
    videos[index].category = document.getElementById(`editVideoCategory_${id}`).value;
    videos[index].duration = document.getElementById(`editVideoDuration_${id}`).value;
    videos[index].status = document.getElementById(`editVideoStatus_${id}`).value;
    videos[index].description = document.getElementById(`editVideoDescription_${id}`).value;
    
    Storage.set('videos', videos);
    
    document.querySelector('.video-details-row').remove();
    loadVideos();
    showSuccessMessage('Video yeniləndi!');
}

function editVideo(id) {
    editVideoInline(id);
    event.target.closest('tr').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteVideo(id) {
    if (!confirm('Bu videonu silmək istədiyinizdən əminsiniz?')) return;
    
    const videos = Storage.get('videos') || [];
    const filtered = videos.filter(v => v.id !== id);
    Storage.set('videos', filtered);
    
    const detailsRow = document.querySelector('.video-details-row');
    if (detailsRow) detailsRow.remove();
    
    loadVideos();
    showSuccessMessage('Video silindi!');
}

function showAddVideoModal() {
    window.location.href = 'video-upload.html';
}

// Test Actions - Inline Editing
function viewTest(id) {
    const tests = Storage.get('tests') || [];
    const test = tests.find(t => t.id === id);
    if (!test) return;
    
    const row = event.target.closest('tr');
    const existingDetails = row.nextElementSibling;
    
    if (existingDetails && existingDetails.classList.contains('test-details-row')) {
        existingDetails.remove();
        return;
    }
    
    const detailsRow = document.createElement('tr');
    detailsRow.className = 'test-details-row';
    detailsRow.innerHTML = `
        <td colspan="7" style="background:#f8fafc;padding:25px;">
            <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
                <div>
                    <h4 style="font-size:14px;color:var(--gray);margin-bottom:10px;">Sınaq Məlumatları</h4>
                    <p><strong>Başlıq:</strong> ${test.title}</p>
                    <p><strong>Sual Sayı:</strong> ${test.questions?.length || 0}</p>
                    <p><strong>Müddət:</strong> ${test.duration} dəqiqə</p>
                    <p><strong>Kateqoriya:</strong> ${test.category || 'Ümumi'}</p>
                    ${test.description ? `<p><strong>Təsvir:</strong> ${test.description}</p>` : ''}
                </div>
                <div>
                    <h4 style="font-size:14px;color:var(--gray);margin-bottom:10px;">Əməliyyatlar</h4>
                    <button class="btn btn-primary btn-sm" onclick="editTestInline(${test.id})" style="margin-bottom:8px;width:100%;">
                        <i class="fas fa-edit"></i> Redaktə Et
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTest(${test.id})" style="width:100%;">
                        <i class="fas fa-trash"></i> Sil
                    </button>
                </div>
            </div>
        </td>
    `;
    
    row.after(detailsRow);
}

function editTestInline(id) {
    const tests = Storage.get('tests') || [];
    const test = tests.find(t => t.id === id);
    if (!test) return;
    
    const detailsRow = document.querySelector('.test-details-row');
    if (!detailsRow) return;
    
    detailsRow.innerHTML = `
        <td colspan="7" style="background:#f8fafc;padding:25px;max-height:500px;overflow-y:auto;">
            <h4 style="margin-bottom:20px;"><i class="fas fa-edit"></i> Sınağı Redaktə Et</h4>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;">
                <div class="form-group">
                    <label>Başlıq</label>
                    <input type="text" class="form-control" id="editTestTitle_${id}" value="${test.title}">
                </div>
                <div class="form-group">
                    <label>Kateqoriya</label>
                    <input type="text" class="form-control" id="editTestCategory_${id}" value="${test.category || 'Ümumi'}">
                </div>
                <div class="form-group">
                    <label>Müddət (dəqiqə)</label>
                    <input type="number" class="form-control" id="editTestDuration_${id}" value="${test.duration}">
                </div>
                <div class="form-group">
                    <label>Çətinlik</label>
                    <select class="form-control" id="editTestDifficulty_${id}">
                        <option value="Asan" ${test.difficulty === 'Asan' ? 'selected' : ''}>Asan</option>
                        <option value="Orta" ${test.difficulty === 'Orta' ? 'selected' : ''}>Orta</option>
                        <option value="Çətin" ${test.difficulty === 'Çətin' ? 'selected' : ''}>Çətin</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Təsvir</label>
                <textarea class="form-control" id="editTestDescription_${id}" rows="3">${test.description || ''}</textarea>
            </div>
            <div style="display:flex;gap:10px;margin-top:15px;">
                <button class="btn btn-primary" onclick="saveTestEdit(${test.id})">
                    <i class="fas fa-save"></i> Yadda Saxla
                </button>
                <button class="btn btn-secondary" onclick="document.querySelector('.test-details-row').remove()">
                    <i class="fas fa-times"></i> Ləğv Et
                </button>
            </div>
        </td>
    `;
}

function saveTestEdit(id) {
    const tests = Storage.get('tests') || [];
    const index = tests.findIndex(t => t.id === id);
    if (index === -1) return;
    
    tests[index].title = document.getElementById(`editTestTitle_${id}`).value;
    tests[index].category = document.getElementById(`editTestCategory_${id}`).value;
    tests[index].duration = parseInt(document.getElementById(`editTestDuration_${id}`).value);
    tests[index].difficulty = document.getElementById(`editTestDifficulty_${id}`).value;
    tests[index].description = document.getElementById(`editTestDescription_${id}`).value;
    
    Storage.set('tests', tests);
    
    document.querySelector('.test-details-row').remove();
    loadTests();
    showSuccessMessage('Sınaq yeniləndi!');
}

function editTest(id) {
    editTestInline(id);
    event.target.closest('tr').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteTest(id) {
    if (!confirm('Bu sınağı silmək istədiyinizdən əminsiniz?')) return;
    
    const tests = Storage.get('tests') || [];
    const filtered = tests.filter(t => t.id !== id);
    Storage.set('tests', filtered);
    
    const detailsRow = document.querySelector('.test-details-row');
    if (detailsRow) detailsRow.remove();
    
    loadTests();
    showSuccessMessage('Sınaq silindi!');
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
    showConfirm('Bu müəllimi silmək istədiyinizdən əminsiniz?', () => {
        const teachers = Storage.get('teachers') || [];
        const filtered = teachers.filter(t => t.id !== id);
        Storage.set('teachers', filtered);
        showNotification('Müəllim uğurla silindi', 'success');
        loadTeachers();
    });
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
        showSuccessMessage('Müəllim tapılmadı!');
        return;
    }
    
    const row = event.target.closest('tr');
    const existingEdit = row.nextElementSibling;
    
    if (existingEdit && existingEdit.classList.contains('teacher-edit-row')) {
        existingEdit.remove();
        return;
    }
    
    // Create edit row with scrollable content
    const editRow = document.createElement('tr');
    editRow.className = 'teacher-edit-row';
    editRow.innerHTML = `
        <td colspan="7" style="background:#f8fafc;padding:0;">
            <div style="max-height:500px;overflow-y:auto;padding:25px;">
                <h4 style="margin-bottom:20px;"><i class="fas fa-edit"></i> Müəllimi Redaktə Et</h4>
                
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:15px;">
                    <div class="form-group">
                        <label>Ad Soyad</label>
                        <input type="text" class="form-control" id="editTeacherName_${id}" value="${teacher.name}">
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" class="form-control" id="editTeacherEmail_${id}" value="${teacher.email || ''}" disabled style="background:#e2e8f0;">
                    </div>
                    
                    <div class="form-group">
                        <label>Vəzifə/Başlıq</label>
                        <input type="text" class="form-control" id="editTeacherTitle_${id}" value="${teacher.title || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Telefon</label>
                        <input type="tel" class="form-control" id="editTeacherPhone_${id}" value="${teacher.phone || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Təcrübə (il)</label>
                        <input type="number" class="form-control" id="editTeacherExperience_${id}" value="${teacher.experience || 0}">
                    </div>
                    
                    <div class="form-group">
                        <label>Reytinq</label>
                        <input type="number" class="form-control" id="editTeacherRating_${id}" min="1" max="5" step="0.1" value="${teacher.rating || 5.0}">
                    </div>
                    
                    <div class="form-group">
                        <label>Tələbə Sayı</label>
                        <input type="number" class="form-control" id="editTeacherStudents_${id}" value="${teacher.students || 0}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Fənlər (vergüllə ayırın)</label>
                    <input type="text" class="form-control" id="editTeacherSubjects_${id}" value="${teacher.subjects || ''}">
                </div>
                
                <div class="form-group">
                    <label>Şəkil URL</label>
                    <input type="url" class="form-control" id="editTeacherImage_${id}" value="${teacher.image || ''}" placeholder="https://example.com/image.jpg">
                    <small style="color:var(--gray);font-size:12px;">Müəllimin şəklinin URL-ni daxil edin</small>
                </div>
                
                <div class="form-group">
                    <label>Bio</label>
                    <textarea class="form-control" id="editTeacherBio_${id}" rows="3">${teacher.bio || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Təhsil</label>
                    <textarea class="form-control" id="editTeacherEducation_${id}" rows="2">${teacher.education || ''}</textarea>
                </div>
                
                <div style="display:flex;gap:10px;margin-top:15px;">
                    <button class="btn btn-primary" onclick="saveTeacherEdit(${id})">
                        <i class="fas fa-save"></i> Yadda Saxla
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.teacher-edit-row').remove()">
                        <i class="fas fa-times"></i> Ləğv Et
                    </button>
                </div>
            </div>
        </td>
    `;
    
    row.after(editRow);
    editRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function saveTeacherEdit(id) {
    const teachers = Storage.get('teachers') || [];
    const index = teachers.findIndex(t => t.id === id);
    
    if (index === -1) {
        showSuccessMessage('Müəllim tapılmadı!');
        return;
    }
    
    // Update teacher data
    teachers[index] = {
        ...teachers[index],
        name: document.getElementById(`editTeacherName_${id}`).value,
        title: document.getElementById(`editTeacherTitle_${id}`).value,
        bio: document.getElementById(`editTeacherBio_${id}`).value,
        subjects: document.getElementById(`editTeacherSubjects_${id}`).value,
        image: document.getElementById(`editTeacherImage_${id}`).value,
        phone: document.getElementById(`editTeacherPhone_${id}`).value,
        experience: parseInt(document.getElementById(`editTeacherExperience_${id}`).value) || 0,
        rating: parseFloat(document.getElementById(`editTeacherRating_${id}`).value) || 5.0,
        students: parseInt(document.getElementById(`editTeacherStudents_${id}`).value) || 0,
        education: document.getElementById(`editTeacherEducation_${id}`).value,
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
    
    document.querySelector('.teacher-edit-row').remove();
    loadTeachers();
    showSuccessMessage('Müəllim məlumatları yeniləndi!');
}

function deleteTeacher(id) {
    if (!confirm('Bu müəllimi silmək istədiyinizə əminsiniz?')) {
        return;
    }
    
    let teachers = Storage.get('teachers') || [];
    teachers = teachers.filter(t => t.id !== id);
    Storage.set('teachers', teachers);
    
    const editRow = document.querySelector('.teacher-edit-row');
    if (editRow) editRow.remove();
    
    loadTeachers();
    showSuccessMessage('Müəllim silindi!');
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


// ==================== DEVICE SESSIONS ====================

function viewUserSessions() {
    const sessions = Storage.get('userSessions') || {};
    const allUsers = Storage.get('allUsers') || [];
    
    let sessionInfo = '🔒 Aktiv Cihaz Sessiyaları\n\n';
    
    if (Object.keys(sessions).length === 0) {
        sessionInfo += 'Heç bir aktiv sessiya yoxdur.';
    } else {
        Object.entries(sessions).forEach(([userId, session]) => {
            const user = allUsers.find(u => u.id == userId);
            const userName = user ? user.name : `User ${userId}`;
            const loginTime = new Date(session.loginTime).toLocaleString('az-AZ');
            
            sessionInfo += `👤 ${userName}\n`;
            sessionInfo += `📱 Cihaz: ${session.deviceId.substring(0, 20)}...\n`;
            sessionInfo += `🕐 Giriş: ${loginTime}\n\n`;
        });
    }
    
    alert(sessionInfo);
}

// Clear all sessions (force logout all users)
function clearAllSessions() {
    if (!confirm('Bütün istifadəçiləri çıxış etdirmək istədiyinizə əminsiniz?')) {
        return;
    }
    
    Storage.set('userSessions', {});
    showSuccessMessage('Bütün sessiyalar təmizləndi!');
}


// ==================== ACTIVITY TRACKING ====================

function logActivity(user, action, status = 'success') {
    const activities = Storage.get('activities') || [];
    
    const activity = {
        id: Date.now(),
        user: user,
        action: action,
        date: new Date().toLocaleDateString('az-AZ'),
        timestamp: new Date().toISOString(),
        status: status,
        icon: getActivityIcon(action)
    };
    
    activities.unshift(activity); // Add to beginning
    
    // Keep only last 100 activities
    if (activities.length > 100) {
        activities.length = 100;
    }
    
    Storage.set('activities', activities);
}

function getActivityIcon(action) {
    if (action.includes('qeydiyyat')) return 'user-plus';
    if (action.includes('Video')) return 'video';
    if (action.includes('Sınaq') || action.includes('Test')) return 'clipboard-list';
    if (action.includes('Müəllim')) return 'chalkboard-teacher';
    if (action.includes('Xəbər')) return 'newspaper';
    if (action.includes('Balans')) return 'wallet';
    if (action.includes('Giriş')) return 'sign-in-alt';
    if (action.includes('Çıxış')) return 'sign-out-alt';
    return 'info-circle';
}

// Update existing functions to log activities
const originalSaveNewUser = saveNewUser;
saveNewUser = function() {
    const result = originalSaveNewUser.apply(this, arguments);
    const name = document.getElementById('newUserName').value;
    logActivity('Admin', `Yeni istifadəçi əlavə edildi: ${name}`);
    return result;
};

const originalSaveNewTeacher = saveNewTeacher;
saveNewTeacher = function() {
    const result = originalSaveNewTeacher.apply(this, arguments);
    const name = document.getElementById('newTeacherName').value;
    logActivity('Admin', `Yeni müəllim əlavə edildi: ${name}`);
    return result;
};


// ==================== SUSPICIOUS ACTIVITIES ====================

function loadSuspiciousActivities() {
    const activities = Storage.get('suspiciousActivities') || [];
    const tbody = document.getElementById('suspiciousActivitiesTable');
    
    if (!tbody) return;
    
    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#9ca3af;">Şübhəli fəaliyyət yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = activities.map(activity => `
        <tr style="background: ${activity.status === 'blocked' ? '#fee2e2' : '#fef3c7'};">
            <td>${activity.id}</td>
            <td>
                <strong>${activity.userName}</strong><br>
                <small style="color:#6b7280;">${activity.email}</small>
            </td>
            <td>${activity.activity}</td>
            <td>
                <span style="padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;
                    background:${activity.status === 'blocked' ? '#dc2626' : '#f59e0b'};
                    color:white;">
                    ${activity.attempts} cəhd
                </span>
            </td>
            <td>
                <small>${activity.deviceId.substring(0, 20)}...</small>
            </td>
            <td>
                ${activity.date}<br>
                <small style="color:#6b7280;">${activity.time}</small>
            </td>
            <td>
                ${activity.status === 'blocked' ? 
                    `<button class="btn btn-success btn-sm" onclick="unfreezeUserAccount(${activity.userId})">
                        <i class="fas fa-unlock"></i> Aç
                    </button>` :
                    `<span style="color:#f59e0b;"><i class="fas fa-exclamation-triangle"></i> Xəbərdarlıq</span>`
                }
            </td>
        </tr>
    `).join('');
}

function unfreezeUserAccount(userId) {
    showConfirm('Bu istifadəçinin hesabını açmaq istədiyinizə əminsiniz?', () => {
        const result = unfreezeAccount(userId);
        if (result) {
            showNotification('Hesab uğurla açıldı', 'success');
            loadSuspiciousActivities();
            loadUsers();
        } else {
            showNotification('Xəta baş verdi', 'error');
        }
    });
}

function clearSuspiciousActivities() {
    showConfirm('Bütün şübhəli fəaliyyət qeydlərini silmək istədiyinizə əminsiniz?', () => {
        Storage.set('suspiciousActivities', []);
        showNotification('Qeydlər təmizləndi', 'success');
        loadSuspiciousActivities();
    });
}

// ==================== FROZEN ACCOUNTS MANAGEMENT ====================

function loadFrozenAccounts() {
    const allUsers = Storage.get('allUsers') || [];
    const frozenUsers = allUsers.filter(u => u.frozen);
    const tbody = document.getElementById('frozenAccountsTable');
    
    if (!tbody) return;
    
    if (frozenUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#9ca3af;">Dondurulmuş hesab yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = frozenUsers.map(user => `
        <tr style="background:#fee2e2;">
            <td>${user.id}</td>
            <td>
                <strong>${user.name}</strong><br>
                <small style="color:#6b7280;">${user.email}</small>
            </td>
            <td>${user.frozenReason || 'Məlum deyil'}</td>
            <td>
                <span style="color:#dc2626;font-weight:600;">
                    ${user.balanceBeforeFreeze || 0} AZN
                </span>
            </td>
            <td>
                ${new Date(user.frozenAt).toLocaleDateString('az-AZ')}<br>
                <small style="color:#6b7280;">${new Date(user.frozenAt).toLocaleTimeString('az-AZ')}</small>
            </td>
            <td>
                <button class="btn btn-success btn-sm" onclick="unfreezeUserAccount(${user.id})">
                    <i class="fas fa-unlock"></i> Hesabı Aç
                </button>
                <button class="btn btn-primary btn-sm" onclick="restoreBalance(${user.id})">
                    <i class="fas fa-coins"></i> Balansı Bərpa Et
                </button>
            </td>
        </tr>
    `).join('');
}

function restoreBalance(userId) {
    showConfirm('Bu istifadəçinin balansını bərpa etmək istəyirsiniz?', () => {
        const allUsers = Storage.get('allUsers') || [];
        const user = allUsers.find(u => u.id === userId);
        
        if (user && user.balanceBeforeFreeze) {
            user.balance = user.balanceBeforeFreeze;
            user.balanceRestored = true;
            user.balanceRestoredAt = new Date().toISOString();
            
            Storage.set('allUsers', allUsers);
            
            showNotification(`${user.balanceBeforeFreeze} AZN bərpa edildi`, 'success');
            loadFrozenAccounts();
            loadUsers();
        }
    });
}


// ==================== PREMIUM MANAGEMENT ====================

function loadPremiumRequests() {
    const requests = Storage.get('premiumRequests') || [];
    const tbody = document.getElementById('premiumRequestsTable');
    
    if (!tbody) return;
    
    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#9ca3af;">Premium müraciət yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = requests.map(req => `
        <tr style="background: ${req.status === 'approved' ? '#d1fae5' : req.status === 'rejected' ? '#fee2e2' : '#fff'};">
            <td>${req.id}</td>
            <td>
                <strong>${req.userName}</strong><br>
                <small style="color:#6b7280;">${req.userEmail}</small>
            </td>
            <td>
                <strong style="color:#667eea;">${req.packageName || 'Premium'}</strong><br>
                <small style="color:#6b7280;">${req.duration} gün - ${req.price} AZN</small>
            </td>
            <td>
                ${req.date}<br>
                <small style="color:#6b7280;">${req.time}</small>
            </td>
            <td>
                <span style="padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;
                    background:${req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b'};
                    color:white;">
                    ${req.status === 'approved' ? 'Təsdiqləndi' : req.status === 'rejected' ? 'Rədd edildi' : 'Gözləyir'}
                </span>
            </td>
            <td>
                ${req.status === 'pending' ? `
                    <button class="btn btn-success btn-sm" onclick="approvePremiumRequest(${req.userId}, ${req.id}, ${req.duration})">
                        <i class="fas fa-check"></i> Təsdiqlə
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectPremium(${req.id})">
                        <i class="fas fa-times"></i> Rədd Et
                    </button>
                ` : req.status === 'approved' ? `
                    <button class="btn btn-warning btn-sm" onclick="revokePremium(${req.userId})">
                        <i class="fas fa-ban"></i> Ləğv Et
                    </button>
                ` : '-'}
            </td>
        </tr>
    `).join('');
}

function approvePremiumRequest(userId, requestId, duration) {
    showConfirm(`Bu istifadəçiyə ${duration} günlük premium vermək istəyirsiniz?`, async () => {
        const allUsers = Storage.get('allUsers') || [];
        const user = allUsers.find(u => u.id === userId);
        
        if (user) {
            user.premium = true;
            user.premiumActivatedAt = new Date().toISOString();
            
            // Set expiry date based on package duration
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + duration);
            user.premiumExpiresAt = expiryDate.toISOString();
            
            Storage.set('allUsers', allUsers);
            
            // Update request status
            const requests = Storage.get('premiumRequests') || [];
            const request = requests.find(r => r.id === requestId);
            if (request) {
                request.status = 'approved';
                request.approvedAt = new Date().toISOString();
                request.approvedBy = getCurrentUser()?.name || 'Admin';
                Storage.set('premiumRequests', requests);
            }
            
            // Log activity
            logActivity(user.name, `Premium aktivləşdirildi (${duration} gün)`, 'success');
            
            showNotification(`${duration} günlük premium verildi`, 'success');
            loadPremiumRequests();
            loadPremiumUsers();
            loadUsers();
        }
    });
}

function rejectPremium(requestId) {
    showConfirm('Bu müraciəti rədd etmək istəyirsiniz?', () => {
        const requests = Storage.get('premiumRequests') || [];
        const request = requests.find(r => r.id === requestId);
        
        if (request) {
            request.status = 'rejected';
            request.rejectedAt = new Date().toISOString();
            request.rejectedBy = getCurrentUser()?.name || 'Admin';
            Storage.set('premiumRequests', requests);
            
            showNotification('Müraciət rədd edildi', 'info');
            loadPremiumRequests();
        }
    });
}

function revokePremium(userId) {
    showConfirm('Bu istifadəçinin premium-unu ləğv etmək istəyirsiniz?', () => {
        const allUsers = Storage.get('allUsers') || [];
        const user = allUsers.find(u => u.id === userId);
        
        if (user) {
            user.premium = false;
            user.premiumRevokedAt = new Date().toISOString();
            Storage.set('allUsers', allUsers);
            
            logActivity(user.name, 'Premium ləğv edildi', 'warning');
            
            showNotification('Premium ləğv edildi', 'warning');
            loadPremiumRequests();
            loadUsers();
        }
    });
}

function loadPremiumUsers() {
    const allUsers = Storage.get('allUsers') || [];
    const premiumUsers = allUsers.filter(u => u.premium);
    const tbody = document.getElementById('premiumUsersTable');
    
    if (!tbody) return;
    
    if (premiumUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;">Premium istifadəçi yoxdur</td></tr>';
        return;
    }
    
    tbody.innerHTML = premiumUsers.map(user => {
        const expiryDate = user.premiumExpiresAt ? new Date(user.premiumExpiresAt) : null;
        const daysLeft = expiryDate ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
        const isExpired = expiryDate && expiryDate < new Date();
        
        return `
            <tr style="background:${isExpired ? '#fee2e2' : '#d1fae5'};">
                <td>${user.id}</td>
                <td>
                    <strong>${user.name}</strong><br>
                    <small style="color:#6b7280;">${user.email}</small>
                </td>
                <td>
                    ${new Date(user.premiumActivatedAt).toLocaleDateString('az-AZ')}
                </td>
                <td>
                    ${expiryDate ? `
                        ${expiryDate.toLocaleDateString('az-AZ')}<br>
                        <small style="color:${isExpired ? '#dc2626' : daysLeft <= 7 ? '#f59e0b' : '#10b981'};">
                            ${isExpired ? 'Bitib' : `${daysLeft} gün qalıb`}
                        </small>
                    ` : '<span style="color:#10b981;font-weight:600;">Ömürlük</span>'}
                </td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="revokePremium(${user.id})">
                        <i class="fas fa-ban"></i> Ləğv Et
                    </button>
                    ${expiryDate ? `
                        <button class="btn btn-primary btn-sm" onclick="extendPremium(${user.id})">
                            <i class="fas fa-plus"></i> Uzat
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function extendPremium(userId) {
    const days = prompt('Neçə gün uzatmaq istəyirsiniz?', '30');
    if (!days || isNaN(days)) return;
    
    const allUsers = Storage.get('allUsers') || [];
    const user = allUsers.find(u => u.id === userId);
    
    if (user && user.premiumExpiresAt) {
        const currentExpiry = new Date(user.premiumExpiresAt);
        const newExpiry = new Date(currentExpiry);
        newExpiry.setDate(newExpiry.getDate() + parseInt(days));
        
        user.premiumExpiresAt = newExpiry.toISOString();
        Storage.set('allUsers', allUsers);
        
        showNotification(`Premium ${days} gün uzadıldı`, 'success');
        loadPremiumUsers();
    }
}


// ==================== ACTIVE USERS (REAL-TIME) ====================

let activeUsersInterval = null;

async function loadActiveUsers() {
    // Load from Upstash first for real-time data
    let activeUsers = {};
    
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const cloudData = await upstash.get('activeUsers');
            if (cloudData) {
                activeUsers = cloudData;
                // Sync to local
                localStorage.setItem('activeUsers', JSON.stringify(activeUsers));
            } else {
                activeUsers = Storage.get('activeUsers') || {};
            }
        } catch (e) {
            activeUsers = Storage.get('activeUsers') || {};
        }
    } else {
        activeUsers = Storage.get('activeUsers') || {};
    }
    
    const now = Date.now();
    const fiveMin = 5 * 60 * 1000;
    
    // Filter only truly active (last 5 min)
    const active = Object.values(activeUsers).filter(u => now - u.lastSeen < fiveMin);
    
    const container = document.getElementById('activeUsersContainer');
    const countEl = document.getElementById('activeUsersCount');
    
    if (countEl) countEl.textContent = active.length;
    
    // Update stats
    const totalEl = document.getElementById('activeCountTotal');
    const premiumEl = document.getElementById('activePremiumCount');
    const freeEl = document.getElementById('activeFreeCount');
    const updateEl = document.getElementById('activeLastUpdate');
    
    if (totalEl) totalEl.textContent = active.length;
    if (premiumEl) premiumEl.textContent = active.filter(u => u.premium).length;
    if (freeEl) freeEl.textContent = active.filter(u => !u.premium && u.role !== 'admin').length;
    if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('az-AZ');
    
    if (!container) return;
    
    if (active.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:#9ca3af;"><i class="fas fa-users" style="font-size:40px;opacity:0.3;margin-bottom:10px;display:block;"></i><p>Aktiv istifadəçi yoxdur</p></div>';
        return;
    }
    
    const pageNames = {
        'index.html': '🏠 Ana Səhifə', 'videos.html': '📹 Videolar',
        'tests.html': '📝 Sınaqlar', 'dashboard.html': '📊 Kabinet',
        'teachers.html': '👨‍🏫 Müəllimlər', 'news.html': '📰 Xəbərlər',
        'faq.html': '❓ FAQ', 'admin.html': '⚙️ Admin Panel',
        'login.html': '🔑 Giriş', 'register.html': '📋 Qeydiyyat'
    };
    
    container.innerHTML = active.map(u => {
        const lastSeenMin = Math.floor((now - u.lastSeen) / 60000);
        const lastSeenText = lastSeenMin === 0 ? 'İndi aktiv' : `${lastSeenMin} dəq əvvəl`;
        const pageName = pageNames[u.page] || u.page;
        const initial = (u.userName || '?').charAt(0).toUpperCase();
        const bgColor = u.role === 'admin' ? '#ef4444' : u.premium ? '#fbbf24' : '#667eea';
        
        return `
            <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;background:#f9fafb;margin-bottom:8px;border-left:3px solid ${bgColor};">
                <div style="width:40px;height:40px;border-radius:50%;background:${bgColor};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:16px;flex-shrink:0;">
                    ${initial}
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:14px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        ${u.userName || 'Naməlum'}
                        ${u.role === 'admin' ? '<span style="background:#ef4444;color:white;font-size:10px;padding:2px 6px;border-radius:4px;">Admin</span>' : ''}
                        ${u.premium ? '<span style="background:#fbbf24;color:white;font-size:10px;padding:2px 6px;border-radius:4px;">👑 Premium</span>' : ''}
                    </div>
                    <div style="font-size:12px;color:#6b7280;">${u.userEmail || ''}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                    <div style="font-size:12px;color:#667eea;font-weight:500;">${pageName}</div>
                    <div style="font-size:11px;color:#9ca3af;">${lastSeenText}</div>
                </div>
                <div style="width:8px;height:8px;border-radius:50%;background:${lastSeenMin === 0 ? '#10b981' : '#f59e0b'};flex-shrink:0;"></div>
            </div>
        `;
    }).join('');
}

function startActiveUsersTracking() {
    loadActiveUsers();
    if (activeUsersInterval) clearInterval(activeUsersInterval);
    activeUsersInterval = setInterval(loadActiveUsers, 30000); // Every 30 seconds
}

function stopActiveUsersTracking() {
    if (activeUsersInterval) {
        clearInterval(activeUsersInterval);
        activeUsersInterval = null;
    }
}

// ==================== ENHANCED PREMIUM MANAGEMENT ====================

function loadPremiumRequestsEnhanced() {
    // Load from Upstash for real-time sync
    const loadData = async () => {
        let requests = [];
        
        if (typeof upstash !== 'undefined' && upstash) {
            try {
                const cloudData = await upstash.get('premiumRequests');
                if (cloudData) {
                    requests = cloudData;
                    localStorage.setItem('premiumRequests', JSON.stringify(requests));
                } else {
                    requests = Storage.get('premiumRequests') || [];
                }
            } catch (e) {
                requests = Storage.get('premiumRequests') || [];
            }
        } else {
            requests = Storage.get('premiumRequests') || [];
        }
        
        const tbody = document.getElementById('premiumRequestsTable');
        if (!tbody) return;
        
        const pending = requests.filter(r => r.status === 'pending');
        const others = requests.filter(r => r.status !== 'pending');
        const sorted = [...pending, ...others];
        
        // Update badge
        const badge = document.getElementById('premiumPendingBadge');
        if (badge) {
            badge.textContent = pending.length;
            badge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
        }
        
        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;"><i class="fas fa-inbox" style="font-size:40px;opacity:0.3;display:block;margin-bottom:10px;"></i>Premium müraciət yoxdur</td></tr>';
            return;
        }
        
        const planLabels = {
            premium1: { label: '⭐ Premium 1', color: '#667eea', duration: '1 ay', price: '15₼' },
            premium6: { label: '💎 Premium 6', color: '#8b5cf6', duration: '6 ay', price: '75₼' },
            premium12: { label: '🏆 Premium 12', color: '#f59e0b', duration: '1 il', price: '120₼' }
        };
        
        tbody.innerHTML = sorted.map(req => {
            const plan = planLabels[req.plan] || { label: 'Naməlum', color: '#6b7280', duration: '-', price: '-' };
            const isPending = req.status === 'pending';
            
            return `
            <tr style="background:${req.status === 'approved' ? '#f0fdf4' : req.status === 'rejected' ? '#fef2f2' : '#fffbeb'};">
                <td>
                    <div style="font-weight:600;">${req.userName || ''}</div>
                    <div style="font-size:12px;color:#6b7280;">${req.userEmail || ''}</div>
                </td>
                <td>
                    <span style="padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${plan.color}22;color:${plan.color};">
                        ${plan.label}
                    </span>
                    <div style="font-size:11px;color:#6b7280;margin-top:3px;">${plan.duration} · ${plan.price}</div>
                </td>
                <td>
                    <div style="font-size:13px;">${req.date || ''}</div>
                    <div style="font-size:11px;color:#9ca3af;">${req.time || ''}</div>
                </td>
                <td>
                    <span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;
                        background:${req.status === 'approved' ? '#dcfce7' : req.status === 'rejected' ? '#fee2e2' : '#fef3c7'};
                        color:${req.status === 'approved' ? '#16a34a' : req.status === 'rejected' ? '#dc2626' : '#d97706'};">
                        ${req.status === 'approved' ? '✅ Təsdiqləndi' : req.status === 'rejected' ? '❌ Rədd edildi' : '⏳ Gözləyir'}
                    </span>
                </td>
                <td>
                    ${isPending ? `
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="btn btn-success btn-sm" onclick="approvePremiumWithDuration(${req.userId}, ${req.id}, '${req.plan}')">
                                <i class="fas fa-check"></i> Təsdiqlə
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="rejectPremium(${req.id})">
                                <i class="fas fa-times"></i> Rədd Et
                            </button>
                        </div>
                    ` : req.status === 'approved' ? `
                        <button class="btn btn-warning btn-sm" onclick="revokePremium(${req.userId})">
                            <i class="fas fa-ban"></i> Ləğv Et
                        </button>
                    ` : `<span style="color:#9ca3af;font-size:12px;">-</span>`}
                </td>
            </tr>`;
        }).join('');
    };
    
    loadData();
}

function approvePremiumWithDuration(userId, requestId, planId) {
    const planDurations = { premium1: 30, premium6: 180, premium12: 365 };
    const duration = planDurations[planId] || 30;
    
    const planNames = { premium1: '1 Aylıq (30 gün)', premium6: '6 Aylıq (180 gün)', premium12: '1 İllik (365 gün)' };
    const planName = planNames[planId] || `${duration} gün`;
    
    showConfirm(`Bu istifadəçiyə <strong>${planName}</strong> premium vermək istəyirsiniz?`, async () => {
        const allUsers = Storage.get('allUsers') || [];
        const user = allUsers.find(u => u.id === userId);
        
        if (user) {
            user.premium = true;
            user.premiumActivatedAt = new Date().toISOString();
            user.premiumPlan = planId;
            
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + duration);
            user.premiumExpiresAt = expiryDate.toISOString();
            
            Storage.set('allUsers', allUsers);
            
            // Update request
            const requests = Storage.get('premiumRequests') || [];
            const req = requests.find(r => r.id === requestId);
            if (req) {
                req.status = 'approved';
                req.approvedAt = new Date().toISOString();
                req.approvedBy = getCurrentUser()?.name || 'Admin';
                req.duration = duration;
                Storage.set('premiumRequests', requests);
            }
            
            // Sync to Upstash
            if (typeof upstash !== 'undefined' && upstash) {
                try {
                    await upstash.set('allUsers', allUsers, 86400 * 30);
                    await upstash.set('premiumRequests', requests, 86400 * 30);
                } catch(e) { console.error('Upstash sync error:', e); }
            }
            
            logActivity(user.name, `Premium aktivləşdirildi (${planName})`, 'success');
            showNotification(`✅ ${user.name} üçün premium aktivləşdirildi (${planName})`, 'success');
            loadPremiumRequestsEnhanced();
            loadPremiumUsers();
        }
    });
}


// ==================== POINTS LEADERBOARD ====================

async function loadPointsLeaderboard() {
    const container = document.getElementById('leaderboardTable');
    if (!container) return;
    
    container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Yüklənir...</td></tr>';
    
    // Load from Upstash
    let allPoints = {};
    if (typeof upstash !== 'undefined' && upstash) {
        try {
            const cloud = await upstash.get('userPoints');
            if (cloud) allPoints = cloud;
        } catch (e) {}
    }
    if (!Object.keys(allPoints).length) {
        allPoints = Storage.get('userPoints') || {};
    }
    
    const allUsers = Storage.get('allUsers') || [];
    
    const leaderboard = Object.values(allPoints)
        .map(p => {
            const user = allUsers.find(u => u.id === p.userId);
            return {
                userId: p.userId,
                userName: user ? user.name : 'Naməlum',
                userEmail: user ? user.email : '',
                premium: user ? user.premium : false,
                total: p.total || 0,
                watchedCount: (p.watchedVideos || []).length,
                historyCount: (p.history || []).length
            };
        })
        .sort((a, b) => b.total - a.total);
    
    if (leaderboard.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#9ca3af;">Xal məlumatı yoxdur</td></tr>';
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉'];
    
    container.innerHTML = leaderboard.map((entry, i) => `
        <tr style="background:${i < 3 ? '#fffbeb' : 'white'};">
            <td style="font-size:20px;text-align:center;">${medals[i] || (i + 1)}</td>
            <td>
                <strong>${entry.userName}</strong><br>
                <small style="color:#6b7280;">${entry.userEmail}</small>
            </td>
            <td>
                ${entry.premium ? '<span style="background:#fbbf24;color:white;padding:2px 8px;border-radius:10px;font-size:12px;">👑 Premium</span>' : '<span style="color:#9ca3af;font-size:12px;">Pulsuz</span>'}
            </td>
            <td style="text-align:center;">
                <span style="font-size:12px;color:#6b7280;">${entry.watchedCount} video</span>
            </td>
            <td>
                <span style="font-size:20px;font-weight:800;color:#667eea;">${entry.total}</span>
                <span style="color:#9ca3af;font-size:12px;"> xal</span>
            </td>
        </tr>
    `).join('');
}
