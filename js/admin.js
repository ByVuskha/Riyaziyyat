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
    loadDashboardStats();
    loadUsers();
    _updateTeacherTestsBadge();
    _updatePdfBadge();
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
        const newTitle = prompt('Başlıq:', n.title);
        if (!newTitle) return;
        await API.news.update(id, { title: newTitle.trim() });
        showNotification('Xəbər yeniləndi!', 'success');
        loadNews();
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
        const all = await API.teacherTests.list({ status: 'pending' });
        const cnt = all.length;
        const badge = document.getElementById('teacherTestsBadge');
        if (badge) { badge.textContent = cnt; badge.style.display = cnt ? 'inline-flex' : 'none'; }
    } catch {}
}

async function loadTeacherTestsSection() {
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
    const note = prompt('Rədd səbəbi (istəyə bağlı):') || '';
    try { await API.teacherTests.reject(id, note); showNotification('Sınaq rədd edildi', 'warning'); loadTeacherTestsSection(); _updateTeacherTestsBadge(); }
    catch(e) { showNotification(e.message, 'error'); }
}

// ════════════════════════════════════════════════════════
//  PDF Management
// ════════════════════════════════════════════════════════
let _pdfFileData = null;

async function _updatePdfBadge() {
    try {
        const reqs = await API.pdfRequests.list({ status: 'pending' });
        const cnt  = reqs.length;
        const badge = document.getElementById('pdfPendingBadge');
        if (badge) { badge.textContent = cnt; badge.style.display = cnt ? 'inline-flex' : 'none'; }
    } catch {}
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

// ── PDF Type Toggle (new button-based UI) ────────────────────────────────
function setPdfType(type) {
    document.getElementById('pdfType').value = type;
    const pg = document.getElementById('pdfPriceGroup');
    if (pg) pg.style.display = type === 'paid' ? 'block' : 'none';
    document.getElementById('typeBtnFree').classList.toggle('active', type === 'free');
    document.getElementById('typeBtnPaid').classList.toggle('active', type === 'paid');
}

// ── Drag & Drop handler ───────────────────────────────────────────────────
function handlePdfDrop(event) {
    event.preventDefault();
    const dz = document.getElementById('pdfDropZone');
    if (dz) dz.classList.remove('drag-over');
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        const fakeInput = { files: [file] };
        onPdfFileSelected(fakeInput);
    }
}

function togglePdfUploadForm() {
    const form = document.getElementById('pdfUploadForm');
    if (!form) return;
    const open = form.style.display !== 'none';
    form.style.display = open ? 'none' : 'block';
    const btn = document.getElementById('pdfUploadToggleBtn');
    if (btn) {
        btn.innerHTML = open
            ? '<i class="fas fa-plus"></i> Yeni PDF Yüklə'
            : '<i class="fas fa-times"></i> Bağla';
    }
    if (!open) {
        ['pdfTitle','pdfDescription','pdfPages','pdfPrice'].forEach(id => {
            const e = document.getElementById(id); if(e) e.value = '';
        });
        const pi = document.getElementById('pdfFileInfo');
        if (pi) { pi.style.display = 'none'; pi.innerHTML = ''; }
        _pdfFileData = null;
        // reset drop zone appearance
        const dz = document.getElementById('pdfDropZone');
        if (dz) dz.style.borderColor = '';
        const icon = document.getElementById('pdfDropIcon');
        if (icon) icon.innerHTML = '<i class="fas fa-file-pdf"></i>';
        // reset type toggle
        setPdfType('free');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // pdfType select fallback (hidden input used instead, but keep legacy compat)
    const typeEl = document.getElementById('pdfType');
    if (typeEl && typeEl.tagName === 'SELECT') {
        typeEl.addEventListener('change', () => {
            const pg = document.getElementById('pdfPriceGroup');
            if (pg) pg.style.display = typeEl.value === 'paid' ? 'block' : 'none';
        });
    }
});

function onPdfFileSelected(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { showNotification('Yalnız PDF fayl yükləyə bilərsiniz!', 'error'); return; }
    if (file.size > 20 * 1024 * 1024)   { showNotification('PDF maksimum 20 MB ola bilər!', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        _pdfFileData = { name: file.name, size: file.size, sizeLabel: _fmtBytes(file.size), base64: e.target.result };
        const info = document.getElementById('pdfFileInfo');
        if (info) {
            info.style.display = 'flex';
            info.innerHTML = `
                <i class="fas fa-check-circle" style="color:#10b981;font-size:16px;"></i>
                <div style="flex:1;">
                    <strong style="display:block;">${file.name}</strong>
                    <span style="font-size:11px;color:#065f46;">${_pdfFileData.sizeLabel}</span>
                </div>
                <div class="pdf-file-progress" style="display:block;width:100%;margin-top:6px;"></div>`;
            // add progress bar inside
            const prog = document.createElement('div');
            prog.className = 'pdf-file-progress';
            prog.innerHTML = '<div class="pdf-file-progress-bar"></div>';
            info.appendChild(prog);
        }
        const dz = document.getElementById('pdfDropZone');
        if (dz) dz.style.borderColor = '#10b981';
        const icon = document.getElementById('pdfDropIcon');
        if (icon) icon.innerHTML = '<i class="fas fa-file-pdf" style="color:#10b981;"></i><div class="drop-math">fayl hazırdır ✓</div>';
    };
    reader.readAsDataURL(file);
}
function _fmtBytes(b) { if(b<1024) return b+'B'; if(b<1024*1024) return (b/1024).toFixed(1)+'KB'; return (b/1024/1024).toFixed(1)+'MB'; }

async function savePdf() {
    const title = document.getElementById('pdfTitle').value.trim();
    if (!title) { showNotification('Başlıq daxil edin!', 'error'); return; }
    if (!_pdfFileData) { showNotification('PDF faylı seçin!', 'error'); return; }

    const btn = document.getElementById('savePdfBtn') || document.querySelector('#pdfUploadForm .btn-primary');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Yüklənir...'; }

    try {
        const pdfTypeVal = document.getElementById('pdfType').value;
        await API.pdfs.create({
            title,
            category:     document.getElementById('pdfCategory').value.replace(/^[^\w]*/,'').trim().split(' ')[0] || 'Digər',
            type:         pdfTypeVal,
            price:        parseFloat(document.getElementById('pdfPrice')?.value) || 0,
            pages:        parseInt(document.getElementById('pdfPages')?.value) || null,
            description:  document.getElementById('pdfDescription')?.value.trim() || '',
            fileName:     _pdfFileData.name,
            fileSizeLabel:_pdfFileData.sizeLabel,
            fileData:     _pdfFileData.base64,
        });
        _pdfFileData = null;
        togglePdfUploadForm();
        loadPdfs();
        loadDashboardStats();
        showNotification(`"${title}" PDF-i uğurla əlavə edildi! 📄`, 'success');
    } catch(e) {
        showNotification(e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> PDF-i Yüklə'; }
    }
}

async function loadPdfs() {
    const typeF = document.getElementById('pdfFilterType')?.value || '';
    const catF  = document.getElementById('pdfFilterCat')?.value  || '';
    const tbody = document.getElementById('pdfsTable');
    if (!tbody) return;
    showTableLoading(tbody, 8);
    try {
        const params = {};
        if (typeF) params.type     = typeF;
        if (catF)  params.category = catF.replace(/^[^\w]*/,'').trim().split(' ')[0];
        const { data: pdfs } = await API.pdfs.list(params);

        // Update quick stats
        const allPdfs = pdfs; // filtered, but for stats load all
        try {
            const { data: allData } = await API.pdfs.list({});
            const freeC = allData.filter(p=>p.type==='free').length;
            const paidC = allData.filter(p=>p.type==='paid').length;
            const totalEl  = document.getElementById('pdfStatTotal');
            const freeEl   = document.getElementById('pdfStatFree');
            const paidEl   = document.getElementById('pdfStatPaid');
            if (totalEl) totalEl.textContent = allData.length;
            if (freeEl)  freeEl.textContent  = freeC;
            if (paidEl)  paidEl.textContent  = paidC;
        } catch {}

        if (!pdfs.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="pdf-empty-row">
                <i class="fas fa-file-pdf"></i>
                <span>${typeF||catF ? 'Filtrə uyğun PDF tapılmadı' : 'Hələ heç bir PDF yüklənməyib'}</span>
            </td></tr>`;
            return;
        }
        tbody.innerHTML = pdfs.map(p => `
            <tr>
                <td><strong><i class="fas fa-file-pdf" style="color:#ef4444;margin-right:6px;"></i>${escapeHtml(p.title)}</strong></td>
                <td><span style="background:#f1f5f9;padding:2px 8px;border-radius:6px;font-size:12px;">${p.category}</span></td>
                <td>${p.type==='paid'
                    ?'<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">💎 Ödənişli</span>'
                    :'<span style="background:#ecfdf5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">🆓 Pulsuz</span>'}</td>
                <td style="font-weight:700;">${p.type==='paid'?'<span style="color:#92400e;">'+p.price+' ₼</span>':'<span style="color:#9ca3af;">—</span>'}</td>
                <td style="color:#6b7280;font-size:13px;">${p.fileSizeLabel||'—'}</td>
                <td><span style="font-weight:700;color:#4338ca;">${p.downloads||0}</span></td>
                <td style="font-size:12px;color:#6b7280;">${formatDate(p.createdAt)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-delete" onclick="deletePdf('${p.id}')" title="Sil"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            </tr>`).join('');
        _updatePdfBadge();
    } catch(e) {
        tbody.innerHTML = `<tr><td colspan="8" style="color:#ef4444;padding:20px;text-align:center;">${e.message}</td></tr>`;
    }
}

function deletePdf(id) {
    showConfirm('Bu PDF-i silmək istədiyinizdən əminsiniz?', async () => {
        try {
            await API.pdfs.remove(id);
            showNotification('PDF silindi!', 'success');
            loadPdfs();
            loadDashboardStats();
        } catch(e) { showNotification(e.message, 'error'); }
    });
}

async function loadPdfDownloadRequests() {
    const container = document.getElementById('pdfRequestsList');
    const wrapper   = document.getElementById('pdfDownloadRequests');
    const countEl   = document.getElementById('pendingPdfRequestCount');
    const statEl    = document.getElementById('pdfStatPending');
    if (!container) return;
    try {
        const reqs    = await API.pdfRequests.list({ status: 'pending' });
        if (countEl)  countEl.textContent = reqs.length;
        if (statEl)   statEl.textContent  = reqs.length;
        if (wrapper)  wrapper.style.display = reqs.length ? 'block' : 'none';
        _updatePdfBadge();
        if (!reqs.length) { container.innerHTML = ''; return; }
        container.innerHTML = reqs.map(r => `
            <div class="pdf-request-row">
                <i class="fas fa-file-pdf" style="color:#ef4444;font-size:20px;flex-shrink:0;"></i>
                <div class="pdf-request-info">
                    <strong>${escapeHtml(r.userName)}</strong> — ${escapeHtml(r.pdfTitle)}
                    <span>${r.userEmail} · <strong>${r.amount} ₼</strong> · ${formatDate(r.requestedAt)}</span>
                </div>
                <div class="pdf-request-actions">
                    <button class="btn btn-sm btn-success" onclick="approvePdfRequest('${r.id}')">
                        <i class="fas fa-check"></i> Təsdiqlə
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="rejectPdfRequest('${r.id}')">
                        <i class="fas fa-times"></i> Rədd Et
                    </button>
                </div>
            </div>`).join('');
    } catch(e) { if (wrapper) wrapper.style.display = 'none'; }
}

async function approvePdfRequest(id) {
    try { await API.pdfRequests.approve(id); showNotification('PDF yükləmə təsdiqləndi!', 'success'); loadPdfDownloadRequests(); }
    catch(e) { showNotification(e.message, 'error'); }
}
async function rejectPdfRequest(id) {
    try { await API.pdfRequests.reject(id); showNotification('Müraciət rədd edildi, balans qaytarıldı', 'warning'); loadPdfDownloadRequests(); }
    catch(e) { showNotification(e.message, 'error'); }
}

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
