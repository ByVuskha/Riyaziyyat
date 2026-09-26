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
    document.getElementById('fontSize')?.addEventListener('input', updateSettingRangeLabels);
    document.getElementById('lineHeight')?.addEventListener('input', updateSettingRangeLabels);
    const user = await requireAdminPage();   // from app.js — redirects if not admin
    if (!user) return;
    renderAdminUser(user);
    loadDashboardStats();
    loadUsers();
    _updateTeacherTestsBadge();
});

function renderAdminUser(user) {
    const el = document.getElementById('adminUserName');
    if (el) el.textContent = user.name;
    const av = document.getElementById('adminAvatar');
    if (av) av.textContent = user.name[0].toUpperCase();
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
    if (event?.target) event.target.closest('.admin-menu-item')?.classList.add('active');

    const titles = {
        dashboard:'Dashboard', users:'İstifadəçilər', teachers:'Müəllimlər',
        teacherTests:'Müəllim Sınaqları', videos:'Video Dərslər', tests:'Sınaqlar',
        testResults:'Sınaq Nəticələri', news:'Xəbərlər', payments:'Ödənişlər',
        settings:'Tənzimləmələr',
        leaderboard:'Xal Liderliyi', devices:'Cihaz İdarəetməsi',
        suspicious:'Şübhəli Fəaliyyətlər', activeUsers:'Aktiv İstifadəçilər',
    };
    const pt = document.getElementById('pageTitle');
    if (pt) pt.textContent = titles[section] || 'Dashboard';

    const loaders = {
        users:        () => loadUsers(),
        teachers:     () => loadTeachers(),
        tests:        () => loadTests(),
        news:         () => loadNews(),
        payments:     () => loadPayments(),
        teacherTests: () => { loadTeacherTestsSection(); _updateTeacherTestsBadge(); },
        testResults:  () => loadTestResults(),
        settings:     () => loadSiteSettings(),
        premium:      () => loadPremiumRequests(),
        leaderboard:  () => loadLeaderboard(),
    };
    if (loaders[section]) loaders[section]();
}

// ════════════════════════════════════════════════════════
//  Dashboard Stats
// ════════════════════════════════════════════════════════
async function loadDashboardStats() {
    try {
        const stats = await API.stats.get();
        _setStat('statUsers',    stats.users);
        _setStat('statTests',    stats.tests);
        _setStat('statNews',     stats.news);
        _setStat('statTeachers', stats.teachers);
        _setStat('statPremium',  stats.premium);
    } catch(e) {
        console.warn('Stats load failed', e);
    }
}
function _setStat(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val ?? '—';
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
    const container = document.getElementById('premiumRequestsList');
    if (!container) return;
    showSpinner(container);
    try {
        const reqs = await API.premium.list();
        const pending = reqs.filter(r => r.status === 'pending');
        const badge = document.getElementById('premiumPendingBadge');
        if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? 'inline-flex' : 'none'; }

        if (!reqs.length) { showEmpty(container, 'Premium müraciət yoxdur'); return; }
        container.innerHTML = reqs.map(r => `
            <div style="display:flex;align-items:center;gap:14px;padding:14px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;">
                <div style="flex:1;">
                    <strong>${escapeHtml(r.userName)}</strong> — ${escapeHtml(r.packageName)}
                    <br><span style="font-size:12px;color:#6b7280;">${r.userEmail} · ${r.price} ₼ · ${formatDate(r.requestedAt)}</span>
                </div>
                ${r.status === 'pending' ? `
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-sm btn-success" onclick="approvePremium('${r.id}')"><i class="fas fa-check"></i> Təsdiqlə</button>
                    <button class="btn btn-sm btn-danger"  onclick="rejectPremium('${r.id}')"><i class="fas fa-times"></i> Rədd Et</button>
                </div>` : `<span style="padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;background:${r.status==='approved'?'#ecfdf5':'#fef2f2'};color:${r.status==='approved'?'#065f46':'#991b1b'};">${r.status==='approved'?'✅ Təsdiqləndi':'❌ Rədd Edildi'}</span>`}
            </div>`).join('');
    } catch(e) { showError(container, e.message); }
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
    const container = document.getElementById('teacherTestsList');
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

const SITE_SETTING_FIELDS = {
    branding: { siteName: 'name', logoShort: 'logoShort', siteSlogan: 'slogan', metaDescription: 'metaDescription' },
    colors: { colorPrimary: 'primary', colorSecondary: 'secondary', colorSuccess: 'success', colorWarning: 'warning', colorDanger: 'danger', colorDark: 'dark' },
    typography: { fontFamily: 'fontFamily', fontSize: 'fontSize', headingFont: 'headingFont', lineHeight: 'lineHeight' },
    content: { heroTitle: 'heroTitle', heroSubtitle: 'heroSubtitle', ctaButton1: 'ctaButton1', ctaButton2: 'ctaButton2' },
    footer: { footerEmail: 'email', footerPhone: 'phone', footerInstagram: 'instagram', footerTelegram: 'telegram', footerCopyright: 'copyright', footerDescription: 'description' },
};

async function loadSiteSettings() {
    try {
        const settings = await API.settings.get();
        for (const [section, fields] of Object.entries(SITE_SETTING_FIELDS)) {
            for (const [fieldId, key] of Object.entries(fields)) {
                const input = document.getElementById(fieldId);
                if (input && settings[section]?.[key] !== undefined) input.value = settings[section][key];
            }
        }
        updateSettingRangeLabels();
    } catch (error) {
        showNotification(error.message || 'Sayt tənzimləmələrini yükləmək mümkün olmadı.', 'error');
    }
}

function collectSiteSettings() {
    const settings = {};
    for (const [section, fields] of Object.entries(SITE_SETTING_FIELDS)) {
        settings[section] = {};
        for (const [fieldId, key] of Object.entries(fields)) {
            const input = document.getElementById(fieldId);
            if (!input) continue;
            settings[section][key] = ['fontSize', 'lineHeight'].includes(key) ? Number(input.value) : input.value.trim();
        }
    }
    return settings;
}

function updateSettingRangeLabels() {
    const fontSize = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    const lineHeight = document.getElementById('lineHeight');
    const lineHeightValue = document.getElementById('lineHeightValue');
    if (fontSize && fontSizeValue) fontSizeValue.textContent = `${fontSize.value}px`;
    if (lineHeight && lineHeightValue) lineHeightValue.textContent = lineHeight.value;
}

async function saveSiteSettings() {
    try {
        await API.settings.save(collectSiteSettings());
        showNotification('Sayt tənzimləmələri online saxlanıldı.', 'success');
    } catch (error) {
        showNotification(error.message || 'Tənzimləmələri saxlamaq mümkün olmadı.', 'error');
    }
}

function switchEditorTab(name) {
    const contentId = `editor${name.charAt(0).toUpperCase()}${name.slice(1)}`;
    const content = document.getElementById(contentId);
    if (!content) return;
    document.querySelectorAll('.editor-content').forEach(section => { section.style.display = 'none'; });
    content.style.display = 'block';
    document.querySelectorAll('.editor-tab').forEach(button => {
        button.classList.toggle('active', button.getAttribute('onclick')?.includes(`'${name}'`));
    });
}

function previewSite() {
    const settings = collectSiteSettings();
    for (const [key, value] of Object.entries(settings.colors || {})) {
        document.documentElement.style.setProperty(`--${key}`, value);
    }
    showNotification('Rəng önizləməsi cari admin səhifəsində tətbiq edildi.', 'info');
}

function resetSiteSettings() {
    showConfirm('Sayt tənzimləmələrini standart vəziyyətə qaytarmaq istəyirsiniz?', async () => {
        try {
            await API.settings.save({});
            document.querySelectorAll('#siteEditor input, #siteEditor textarea, #siteEditor select').forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') input.checked = input.defaultChecked;
                else if (input.tagName === 'SELECT') input.selectedIndex = [...input.options].findIndex(option => option.defaultSelected);
                else input.value = input.defaultValue;
            });
            updateSettingRangeLabels();
            ['--primary', '--secondary', '--success', '--warning', '--danger', '--dark'].forEach(name => {
                document.documentElement.style.removeProperty(name);
            });
            showNotification('Standart tənzimləmələr bərpa edildi.', 'success');
        } catch (error) {
            showNotification(error.message || 'Tənzimləmələri sıfırlamaq mümkün olmadı.', 'error');
        }
    });
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
        const { data: users } = await API.users.list({ limit: 200 });
        const sorted = [...users].sort((a,b) => (b.points||0)-(a.points||0)).slice(0,20);
        if (!sorted.length) { showEmpty(container, 'Xal məlumatı yoxdur'); return; }
        container.innerHTML = sorted.map((u,i) => `
            <div style="display:flex;align-items:center;gap:14px;padding:12px 16px;border-bottom:1px solid var(--border);">
                <div style="width:32px;text-align:center;font-weight:800;font-size:16px;color:${i===0?'#fbbf24':i===1?'#9ca3af':i===2?'#f59e0b':'#94a3b8'};">${i+1}</div>
                <div style="width:38px;height:38px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;">${u.name[0].toUpperCase()}</div>
                <div style="flex:1;"><strong>${escapeHtml(u.name)}</strong><br><span style="font-size:12px;color:#6b7280;">${u.email}</span></div>
                <div style="font-weight:800;font-size:18px;color:var(--primary);">${u.points||0} xal</div>
            </div>`).join('');
    } catch(e) { showError(container, e.message); }
}

// ════════════════════════════════════════════════════════
//  Settings
// ════════════════════════════════════════════════════════
function saveSettings() {
    showNotification('Tənzimləmələr yadda saxlanıldı!', 'success');
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
