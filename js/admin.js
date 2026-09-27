/**
 * admin.js  —  Admin Panel Logic
 * All data operations go through API.* (Vercel serverless → Upstash Redis).
 * No direct Storage/localStorage calls for shared data.
 */

'use strict';

// ════════════════════════════════════════════════════════
//  Boot: require admin, then load dashboard
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAdminPage();   // from app.js — redirects if not admin
    if (!user) return;
    renderAdminUser(user);
    await Promise.all([
        loadDashboardStats(),
        loadUsers(),
        loadVideos(),
        loadTests(),
        loadNews(),
        loadNotificationsSection(),
        loadPayments(),
        loadPremiumRequests(),
        loadPointsLeaderboard(),
        loadActiveUsers(),
        loadDevicesSection(),
        loadSuspiciousActivities(),
        loadTeacherTestsSection(),
    ]);
    _updateTeacherTestsBadge();
});

function renderAdminUser(user) {
    const el = document.getElementById('adminUserName');
    if (el) el.textContent = user?.name || 'Admin';
    const av = document.getElementById('adminAvatar');
    if (av) av.textContent = (user?.name || 'A')[0].toUpperCase();
}

function normalizeArray(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
}

// ════════════════════════════════════════════════════════
//  Section routing
// ════════════════════════════════════════════════════════
function showSection(section) {
    document.querySelectorAll('.admin-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
    });
    const target = document.getElementById(section);
    if (target) { target.style.display = 'block'; target.classList.add('active'); }

    document.querySelectorAll('.admin-menu-item').forEach(i => i.classList.remove('active'));
    const currentItem = document.querySelector(`.admin-menu-item[onclick*="'${section}'"]`);
    if (currentItem) currentItem.classList.add('active');

    const titles = {
        dashboard:'Dashboard', users:'İstifadəçilər', teachers:'Müəllimlər',
        teacherTests:'Müəllim Sınaqları', videos:'Video Dərslər', tests:'Sınaqlar',
        testResults:'Sınaq Nəticələri', news:'Xəbərlər', notifications:'Bildirişlər', payments:'Ödənişlər',
        leaderboard:'Xal Liderliyi', devices:'Cihaz İdarəetməsi',
        suspicious:'Şübhəli Fəaliyyətlər', activeUsers:'Aktiv İstifadəçilər', premium:'Premium İdarəetməsi',
    };
    const pt = document.getElementById('pageTitle');
    if (pt) pt.textContent = titles[section] || 'Dashboard';

    const loaders = {
        dashboard:    () => loadDashboardStats(),
        users:        () => loadUsers(),
        teachers:     () => loadTeachers(),
        videos:       () => loadVideos(),
        tests:        () => loadTests(),
        news:         () => loadNews(),
        notifications:() => loadNotificationsSection(),
        payments:     () => loadPayments(),
        teacherTests: () => { loadTeacherTestsSection(); _updateTeacherTestsBadge(); },
        testResults:  () => loadTestResults(),
        premium:      () => loadPremiumRequests(),
        leaderboard:  () => loadPointsLeaderboard(),
        activeUsers:  () => loadActiveUsers(),
        suspicious:   () => loadSuspiciousActivities(),
        devices:      () => loadDevicesSection(),
    };
    if (loaders[section]) loaders[section]();
}

// ════════════════════════════════════════════════════════
//  Dashboard Stats
// ════════════════════════════════════════════════════════
async function loadDashboardStats() {
    try {
        const stats = await API.stats.get();
        _setStat('totalUsers',    stats.users);
        _setStat('totalVideos',   stats.videos ?? 0);
        _setStat('totalTests',    stats.tests);
        _setStat('totalNews',     stats.news);
        _setStat('totalTeachers', stats.teachers);
        _setStat('totalPremium',  stats.premium);
        const activeCount = document.getElementById('activeUsersCount');
        if (activeCount) activeCount.textContent = String(stats.users || 0);
    } catch(e) {
        console.warn('Stats load failed', e);
        const fallback = await API.users.list({ limit: 200 }).catch(() => ({ data: [] }));
        const users = normalizeArray(fallback);
        _setStat('totalUsers', users.length);
        _setStat('totalVideos', 0);
        _setStat('totalTests', 0);
        _setStat('totalNews', 0);
        _setStat('totalTeachers', users.filter(u => u.userType === 'teacher').length);
        _setStat('totalPremium', users.filter(u => u.premium).length);
    }
}
function _setStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
}

async function loadVideos() {
    const tbody = document.getElementById('videosTable');
    if (!tbody) return;
    showTableLoading(tbody, 7);
    try {
        const result = await API.videos.list({ limit: 100 });
        const videos = normalizeArray(result);
        if (!videos.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:30px;">Video yoxdur</td></tr>';
            return;
        }
        tbody.innerHTML = videos.map(video => `
            <tr>
                <td>${escapeHtml(video.id || '—').slice(0, 8)}</td>
                <td><strong>${escapeHtml(video.title || 'Başlıqsız')}</strong></td>
                <td>${escapeHtml(video.category || 'Ümumi')}</td>
                <td>${escapeHtml(video.duration || '00:00')}</td>
                <td>${Number(video.views || 0).toLocaleString('az-AZ')}</td>
                <td>${video.isActive === false ? '<span class="badge badge-warning">Passiv</span>' : '<span class="badge badge-success">Aktiv</span>'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-view" onclick="window.open('${escapeHtml(video.youtubeUrl || video.videoUrl || '#')}', '_blank')" title="Bax"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-delete" onclick="deleteVideo('${video.id}')" title="Sil"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444;padding:20px;">${escapeHtml(error.message || 'Videolar yüklənmədi.')}</td></tr>`;
    }
}

async function deleteVideo(id) {
    if (!id) return;
    showConfirm('Bu videonu silmək istədiyinizdən əminsiniz?', async () => {
        try {
            await API.videos.remove(id);
            showNotification('Video silindi!', 'success');
            loadVideos();
            loadDashboardStats();
        } catch (error) {
            showNotification(error.message || 'Video silinmədi.', 'error');
        }
    });
}

function toggleUserForm() {
    const form = document.getElementById('addUserForm');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function saveNewUser() {
    const name = document.getElementById('newUserName')?.value?.trim() || '';
    const email = document.getElementById('newUserEmail')?.value?.trim() || '';
    const password = document.getElementById('newUserPassword')?.value || '';
    const role = document.getElementById('newUserRole')?.value || 'user';
    const balance = Number(document.getElementById('newUserBalance')?.value || 0);
    if (!name || !email || !password) {
        showNotification('Ad, email və şifrə vacibdir.', 'warning');
        return;
    }
    try {
        const result = await API.auth.register(name, email, password, 'student');
        if (role === 'admin') await API.users.update(result.user.id, { role: 'admin' });
        if (!Number.isNaN(balance)) await API.users.update(result.user.id, { balance });
        showNotification('İstifadəçi yaradıldı!', 'success');
        toggleUserForm();
        loadUsers();
        loadDashboardStats();
    } catch (error) {
        showNotification(error.message || 'İstifadəçi yaradılmadı.', 'error');
    }
}

function toggleTeacherForm() {
    const form = document.getElementById('addTeacherForm');
    if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function saveNewTeacher() {
    const name = document.getElementById('newTeacherName')?.value?.trim() || '';
    const title = document.getElementById('newTeacherTitle')?.value?.trim() || '';
    const subjects = document.getElementById('newTeacherSubjects')?.value?.trim() || '';
    const image = document.getElementById('newTeacherImage')?.value?.trim() || '';
    const experience = Number(document.getElementById('newTeacherExperience')?.value || 0);
    const email = document.getElementById('newTeacherEmail')?.value?.trim() || `${name.toLowerCase().replace(/[^a-zəöüçğşıİ]/g, '') || 'teacher'}-${Date.now()}@example.com`;
    const phone = document.getElementById('newTeacherPhone')?.value?.trim() || '';
    const bio = document.getElementById('newTeacherBio')?.value?.trim() || '';
    if (!name || !title || !subjects) {
        showNotification('Ad, vəzifə və ixtisas sahələri vacibdir.', 'warning');
        return;
    }
    try {
        const result = await API.auth.register(name, email, 'teacher123', 'teacher');
        await API.users.update(result.user.id, {
            userType: 'teacher',
            canAddTests: true,
            teacherTitle: title,
            subjects,
            profilePicture: image,
            experience: Number.isFinite(experience) ? experience : 0,
            phone,
            bio,
            publicProfile: true,
        });
        showNotification('Müəllim hesabı yaradıldı!', 'success');
        toggleTeacherForm();
        loadTeachers();
        loadDashboardStats();
    } catch (error) {
        showNotification(error.message || 'Müəllim yaradılmadı.', 'error');
    }
}

function showAddVideoModal() {
    window.location.href = 'video-upload.html';
}

// ════════════════════════════════════════════════════════
//  Users
// ════════════════════════════════════════════════════════
async function loadUsers() {
    const tbody = document.getElementById('usersTable');
    if (!tbody) return;
    showTableLoading(tbody, 9);
    try {
        const { data: users } = await API.users.list({ limit: 100 });
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--gray);padding:30px;">İstifadəçi yoxdur</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(u => `
            <tr>
                <td style="font-size:12px;color:#94a3b8;">${String(u.id).slice(0,8)}</td>
                <td><strong>${escapeHtml(u.name)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="badge badge-${u.role==='admin'?'danger':'primary'}">${u.role==='admin'?'Admin':'İstifadəçi'}</span></td>
                <td>${u.userType==='teacher'?'<span style="color:#10b981;font-weight:600;">Müəllim</span>':'Şagird'}</td>
                <td>${u.balance||0} ₼</td>
                <td>${u.premium?'<span style="color:#f59e0b;">👑 Premium</span>':'—'}</td>
                <td>${u.registeredAt ? formatDate(u.registeredAt) : '—'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-view"   onclick="viewUser('${u.id}')"   title="Bax"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-edit"   onclick="editUserModal('${u.id}')" title="Redaktə"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-delete" onclick="deleteUser('${u.id}')" title="Sil"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#ef4444;padding:20px;">${e.message}</td></tr>`;
    }
}

async function viewUser(id) {
    try {
        const { user: u } = await API.users.get(id);
        showNotification(`${u.name} · ${u.email} · Balans: ${u.balance||0} ₼ · ${u.premium?'Premium':'Pulsuz'}`, 'info', 7000);
    } catch(e) { showNotification(e.message, 'error'); }
}

async function editUserModal(id) {
    try {
        const { user: u } = await API.users.get(id);
        showPrompt(`Balans (₼) — ${u.name}`, String(u.balance||0), async (val) => {
            const balance = parseFloat(val);
            if (isNaN(balance)) { showNotification('Düzgün rəqəm daxil edin', 'error'); return; }
            await API.users.update(id, { balance });
            showNotification('Balans yeniləndi!', 'success');
            loadUsers();
        });
    } catch(e) { showNotification(e.message, 'error'); }
}

function deleteUser(id) {
    showConfirm('Bu istifadəçini silmək istədiyinizdən əminsiniz?', async () => {
        try {
            await API.users.remove(id);
            showNotification('İstifadəçi silindi!', 'success');
            loadUsers();
            loadDashboardStats();
        } catch(e) { showNotification(e.message, 'error'); }
    });
}

// ════════════════════════════════════════════════════════
//  Tests
// ════════════════════════════════════════════════════════
async function loadTests() {
    const tbody = document.getElementById('testsTable');
    if (!tbody) return;
    showTableLoading(tbody, 7);
    try {
        const { data: tests } = await API.tests.list({ limit: 100 });
        if (!tests.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:30px;">Sınaq yoxdur</td></tr>';
            return;
        }
        tbody.innerHTML = tests.map(t => `
            <tr>
                <td>${t.emoji||'📝'}</td>
                <td><strong>${escapeHtml(t.title)}</strong></td>
                <td>${escapeHtml(t.category||'Ümumi')}</td>
                <td>${t.questionCount||0}</td>
                <td>${t.duration} dəq</td>
                <td>${t.isPremium?'<span class="badge badge-warning">Premium</span>':'<span class="badge badge-success">Pulsuz</span>'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit"   onclick="editTestRedirect('${t.id}')" title="Redaktə"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-delete" onclick="deleteTest('${t.id}')" title="Sil"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444;padding:20px;">${e.message}</td></tr>`;
    }
}

function showAddTestModal() { window.location.href = 'test-editor.html'; }
function editTestRedirect(id) { window.location.href = `test-editor.html?id=${id}`; }

function deleteTest(id) {
    showConfirm('Bu sınağı silmək istədiyinizdən əminsiniz?', async () => {
        try {
            await API.tests.remove(id);
            showNotification('Sınaq silindi!', 'success');
            loadTests();
            loadDashboardStats();
        } catch(e) { showNotification(e.message, 'error'); }
    });
}

// ════════════════════════════════════════════════════════
//  News
// ════════════════════════════════════════════════════════
async function loadNews() {
    const tbody = document.getElementById('newsTable');
    if (!tbody) return;
    showTableLoading(tbody, 6);
    try {
        const { data: news } = await API.news.list({ limit: 100 });
        if (!news.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:30px;">Xəbər yoxdur. <a href="news-add.html">İlk xəbəri əlavə edin</a></td></tr>`;
            return;
        }
        tbody.innerHTML = news.map(n => `
            <tr>
                <td><strong>${n.emoji||'📰'} ${escapeHtml(n.title)}</strong></td>
                <td>${escapeHtml(n.author||'Admin')}</td>
                <td>${formatDate(n.createdAt)}</td>
                <td>${n.views||0}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-view"   onclick="viewNews('${n.id}')"   title="Bax"><i class="fas fa-eye"></i></button>
                        <button class="btn-icon btn-edit"   onclick="editNewsInline('${n.id}')" title="Redaktə"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-delete" onclick="deleteNews('${n.id}')" title="Sil"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444;padding:20px;">${e.message}</td></tr>`;
    }
}

async function viewNews(id) {
    try {
        const n = await API.news.get(id);
        showNotification(`${n.emoji} ${n.title} · ${n.views||0} baxış`, 'info', 5000);
    } catch(e) { showNotification(e.message, 'error'); }
}

async function editNewsInline(id) {
    try {
        const n = await API.news.get(id);
        showPrompt('Başlıq:', n.title || '', async (newTitle) => {
            const title = String(newTitle || '').trim();
            if (!title) return;
            await API.news.update(id, { title });
            showNotification('Xəbər yeniləndi!', 'success');
            loadNews();
        });
    } catch(e) { showNotification(e.message, 'error'); }
}

function deleteNews(id) {
    showConfirm('Bu xəbəri silmək istədiyinizdən əminsiniz?', async () => {
        try {
            await API.news.remove(id);
            showNotification('Xəbər silindi!', 'success');
            loadNews();
            loadDashboardStats();
        } catch(e) { showNotification(e.message, 'error'); }
    });
}

// ════════════════════════════════════════════════════════
//  Teachers (read from /api/users with userType=teacher)
// ════════════════════════════════════════════════════════
async function loadTeachers() {
    const tbody = document.getElementById('teachersTable');
    if (!tbody) return;
    showTableLoading(tbody, 6);
    try {
        const { data: users } = await API.users.list({ limit: 200 });
        const teachers = users.filter(u => u.userType === 'teacher');
        if (!teachers.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:30px;">Müəllim yoxdur</td></tr>';
            return;
        }
        tbody.innerHTML = teachers.map(t => `
            <tr>
                <td><strong>${escapeHtml(t.name)}</strong></td>
                <td>${escapeHtml(t.email)}</td>
                <td>${t.canAddTests?'<span class="badge badge-success">İcazəli</span>':'<span class="badge badge-warning">İcazəsiz</span>'}</td>
                <td>${formatDate(t.registeredAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-edit" onclick="toggleTeacherAccess('${t.id}',${!t.canAddTests})" title="${t.canAddTests?'İcazəni Geri Al':'İcazə Ver'}">
                            <i class="fas fa-${t.canAddTests?'ban':'check'}"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteUser('${t.id}')" title="Sil"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444;padding:20px;">${e.message}</td></tr>`;
    }
}

async function toggleTeacherAccess(id, grant) {
    try {
        await API.users.update(id, { canAddTests: grant });
        showNotification(grant ? 'Test əlavəetmə icazəsi verildi!' : 'İcazə geri alındı!', 'success');
        loadTeachers();
    } catch(e) { showNotification(e.message, 'error'); }
}

// ════════════════════════════════════════════════════════
//  Notifications
// ════════════════════════════════════════════════════════
async function loadNotificationsSection() {
    const list = document.getElementById('notificationsList');
    const target = document.getElementById('notificationTarget');
    if (!list) return;
    try {
        const [{ data: users }, { data: items }] = await Promise.all([
            API.users.list({ limit: 200 }),
            API.notifications.list()
        ]);
        if (target) {
            target.innerHTML = '<option value="all">Hamısına</option>' + users.map(user => `
                <option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>
            `).join('');
        }
        if (!items.length) {
            list.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray);">Hələ bildiriş yoxdur.</div>';
            return;
        }
        list.innerHTML = items.map(n => `
            <div style="border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;background:${n.type === 'warning' ? '#fff7ed' : n.type === 'success' ? '#ecfdf5' : '#f8fafc'};">
                <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
                    <strong>${escapeHtml(n.title || 'Yeni bildiriş')}</strong>
                    <span style="font-size:12px;color:#64748b;">${formatDate(n.createdAt)}</span>
                </div>
                <p style="margin:8px 0 0;color:#475569;line-height:1.6;">${escapeHtml(n.message || '')}</p>
                <div style="margin-top:8px;font-size:12px;color:#64748b;">
                    ${n.userId ? `Hədəf: ${escapeHtml(n.userName || 'İstifadəçi')}` : 'Bütün istifadəçilər'} · ${n.senderName ? `Göndərən: ${escapeHtml(n.senderName)}` : 'Sistem'}
                </div>
            </div>
        `).join('');
    } catch (error) {
        list.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">${escapeHtml(error.message || 'Bildirişlər yüklənmədi.')}</div>`;
    }
}

async function sendAdminNotification() {
    const title = document.getElementById('notificationTitle')?.value?.trim() || '';
    const message = document.getElementById('notificationMessage')?.value?.trim() || '';
    const target = document.getElementById('notificationTarget')?.value || 'all';
    if (!title || !message) {
        showNotification('Başlıq və mesajı doldurun.', 'warning');
        return;
    }
    try {
        const payload = { title, message, audience: target === 'all' ? 'all' : 'user', userId: target === 'all' ? null : target };
        await API.notifications.send(payload);
        showNotification('Bildiriş göndərildi!', 'success');
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        loadNotificationsSection();
    } catch (error) {
        showNotification(error.message || 'Bildiriş göndərilmədi.', 'error');
    }
}

// ════════════════════════════════════════════════════════
//  Payments (stored via /api/users balance changes)
// ════════════════════════════════════════════════════════
async function loadPayments() {
    const tbody = document.getElementById('paymentsTable');
    if (!tbody) return;
    showTableLoading(tbody, 6);
    try {
        // Payments are stored as a Redis key 'payments' (written by payment.html)
        // We fetch via stats for now; for full history use a dedicated key
        const { data: users } = await API.users.list({ limit: 200 });
        const paying = users.filter(u => u.balance > 0);
        if (!paying.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:30px;">Ödəniş yoxdur</td></tr>';
            return;
        }
        tbody.innerHTML = paying.map(u => `
            <tr>
                <td><strong>${escapeHtml(u.name)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td style="font-weight:700;">${u.balance} ₼</td>
                <td>${u.premium?'<span class="badge badge-warning">Premium</span>':'Pulsuz'}</td>
                <td>${formatDate(u.registeredAt)}</td>
                <td>
                    <button class="btn-icon btn-edit" onclick="editUserModal('${u.id}')" title="Balansı dəyiş"><i class="fas fa-edit"></i></button>
                </td>
            </tr>`).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444;padding:20px;">${e.message}</td></tr>`;
    }
}

// ════════════════════════════════════════════════════════
//  Premium Requests
// ════════════════════════════════════════════════════════
async function loadPremiumRequests() {
    const requestTable = document.getElementById('premiumRequestsTable');
    const usersTable = document.getElementById('premiumUsersTable');
    const badge = document.getElementById('premiumPendingBadge');
    if (!requestTable && !usersTable) return;

    try {
        const [reqs, { data: users }] = await Promise.all([
            API.premium.list(),
            API.users.list({ limit: 200 })
        ]);
        const pending = reqs.filter(r => r.status === 'pending');
        if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? 'inline-flex' : 'none'; }

        if (requestTable) {
            if (!reqs.length) {
                requestTable.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--gray);">Premium müraciət yoxdur</td></tr>';
            } else {
                requestTable.innerHTML = reqs.map(r => `
                    <tr>
                        <td>${escapeHtml(r.id || '—').slice(0, 10)}</td>
                        <td><strong>${escapeHtml(r.userName || 'İstifadəçi')}</strong><br><small>${escapeHtml(r.userEmail || '')}</small></td>
                        <td>${formatDate(r.requestedAt)}</td>
                        <td>${r.status === 'pending' ? '<span class="badge badge-warning">Gözləyir</span>' : r.status === 'approved' ? '<span class="badge badge-success">Təsdiqlənib</span>' : '<span class="badge badge-danger">Rədd edilib</span>'}</td>
                        <td>
                            ${r.status === 'pending' ? `
                                <div class="action-btns">
                                    <button class="btn-icon btn-view" onclick="approvePremium('${r.id}')" title="Təsdiqlə"><i class="fas fa-check"></i></button>
                                    <button class="btn-icon btn-delete" onclick="rejectPremium('${r.id}')" title="Rədd et"><i class="fas fa-times"></i></button>
                                </div>` : '<span style="color:#94a3b8;">—</span>'}
                        </td>
                    </tr>
                `).join('');
            }
        }

        if (usersTable) {
            const premiumUsers = normalizeArray(users).filter(user => user.premium);
            if (!premiumUsers.length) {
                usersTable.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--gray);">Premium istifadəçi yoxdur</td></tr>';
            } else {
                usersTable.innerHTML = premiumUsers.map(user => `
                    <tr>
                        <td>${escapeHtml(String(user.id || '—')).slice(0, 10)}</td>
                        <td><strong>${escapeHtml(user.name || 'İstifadəçi')}</strong><br><small>${escapeHtml(user.email || '')}</small></td>
                        <td>${formatDate(user.premiumActivatedAt)}</td>
                        <td>${formatDate(user.premiumExpiresAt)}</td>
                        <td><button class="btn-icon btn-delete" onclick="API.users.update('${user.id}', { premium: false }); showNotification('Premium ləğv edildi', 'warning'); loadPremiumRequests();" title="Ləğv et"><i class="fas fa-ban"></i></button></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        if (requestTable) requestTable.innerHTML = `<tr><td colspan="5" style="color:#ef4444;padding:20px;">${escapeHtml(error.message || 'Premium məlumatı yüklənmədi.')}</td></tr>`;
        if (usersTable) usersTable.innerHTML = `<tr><td colspan="5" style="color:#ef4444;padding:20px;">${escapeHtml(error.message || 'Premium məlumatı yüklənmədi.')}</td></tr>`;
    }
}

async function approvePremium(id) {
    try { await API.premium.approve(id); showNotification('Premium aktivləşdirildi!', 'success'); loadPremiumRequests(); }
    catch(e) { showNotification(e.message, 'error'); }
}
async function rejectPremium(id) {
    try { await API.premium.reject(id); showNotification('Müraciət rədd edildi', 'warning'); loadPremiumRequests(); }
    catch(e) { showNotification(e.message, 'error'); }
}

// ════════════════════════════════════════════════════════
//  Teacher Test Requests
// ════════════════════════════════════════════════════════
async function _updateTeacherTestsBadge() {
    try {
        const [tests, { data: users }] = await Promise.all([
            API.teacherTests.list({ status: 'pending' }),
            API.users.list({ limit: 200 }),
        ]);
        const cnt = tests.length + users.filter(user => user.testAccessRequested).length;
        const badge = document.getElementById('teacherTestsBadge');
        if (badge) { badge.textContent = cnt; badge.style.display = cnt ? 'inline-flex' : 'none'; }
    } catch {}
}

async function loadTeacherTestsSection() {
    await Promise.all([loadTeacherAccessRequests(), loadTeacherSubmissions()]);
}

async function loadTeacherAccessRequests() {
    const container = document.getElementById('teacherAccessRequestsList');
    if (!container) return;
    try {
        const { data: users } = await API.users.list({ limit: 200 });
        const requests = users.filter(user => user.testAccessRequested);
        if (!requests.length) { showEmpty(container, 'İcazə müraciəti yoxdur'); return; }
        container.innerHTML = requests.map(user => `
            <div class="teacher-access-request">
                <div><strong>${escapeHtml(user.name)}</strong><br><small>${escapeHtml(user.email)}</small></div>
                <button class="btn btn-sm btn-success" onclick="grantTeacherTestAccess('${escapeHtml(user.id)}')">
                    <i class="fas fa-check"></i> İcazə ver
                </button>
            </div>`).join('');
    } catch (error) {
        showError(container, error.message || 'Müraciətləri yükləmək mümkün olmadı.');
    }
}

async function grantTeacherTestAccess(id) {
    try {
        await API.users.update(id, { canAddTests: true, testAccessRequested: false });
        showNotification('Müəllimə sınaq əlavəetmə icazəsi verildi.', 'success');
        await Promise.all([loadTeacherAccessRequests(), loadTeachers(), _updateTeacherTestsBadge()]);
    } catch (error) {
        showNotification(error.message || 'İcazəni yeniləmək mümkün olmadı.', 'error');
    }
}

async function loadTeacherSubmissions() {
    const container = document.getElementById('teacherSubmittedTestsList');
    if (!container) return;
    showSpinner(container);
    try {
        const tests = await API.teacherTests.list();
        if (!tests.length) { showEmpty(container, 'Müraciət yoxdur'); return; }
        const statusMap = { pending: ['#fef3c7','#92400e','⏳ Gözləyir'], approved: ['#ecfdf5','#065f46','✅ Təsdiqləndi'], rejected: ['#fef2f2','#991b1b','❌ Rədd Edildi'] };
        container.innerHTML = tests.map(t => {
            const [bg, color, label] = statusMap[t.status] || statusMap.pending;
            return `
            <div style="border:1px solid var(--border);border-radius:12px;padding:18px;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="font-size:32px;">${t.emoji||'📝'}</div>
                    <div style="flex:1;">
                        <strong>${escapeHtml(t.title)}</strong>
                        <div style="font-size:12px;color:#6b7280;">👨‍🏫 ${escapeHtml(t.teacherName)} · ${t.questions?.length||0} sual · ${t.duration} dəq · ${t.difficulty}</div>
                        ${t.adminNote?`<div style="font-size:12px;color:#ef4444;margin-top:4px;"><i class="fas fa-comment"></i> ${escapeHtml(t.adminNote)}</div>`:''}
                    </div>
                    <span style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${bg};color:${color};">${label}</span>
                    ${t.status==='pending'?`
                    <div style="display:flex;gap:8px;">
                        <button class="btn btn-sm btn-success" onclick="approveTeacherTest('${t.id}')"><i class="fas fa-check"></i></button>
                        <button class="btn btn-sm btn-danger"  onclick="rejectTeacherTest('${t.id}')"><i class="fas fa-times"></i></button>
                    </div>`:''}
                </div>
            </div>`;
        }).join('');
    } catch(e) { showError(container, e.message); }
}

async function approveTeacherTest(id) {
    try { await API.teacherTests.approve(id); showNotification('Sınaq təsdiqləndi!', 'success'); loadTeacherTestsSection(); _updateTeacherTestsBadge(); }
    catch(e) { showNotification(e.message, 'error'); }
}
async function rejectTeacherTest(id) {
    showPrompt('Rədd səbəbi (istəyə bağlı):', '', async (note) => {
        const reason = String(note || '').trim();
        try { await API.teacherTests.reject(id, reason); showNotification('Sınaq rədd edildi', 'warning'); loadTeacherTestsSection(); _updateTeacherTestsBadge(); }
        catch(e) { showNotification(e.message, 'error'); }
    });
}

async function loadPointsLeaderboard() {
    const tbody = document.getElementById('leaderboardTable');
    if (!tbody) return;
    showTableLoading(tbody, 6);
    try {
        const result = await API.points.get();
        const leaderboard = Array.isArray(result?.leaderboard) ? result.leaderboard : [];
        if (!leaderboard.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray);">Hələ heç kim xal qazanmayıb</td></tr>';
            return;
        }
        tbody.innerHTML = leaderboard.slice(0, 20).map((entry, index) => `
            <tr>
                <td style="font-weight:700;color:${index === 0 ? '#f59e0b' : index === 1 ? '#9ca3af' : index === 2 ? '#f97316' : '#475569'};">#${index + 1}</td>
                <td><strong>${escapeHtml(entry.userName || 'İstifadəçi')}</strong></td>
                <td>${entry.premium ? '<span class="badge badge-warning">Premium</span>' : '<span class="badge badge-secondary">Pulsuz</span>'}</td>
                <td>${Number(entry.watchedCount || 0).toLocaleString('az-AZ')}</td>
                <td>${Number(entry.testCount || 0).toLocaleString('az-AZ')}</td>
                <td>${Number(entry.total || 0).toLocaleString('az-AZ')} xal</td>
            </tr>
        `).join('');
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:#ef4444;padding:20px;">${escapeHtml(error.message || 'Liderlik yüklənmədi.')}</td></tr>`;
    }
}

async function loadActiveUsers() {
    const container = document.getElementById('activeUsersContainer');
    const total = document.getElementById('activeCountTotal');
    const premium = document.getElementById('activePremiumCount');
    const free = document.getElementById('activeFreeCount');
    const last = document.getElementById('activeLastUpdate');
    if (!container) return;
    try {
        const { data: users } = await API.users.list({ limit: 200 });
        const activeUsers = normalizeArray(users)
            .filter(user => user.role !== 'admin')
            .filter(user => {
                const stamp = new Date(user.updatedAt || user.registeredAt || 0).getTime();
                if (!stamp) return false;
                return Date.now() - stamp < 1000 * 60 * 60 * 24 * 7;
            })
            .sort((a, b) => new Date(b.updatedAt || b.registeredAt || 0) - new Date(a.updatedAt || a.registeredAt || 0));

        if (total) total.textContent = String(activeUsers.length);
        if (premium) premium.textContent = String(activeUsers.filter(user => user.premium).length);
        if (free) free.textContent = String(activeUsers.filter(user => !user.premium).length);
        if (last) last.textContent = new Date().toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' });

        if (!activeUsers.length) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray);">Aktiv istifadəçi yoxdur.</div>';
            return;
        }

        container.innerHTML = activeUsers.slice(0, 12).map(user => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;">
                <div>
                    <strong>${escapeHtml(user.name || 'İstifadəçi')}</strong><br>
                    <small style="color:#64748b;">${escapeHtml(user.email || '')}</small>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:11px; color:#64748b;">${user.premium ? '👑 Premium' : 'Pulsuz'}</div>
                    <div style="font-size:11px; color:#64748b;">${formatDate(user.updatedAt || user.registeredAt)}</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        if (container) container.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">${escapeHtml(error.message || 'Aktiv istifadəçilər yüklənmədi.')}</div>`;
    }
}

async function loadDevicesSection() {
    const container = document.getElementById('devicesContainer');
    if (!container) return;
    try {
        const { data: users } = await API.users.list({ limit: 200 });
        const devices = normalizeArray(users)
            .filter(user => user.role !== 'admin')
            .slice(0, 15)
            .map(user => ({
                user: user.name || 'İstifadəçi',
                email: user.email || '',
                status: user.premium ? 'Premium' : 'Standart',
                lastSeen: user.updatedAt || user.registeredAt || new Date().toISOString(),
                type: user.userType === 'teacher' ? 'Müəllim' : 'Şagird'
            }));

        if (!devices.length) {
            container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray);">Cihaz məlumatı yoxdur.</div>';
            return;
        }

        container.innerHTML = devices.map(item => `
            <div style="background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;">
                    <div>
                        <strong>${escapeHtml(item.user)}</strong><br>
                        <small style="color:#64748b;">${escapeHtml(item.email)}</small>
                    </div>
                    <span class="badge badge-${item.status === 'Premium' ? 'warning' : 'primary'}">${item.status}</span>
                </div>
                <div style="margin-top:12px;font-size:12px;color:#64748b; display:flex; justify-content:space-between; gap:12px;">
                    <span>${escapeHtml(item.type)}</span>
                    <span>${formatDate(item.lastSeen)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">${escapeHtml(error.message || 'Cihaz məlumatı yüklənmədi.')}</div>`;
    }
}

async function loadSuspiciousActivities() {
    const suspiciousTable = document.getElementById('suspiciousActivitiesTable');
    const frozenTable = document.getElementById('frozenAccountsTable');
    if (!suspiciousTable || !frozenTable) return;
    try {
        const { data: users } = await API.users.list({ limit: 200 });
        const allUsers = normalizeArray(users).filter(user => user.role !== 'admin');
        const suspicious = allUsers.filter(user => user.frozen || user.testAccessRequested || user.premiumRequestedAt || user.deviceStatus === 'warning' || user.deviceStatus === 'blocked');
        const frozen = allUsers.filter(user => user.frozen);

        suspiciousTable.innerHTML = suspicious.length
            ? suspicious.map(user => `
                <tr>
                    <td>${escapeHtml(String(user.id || '—')).slice(0, 10)}</td>
                    <td>${escapeHtml(user.name || 'İstifadəçi')}<br><small>${escapeHtml(user.email || '')}</small></td>
                    <td>${user.frozen ? 'Blok' : user.deviceStatus === 'warning' ? 'Fərqli cihaz' : user.testAccessRequested ? 'İcazə müraciəti' : 'Premium müraciəti'}</td>
                    <td>${user.deviceMismatchCount || (user.frozen ? '1' : user.testAccessRequested ? '1' : user.premiumRequestedAt ? '1' : '—')}</td>
                    <td>${escapeHtml(user.deviceId || 'Web')}</td>
                    <td>${formatDate(user.updatedAt || user.registeredAt)}</td>
                    <td>
                        <div class="action-btns" style="display:flex;gap:6px;">
                            <button class="btn-icon btn-view" onclick="viewUser('${user.id}')" title="Bax"><i class="fas fa-eye"></i></button>
                            ${(user.frozen || user.deviceStatus === 'warning' || user.deviceStatus === 'blocked') ? `<button class="btn-icon btn-success" onclick="allowDeviceAccess('${user.id}')" title="Cihaza icazə ver"><i class="fas fa-unlock"></i></button>` : ''}
                        </div>
                    </td>
                </tr>`).join('')
            : '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray);">Şübhəli aktivlik yoxdur</td></tr>';

        frozenTable.innerHTML = frozen.length
            ? frozen.map(user => `
                <tr>
                    <td>${escapeHtml(String(user.id || '—')).slice(0, 10)}</td>
                    <td>${escapeHtml(user.name || 'İstifadəçi')}<br><small>${escapeHtml(user.email || '')}</small></td>
                    <td>${user.frozenReason || 'İdarəetmə bloklanması'}</td>
                    <td>${user.balance || 0} ₼</td>
                    <td>${formatDate(user.updatedAt || user.registeredAt)}</td>
                    <td><button class="btn-icon btn-success" onclick="API.users.update('${user.id}', { frozen: false }); showNotification('Hesab blokdan çıxarıldı.', 'success'); loadSuspiciousActivities();" title="Bloku aç"><i class="fas fa-unlock"></i></button></td>
                </tr>`).join('')
            : '<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray);">Bloklanmış hesab yoxdur</td></tr>';
    } catch (error) {
        suspiciousTable.innerHTML = `<tr><td colspan="7" style="color:#ef4444;padding:20px;">${escapeHtml(error.message || 'Şübhəli məlumatlar yüklənmədi.')}</td></tr>`;
        frozenTable.innerHTML = `<tr><td colspan="6" style="color:#ef4444;padding:20px;">${escapeHtml(error.message || 'Şübhəli məlumatlar yüklənmədi.')}</td></tr>`;
    }
}

async function allowDeviceAccess(userId) {
    try {
        await API.users.update(userId, {
            frozen: false,
            frozenReason: 'Admin fərqli cihaz üçün icazə verdi.',
            deviceStatus: 'approved',
            deviceMismatchCount: 0,
        });
        showNotification('Fərqli cihaz üçün icazə verildi.', 'success');
        loadSuspiciousActivities();
    } catch (error) {
        showNotification(error.message || 'İcazə verilmədi.', 'error');
    }
}

async function clearSuspiciousActivities() {
    try {
        const { data: users } = await API.users.list({ limit: 200 });
        const frozen = normalizeArray(users).filter(user => user.frozen && user.role !== 'admin');
        if (!frozen.length) {
            showNotification('Təmizlənəcək bloklanmış hesab yoxdur.', 'info');
            return;
        }
        await Promise.all(frozen.map(user => API.users.update(user.id, { frozen: false, deviceStatus: 'approved', deviceMismatchCount: 0 })));
        showNotification(`${frozen.length} hesab blokdan çıxarıldı.`, 'success');
        loadSuspiciousActivities();
    } catch (error) {
        showNotification(error.message || 'Şübhəli fəaliyyətlər təmizlənmədi.', 'error');
    }
}

let allTestResults = [];

async function loadTestResults() {
    const table = document.getElementById('testResultsTable');
    if (!table) return;
    table.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">Yüklənir...</td></tr>';
    try {
        const [{ data: results }, { data: tests }] = await Promise.all([
            API.points.results(),
            API.tests.list({ limit: 100 }),
        ]);
        allTestResults = results;
        const filter = document.getElementById('filterTest');
        const selected = filter.value;
        filter.innerHTML = '<option value="">Hamısı</option>' + tests.map(test =>
            `<option value="${escapeHtml(test.id)}">${escapeHtml(test.title)}</option>`
        ).join('');
        filter.value = selected;
        filterTestResults();
    } catch (error) {
        table.innerHTML = `<tr><td colspan="7" style="color:#ef4444;padding:24px;">${escapeHtml(error.message || 'Nəticələri yükləmək mümkün olmadı.')}</td></tr>`;
    }
}

function filterTestResults() {
    const testId = document.getElementById('filterTest')?.value || '';
    const query = (document.getElementById('filterUser')?.value || '').toLowerCase();
    const rows = allTestResults.filter(result =>
        (!testId || String(result.testId) === testId) &&
        (!query || `${result.userName || ''} ${result.userEmail || ''}`.toLowerCase().includes(query))
    );
    const table = document.getElementById('testResultsTable');
    if (!rows.length) {
        table.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray);">Nəticə yoxdur</td></tr>';
    } else {
        table.innerHTML = rows.map(result => `
            <tr>
                <td>${formatDate(result.date)}</td>
                <td>${escapeHtml(result.userName)}<br><small>${escapeHtml(result.userEmail)}</small></td>
                <td>${escapeHtml(result.testTitle)}</td>
                <td>${result.score}/${result.total}</td>
                <td>${result.percentage}%</td>
                <td>${result.percentage >= 60 ? 'Uğurlu' : 'Tamamlandı'}</td>
                <td><button class="btn-icon btn-view" title="Nəticə" onclick="viewTestResult('${escapeHtml(result.id)}')"><i class="fas fa-eye"></i></button></td>
            </tr>`).join('');
    }
    document.getElementById('totalTestAttempts').textContent = allTestResults.length;
    document.getElementById('uniqueTestTakers').textContent = new Set(allTestResults.map(result => result.userId)).size;
    const average = allTestResults.length ? Math.round(allTestResults.reduce((sum, result) => sum + (Number(result.percentage) || 0), 0) / allTestResults.length) : 0;
    const passRate = allTestResults.length ? Math.round(allTestResults.filter(result => result.percentage >= 60).length / allTestResults.length * 100) : 0;
    document.getElementById('avgTestScore').textContent = `${average}%`;
    document.getElementById('passRate').textContent = `${passRate}%`;
}

function viewTestResult(id) {
    const result = allTestResults.find(item => String(item.id) === String(id));
    if (!result) return;
    showNotification(`${result.userName}: ${result.testTitle} · ${result.score}/${result.total} (${result.percentage}%)`, 'info', 6000);
}

function exportTestResults() {
    const rows = [['Tarix', 'İstifadəçi', 'Email', 'Sınaq', 'Bal', 'Faiz'], ...allTestResults.map(result => [
        result.date, result.userName, result.userEmail, result.testTitle, `${result.score}/${result.total}`, `${result.percentage}%`,
    ])];
    const csv = rows.map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'sinaq-neticeleri.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

// ── Render admin name/avatar from session ────────────────────────────────
(async function renderAdminIdentity() {
    try {
        const user = await API.getCurrentUser();
        if (!user) return;
        const nameEl   = document.getElementById('adminUserName');
        const emailEl  = document.getElementById('adminUserEmail');
        const avatarEl = document.getElementById('adminAvatar');
        if (nameEl)   nameEl.textContent   = user.name  || 'Admin';
        if (emailEl)  emailEl.textContent  = user.email || '';
        if (avatarEl) avatarEl.textContent = (user.name || 'A')[0].toUpperCase();
    } catch {}
})();

// ════════════════════════════════════════════════════════
//  Leaderboard
// ════════════════════════════════════════════════════════
async function loadLeaderboard() {
    const container = document.getElementById('leaderboardList');
    if (!container) return;
    showSpinner(container);
    try {
        const result = await API.points.get();
        const leaderboard = Array.isArray(result?.leaderboard) ? result.leaderboard : [];
        const sorted = leaderboard.slice(0, 20);
        if (!sorted.length) { showEmpty(container, 'Xal məlumatı yoxdur'); return; }
        container.innerHTML = sorted.map((u,i) => `
            <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid var(--border);">
                <div style="width:32px;text-align:center;font-weight:800;font-size:16px;color:${i===0?'#fbbf24':i===1?'#9ca3af':i===2?'#f59e0b':'#94a3b8'};">${i+1}</div>
                <div style="width:38px;height:38px;border-radius:50%;background:${(u.userName || 'İstifadəçi').length % 2 === 0 ? '#667eea' : '#10b981'};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">${(u.userName || 'İ').charAt(0).toUpperCase()}</div>
                <div style="flex:1;"><strong>${escapeHtml(u.userName || 'İstifadəçi')}</strong><br><span style="font-size:12px;color:#6b7280;">${escapeHtml(u.userType || 'student')}</span></div>
                <div style="font-weight:800;font-size:18px;color:var(--primary);">${Number(u.total || 0).toLocaleString('az-AZ')} xal</div>
            </div>`).join('');
    } catch(e) { showError(container, e.message); }
}

// ════════════════════════════════════════════════════════
//  Helpers
// ════════════════════════════════════════════════════════
function showTableLoading(tbody, cols) {
    tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:30px;color:#94a3b8;"><i class="fas fa-circle-notch fa-spin" style="margin-right:8px;"></i>Yüklənir...</td></tr>`;
}

// Re-export helpers from app.js for templates that call them
function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
