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
        devices:      () => loadDevicesSection(),
        suspicious:   () => loadSuspiciousActivities(),
    };
    if (loaders[section]) loaders[section]();
}

// ════════════════════════════════════════════════════════
//  Dashboard Stats
// ════════════════════════════════════════════════════════
async function loadDashboardStats() {
    try {
        const [stats, userResult] = await Promise.all([
            API.stats.get(),
            API.users.list({ limit: 200 }).catch(() => ({ data: [] }))
        ]);

        const users = normalizeArray(userResult);
        _setStat('totalUsers',    stats.users ?? users.length);
        _setStat('totalVideos',   stats.videos ?? 0);
        _setStat('totalTests',    stats.tests ?? 0);
        _setStat('totalNews',     stats.news ?? 0);
        _setStat('totalTeachers', stats.teachers ?? users.filter(u => u.userType === 'teacher').length);
        _setStat('totalPremium',  stats.premium ?? users.filter(u => u.premium).length);

        const activeCount = document.getElementById('activeUsersCount');
        if (activeCount) activeCount.textContent = String(users.filter(u => u.role !== 'admin').length || 0);

        renderRecentUsers(users);
        renderDashboardActiveUsers(users);
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
        renderRecentUsers(users);
        renderDashboardActiveUsers(users);
    }
}

function renderRecentUsers(users) {
    const container = document.getElementById('recentRegistrationsList');
    if (!container) return;
    const recent = [...users]
        .filter(u => u.registeredAt)
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
        .slice(0, 5);

    if (!recent.length) {
        container.innerHTML = '<div style="color:var(--gray);padding:18px 0;">Heç bir qeydiyyat yoxdur.</div>';
        return;
    }

    container.innerHTML = recent.map(user => `
        <div class="mini-user-row">
            <div>
                <strong>${escapeHtml(user.name || 'İstifadəçi')}</strong>
                <small>${escapeHtml(user.email || '')}</small>
            </div>
            <small>${formatDate(user.registeredAt)}</small>
        </div>
    `).join('');
}

function renderDashboardActiveUsers(users) {
    const container = document.getElementById('dashboardActiveUsersList');
    if (!container) return;
    const active = [...users]
        .filter(u => u.role !== 'admin')
        .sort((a, b) => new Date(b.updatedAt || b.registeredAt || 0) - new Date(a.updatedAt || a.registeredAt || 0))
        .slice(0, 5);

    if (!active.length) {
        container.innerHTML = '<div style="color:var(--gray);padding:18px 0;">Aktiv istifadəçi yoxdur.</div>';
        return;
    }

    container.innerHTML = active.map(user => `
        <div class="mini-user-row">
            <div>
                <strong>${escapeHtml(user.name || 'İstifadəçi')}</strong>
                <small>${escapeHtml(user.email || '')}</small>
            </div>
            <span class="badge badge-${user.premium ? 'warning' : 'success'}">${user.premium ? 'Premium' : 'Pulsuz'}</span>
        </div>
    `).join('');
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
    showTableLoading(tbody, 10);
    try {
        const { data: users } = await API.users.list({ limit: 100 });
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--gray);padding:30px;">İstifadəçi yoxdur</td></tr>';
            return;
        }
        tbody.innerHTML = users.map(u => {
            const visiblePassword = u.passwordPlain || u.passwordDisplay || u.password || '—';
            return `
            <tr>
                <td style="font-size:12px;color:#94a3b8;">${String(u.id).slice(0,8)}</td>
                <td><strong>${escapeHtml(u.name)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td style="font-family:monospace;max-width:120px;word-break:break-all;">${escapeHtml(String(visiblePassword))}</td>
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
            </tr>`;
        }).join('');
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:#ef4444;padding:20px;">${e.message}</td></tr>`;
    }
}

async function viewUser(id) {
    try {
        const { user: u } = await API.users.get(id);
        const passwordText = u.passwordPlain || u.passwordDisplay || u.password ? ` • Şifrə: ${u.passwordPlain || u.passwordDisplay || u.password}` : ' • Şifrə: yoxdur';
        showNotification(`${u.name} · ${u.email} · Balans: ${u.balance||0} ₼ · ${u.premium?'Premium':'Pulsuz'}${passwordText}`, 'info', 7000);
    } catch(e) { showNotification(e.message, 'error'); }
}

async function editUserModal(id) {
    try {
        const { user: u } = await API.users.get(id);
        if (!u || !u.id) throw new Error('İstifadəçi tapılmadı');

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;z-index:10001;padding:20px;';
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:#fff;border-radius:16px;max-width:520px;width:100%;padding:24px;box-shadow:0 16px 50px rgba(15,23,42,.25);';
        dialog.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="margin:0;font-size:20px;">İstifadəçi redaktəsi</h3>
                <button type="button" onclick="this.closest('[data-admin-user-modal]')?.remove()" style="border:none;background:#f1f5f9;color:#475569;border-radius:8px;padding:8px 10px;cursor:pointer;">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <label style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#475569;">
                    <span>Ad</span>
                    <input id="editUserName" value="${escapeHtml(String(u.name || ''))}" style="padding:10px 12px;border:1px solid #dfe7ef;border-radius:10px;" />
                </label>
                <label style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#475569;">
                    <span>Rol</span>
                    <select id="editUserRole" style="padding:10px 12px;border:1px solid #dfe7ef;border-radius:10px;">
                        <option value="user" ${u.role === 'user' ? 'selected' : ''}>İstifadəçi</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </label>
                <label style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#475569;grid-column:1 / -1;">
                    <span>E-poçt</span>
                    <input id="editUserEmail" value="${escapeHtml(String(u.email || ''))}" style="padding:10px 12px;border:1px solid #dfe7ef;border-radius:10px;" />
                </label>
                <label style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#475569;">
                    <span>Balans (₼)</span>
                    <input id="editUserBalance" type="number" step="0.01" value="${Number(u.balance || 0)}" style="padding:10px 12px;border:1px solid #dfe7ef;border-radius:10px;" />
                </label>
                <label style="display:flex;flex-direction:column;gap:8px;font-size:13px;color:#475569;">
                    <span>Şifrə</span>
                    <input id="editUserPassword" type="text" value="${escapeHtml(String(u.passwordPlain || u.passwordDisplay || u.password || ''))}" placeholder="Yeni şifrə yazın" style="padding:10px 12px;border:1px solid #dfe7ef;border-radius:10px;" />
                </label>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('[data-admin-user-modal]')?.remove()">Ləğv et</button>
                <button type="button" class="btn btn-primary btn-sm" id="saveUserChangesBtn">Yadda saxla</button>
            </div>
        `;
        overlay.setAttribute('data-admin-user-modal', 'true');
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        document.getElementById('saveUserChangesBtn').onclick = async () => {
            const payload = {};
            const name = document.getElementById('editUserName').value.trim();
            const email = document.getElementById('editUserEmail').value.trim();
            const role = document.getElementById('editUserRole').value;
            const balance = Number.parseFloat(document.getElementById('editUserBalance').value);
            const password = document.getElementById('editUserPassword').value.trim();

            if (!name) { showNotification('Ad boş ola bilməz', 'error'); return; }
            if (!email) { showNotification('E-poçt boş ola bilməz', 'error'); return; }

            payload.name = name;
            payload.email = email;
            payload.role = role;
            payload.balance = Number.isFinite(balance) ? balance : 0;
            if (password) payload.password = password;

            try {
                await API.users.update(id, payload);
                showNotification('İstifadəçi uğurla yeniləndi!', 'success');
                overlay.remove();
                loadUsers();
            } catch (error) {
                showNotification(error.message || 'Yenilənmədi', 'error');
            }
        };
    } catch(e) { showNotification(e.message, 'error'); }
}

function deleteUser(id) {
    if (!id) {
        showNotification('Silinəcək istifadəçi tapılmadı.', 'error');
        return;
    }
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
        const requests = users.filter(user => user.testAccessRequested || user.loginRequested || user.loginRequestStatus === 'pending' || user.loginApproved === false && user.loginRequested === true);
        if (!requests.length) { showEmpty(container, 'İcazə müraciəti yoxdur'); return; }
        container.innerHTML = requests.map(user => {
            const isLoginRequest = Boolean(user.loginRequested || user.loginRequestStatus === 'pending' || user.loginApproved === false && user.loginRequested === true);
            const isTeacherAccessRequest = Boolean(user.testAccessRequested);
            return `
                <div class="teacher-access-request" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
                    <div>
                        <strong>${escapeHtml(user.name || 'İstifadəçi')}</strong><br>
                        <small>${escapeHtml(user.email || '')}</small><br>
                        <small>${isLoginRequest ? '<span style="color:#f59e0b;">Giriş icazəsi</span>' : '<span style="color:#10b981;">Test icazəsi</span>'}</small>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        ${isLoginRequest ? `
                            <button class="btn btn-sm btn-success" onclick="approveLoginAccess('${escapeHtml(user.id)}')"><i class="fas fa-check"></i> Giriş icazəsi ver</button>
                            <button class="btn btn-sm btn-danger" onclick="rejectLoginAccess('${escapeHtml(user.id)}')"><i class="fas fa-times"></i> Rədd et</button>
                        ` : `
                            <button class="btn btn-sm btn-success" onclick="grantTeacherTestAccess('${escapeHtml(user.id)}')"><i class="fas fa-check"></i> İcazə ver</button>
                        `}
                    </div>
                </div>`;
        }).join('');
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

async function approveLoginAccess(id) {
    try {
        await API.users.update(id, { loginApproved: true, loginRequested: false, loginRequestStatus: 'approved', loginRejectedReason: null });
        showNotification('İstifadəçiyə giriş icazəsi verildi.', 'success');
        await Promise.all([loadTeacherAccessRequests(), _updateTeacherTestsBadge()]);
    } catch (error) {
        showNotification(error.message || 'Giriş icazəsi verilmədi.', 'error');
    }
}

async function rejectLoginAccess(id) {
    try {
        await API.users.update(id, { loginApproved: false, loginRequested: false, loginRequestStatus: 'rejected', loginRejectedReason: 'Admin tərəfindən rədd edildi.' });
        showNotification('Giriş icazəsi rədd edildi.', 'warning');
        await Promise.all([loadTeacherAccessRequests(), _updateTeacherTestsBadge()]);
    } catch (error) {
        showNotification(error.message || 'Giriş icazəsi rədd edilmədi.', 'error');
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
                        <div style="font-size:12px;color:#475569;margin-top:3px;">${escapeHtml(t.grade === 'all' ? 'Siniflərarası' : t.grade ? `Sinif ${t.grade}` : 'Sinif göstərilməyib')} · ${escapeHtml(t.topic || 'Mövzu göstərilməyib')}</div>
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
    showSpinner(container);
    try {
        const { data: users } = await API.users.list({ limit: 200 });
        const devices = normalizeArray(users)
            .filter(user => user.role !== 'admin')
            .map(user => {
                const status = user.frozen ? 'blocked' : (user.deviceStatus || 'approved');
                const pendingId = user.pendingDeviceId || user.pendingDeviceInfo?.deviceId || '';
                const pendingInfo = user.pendingDeviceInfo || {};
                return {
                    id: user.id,
                    deviceId: user.deviceId || '',
                    name: user.name || 'İstifadəçi',
                    email: user.email || '',
                    status,
                    pendingDeviceId: pendingId,
                    pendingDeviceName: [pendingInfo.browser, pendingInfo.platform].filter(Boolean).join(' · '),
                    pendingRequestedAt: pendingInfo.requestedAt,
                    mismatchCount: Number(user.deviceMismatchCount || 0),
                    frozen: Boolean(user.frozen),
                };
            })
            .sort((a, b) => Number(Boolean(b.pendingDeviceId)) - Number(Boolean(a.pendingDeviceId)) || Number(b.frozen) - Number(a.frozen));

        if (!devices.length) {
            showEmpty(container, 'Qeydiyyatlı cihaz yoxdur');
            return;
        }

        container.innerHTML = `
            <div style="overflow-x:auto;">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>İstifadəçi</th>
                            <th>Etibarlı cihaz</th>
                            <th>Yeni cihaz müraciəti</th>
                            <th>Cəhd Sayı</th>
                            <th>Əməliyyat</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${devices.map(user => {
                            const badge = user.frozen
                                ? '<span class="badge badge-danger">Bloklanıb</span>'
                                : user.status === 'pending_review' || user.status === 'pending'
                                    ? '<span class="badge badge-warning">Gözləyir</span>'
                                    : '<span class="badge badge-success">Təsdiqlənib</span>';
                            const activeDevice = user.deviceId
                                ? `<code title="${escapeHtml(user.deviceId)}" style="font-size:11px;">${escapeHtml(user.deviceId.slice(0, 14))}…</code>`
                                : '<small style="color:#64748b;">Qeyd olunmayıb</small>';
                            const pendingDevice = user.pendingDeviceId
                                ? `<strong>${escapeHtml(user.pendingDeviceName || 'Yeni cihaz')}</strong><br>
                                   <code title="${escapeHtml(user.pendingDeviceId)}" style="font-size:11px;">${escapeHtml(user.pendingDeviceId.slice(0, 14))}…</code>
                                   <br><small style="color:#64748b;">${formatDate(user.pendingRequestedAt)}</small>`
                                : '<small style="color:#64748b;">Müraciət yoxdur</small>';
                            const approveButton = user.pendingDeviceId
                                ? `<button class="btn btn-success btn-sm" onclick="approveDevice(decodeURIComponent('${encodeURIComponent(user.id)}'), decodeURIComponent('${encodeURIComponent(user.pendingDeviceId)}'))"><i class="fas fa-check"></i> Təsdiqlə</button>`
                                : '';
                            return `
                                <tr>
                                    <td><strong>${escapeHtml(user.name)}</strong><br><small>${escapeHtml(user.email)}</small></td>
                                    <td>${activeDevice}<br>${badge}</td>
                                    <td>${pendingDevice}</td>
                                    <td>${user.mismatchCount}</td>
                                    <td>
                                        <div class="action-btns">
                                            ${approveButton}
                                            ${!user.frozen ? `<button class="btn-icon btn-delete" onclick="freezeDeviceUser(decodeURIComponent('${encodeURIComponent(user.id)}'))" title="Hesabı blokla" aria-label="Hesabı blokla"><i class="fas fa-ban"></i></button>` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        showError(container, error.message || 'Cihaz məlumatları yüklənmədi.');
    }
}

async function approveDevice(id, deviceId = null) {
    try {
        if (!deviceId) {
            showNotification('Təsdiqlənəcək müraciət edən cihaz tapılmadı.', 'error');
            return;
        }

        await API.auth.approveDevice(id, deviceId);
        showNotification('Cihaz təsdiqləndi. İstifadəçi yeni cihazdan yenidən giriş etməlidir.', 'success', 6000);
        loadDevicesSection();
    } catch (error) {
        showNotification(error.message || 'Cihaz təsdiqlənmədi.', 'error');
    }
}

async function freezeDeviceUser(id) {
    try {
        await API.users.update(id, { frozen: true, frozenReason: 'Cihaz doğrulaması uğursuz oldu', deviceStatus: 'blocked' });
        showNotification('Cihaz bloklandı.', 'warning');
        loadDevicesSection();
        loadSuspiciousActivities();
    } catch (error) {
        showNotification(error.message || 'Cihaz bloklanmadı.', 'error');
    }
}

async function syncAllData() {
    try {
        const [users, tests, news, videos, points, teacherTests] = await Promise.all([
            API.users.list({ limit: 200 }),
            API.tests.list({ limit: 200 }),
            API.news.list({ limit: 200 }),
            API.videos.list({ limit: 200 }),
            API.points.get(),
            API.teacherTests.list({ limit: 200 })
        ]);

        const summary = {
            users: normalizeArray(users).length,
            tests: normalizeArray(tests).length,
            news: normalizeArray(news).length,
            videos: normalizeArray(videos).length,
            leaderboard: Array.isArray(points?.leaderboard) ? points.leaderboard.length : 0,
            teacherTests: normalizeArray(teacherTests).length,
        };

        showNotification(`Sinxronlaşdırma tamamlandı — ${summary.users} istifadəçi, ${summary.tests} sınaq, ${summary.videos} video, ${summary.news} xəbər.`, 'success');
        loadDashboardStats();
        loadUsers();
        loadTests();
        loadNews();
        loadVideos();
        loadPointsLeaderboard();
        loadTeacherTestsSection();
    } catch (error) {
        showNotification(error.message || 'Sinxronizasiya uğursuz oldu.', 'error');
    }
}

async function loadSuspiciousActivities() {
    const suspiciousTable = document.getElementById('suspiciousActivitiesTable');
    const frozenTable = document.getElementById('frozenAccountsTable');
    if (!suspiciousTable || !frozenTable) return;
    try {
        const { data: users } = await API.users.list({ limit: 200 });
        const allUsers = normalizeArray(users).filter(user => user.role !== 'admin');
        const suspicious = allUsers.filter(user => user.frozen || user.testAccessRequested || user.premiumRequestedAt || user.pendingDeviceId || user.deviceStatus === 'pending_review' || user.loginRequestStatus === 'pending');
        const frozen = allUsers.filter(user => user.frozen);

        suspiciousTable.innerHTML = suspicious.length
            ? suspicious.map(user => `
                <tr>
                    <td>${escapeHtml(String(user.id || '—')).slice(0, 10)}</td>
                    <td>${escapeHtml(user.name || 'İstifadəçi')}<br><small>${escapeHtml(user.email || '')}</small></td>
                    <td>${user.frozen ? 'Blok' : user.testAccessRequested ? 'İcazə müraciəti' : 'Premium müraciəti'}</td>
                    <td>${user.frozen ? '1' : user.testAccessRequested ? '1' : user.premiumRequestedAt ? '1' : '—'}</td>
                    <td>Web</td>
                    <td>${formatDate(user.updatedAt || user.registeredAt)}</td>
                    <td>
                        <div class="action-btns" style="display:flex;gap:6px;">
                            <button class="btn-icon btn-view" onclick="viewUser('${user.id}')" title="Bax"><i class="fas fa-eye"></i></button>
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
