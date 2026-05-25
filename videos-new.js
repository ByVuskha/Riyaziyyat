// Mock data - only for demo, will be replaced by uploaded videos
const MOCK_VIDEOS = [];

let currentFilter = 'all';
let currentSearch = '';

// Load videos from localStorage and merge with mock data
function getAllVideos() {
    const uploadedVideos = Storage.get('videos') || [];
    
    // Convert uploaded videos to display format
    const formattedUploaded = uploadedVideos.map(v => {
        // Get teacher info
        const teachers = Storage.get('teachers') || [];
        const teacher = teachers.find(t => t.id == v.teacherId);
        
        return {
            id: 'uploaded_' + v.id,
            title: v.title,
            topic: (v.category || 'Cəbr').toLowerCase().replace('ə', 'e').replace('ı', 'i'),
            emoji: getCategoryEmoji(v.category),
            duration: v.duration || '00:00',
            views: v.views || 0,
            free: !v.isPremium,
            desc: v.description || '',
            source: v.source || 'youtube',
            videoUrl: v.videoUrl,
            youtubeUrl: v.youtubeUrl,
            teacherName: teacher ? teacher.name : null,
            teacherId: v.teacherId
        };
    });
    
    // Merge mock and uploaded videos
    return [...formattedUploaded, ...MOCK_VIDEOS];
}

function getCategoryEmoji(category) {
    const emojis = {
        'Cəbr': '🔢',
        'Həndəsə': '📐',
        'Analiz': '∫',
        'Triqonometriya': '📊',
        'Ədəd Nəzəriyyəsi': '🔢',
        'Statistika': '📈',
        'Ehtimal': '🎲'
    };
    return emojis[category] || '📚';
}

function renderVideos() {
    const VIDEOS = getAllVideos();
    const grid = document.getElementById('videosGrid');
    
    // Get URL params for filtering
    const urlParams = new URLSearchParams(window.location.search);
    const teacherFilter = urlParams.get('teacher');
    
    let filtered = VIDEOS.filter(v => {
        const matchFilter = currentFilter === 'all' || 
                           (currentFilter === 'free' ? v.free : v.topic === currentFilter);
        const matchSearch = v.title.toLowerCase().includes(currentSearch.toLowerCase()) ||
                           (v.teacherName && v.teacherName.toLowerCase().includes(currentSearch.toLowerCase()));
        const matchTeacher = !teacherFilter || (v.teacherName && v.teacherName === teacherFilter);
        return matchFilter && matchSearch && matchTeacher;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--gray);"><i class="fas fa-video" style="font-size:50px;opacity:0.3;margin-bottom:15px;"></i><p>Video tapılmadı</p></div>';
        return;
    }

    grid.innerHTML = filtered.map(v => {
        let thumbnailHtml = '';
        
        // Get YouTube thumbnail if available
        if (v.youtubeUrl) {
            const videoId = extractYouTubeId(v.youtubeUrl);
            if (videoId) {
                thumbnailHtml = `<img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.3;" alt="${v.title}">`;
            }
        }
        
        const videoIdStr = typeof v.id === 'string' ? `'${v.id}'` : v.id;
        
        return `
        <div class="video-card">
            <div class="video-thumb" onclick="openVideo(${videoIdStr})">
                ${thumbnailHtml}
                <span class="topic-emoji">${v.emoji}</span>
                <div class="play-btn"><i class="fas fa-play"></i></div>
                <span class="duration">${v.duration}</span>
                ${!v.free ? '<span class="lock-badge"><i class="fas fa-lock"></i> Premium</span>' : ''}
            </div>
            <div class="video-body">
                <h3>${v.title}</h3>
                <p>${v.desc}</p>
                ${v.teacherName ? `<p style="font-size:12px;color:var(--primary);margin-bottom:8px;"><i class="fas fa-chalkboard-teacher"></i> ${v.teacherName}</p>` : ''}
                <div class="video-meta">
                    <span><i class="fas fa-eye"></i> ${v.views.toLocaleString()} baxış</span>
                    <span class="badge ${v.free ? 'badge-success' : 'badge-primary'}">${v.free ? 'Pulsuz' : 'Premium'}</span>
                </div>
            </div>
        </div>
    `}).join('');
}

function filterVideos(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderVideos();
}

function searchVideos(val) {
    currentSearch = val;
    renderVideos();
}

function openVideo(id) {
    const VIDEOS = getAllVideos();
    const video = VIDEOS.find(v => v.id === id);
    if (!video) {
        alert('Video tapılmadı!');
        return;
    }
    
    const user = getCurrentUser();
    
    // Premium check
    if (!video.free) {
        if (!user) {
            showPremiumPrompt('video');
            return;
        }
        if (!user.premium) {
            showPremiumPrompt('video');
            return;
        }
        // Check if premium expired
        if (user.premiumExpiresAt && new Date(user.premiumExpiresAt) < new Date()) {
            showPremiumPrompt('video', true);
            return;
        }
    }
    
    // Increment view count
    incrementVideoViews(id);
    
    // Track user video watch
    trackUserVideoWatch(id);
    
    // Points will be awarded based on watch time — see video player setup below
    
    document.getElementById('modalTitle').textContent = video.title;
    document.getElementById('modalDesc').innerHTML = `
        ${video.desc}
        ${video.teacherName ? `<br><strong style="color:var(--primary);"><i class="fas fa-chalkboard-teacher"></i> Müəllim: ${video.teacherName}</strong>` : ''}
        <br><span style="color:var(--gray);"><i class="fas fa-clock"></i> Müddət: ${video.duration}</span>
        <br><span style="color:var(--gray);"><i class="fas fa-eye"></i> Baxış: ${video.views + 1}</span>
    `;
    
    // Show video player based on source
    const playerContainer = document.getElementById('videoPlayerContainer');
    
    if (video.source === 'upload' && video.videoUrl) {
        playerContainer.innerHTML = `
            <video id="mainVideoPlayer" controls style="width:100%;border-radius:10px;background:#000;" autoplay>
                <source src="${video.videoUrl}" type="video/mp4">
                Brauzeriniz video təqdimatını dəstəkləmir.
            </video>
        `;
        // Track watch percentage for uploaded videos
        setTimeout(() => {
            const videoEl = document.getElementById('mainVideoPlayer');
            if (videoEl && user) {
                let maxPct = 0;
                let pointsGiven = false;
                videoEl.addEventListener('timeupdate', () => {
                    if (!videoEl.duration) return;
                    const pct = Math.round((videoEl.currentTime / videoEl.duration) * 100);
                    if (pct > maxPct) maxPct = pct;
                    // Award at 80% threshold
                    if (!pointsGiven && maxPct >= 80) {
                        pointsGiven = true;
                        if (typeof awardVideoPoints === 'function') awardVideoPoints(id, video.title, maxPct);
                    }
                });
                videoEl.addEventListener('ended', () => {
                    if (!pointsGiven) {
                        pointsGiven = true;
                        if (typeof awardVideoPoints === 'function') awardVideoPoints(id, video.title, 100);
                    }
                });
            }
        }, 300);
    } else if (video.youtubeUrl) {
        const videoId = extractYouTubeId(video.youtubeUrl);
        if (videoId) {
            // Parse duration to seconds for time-based tracking
            const durationParts = (video.duration || '0:00').split(':').map(Number);
            const totalSecs = durationParts.length === 3
                ? durationParts[0]*3600 + durationParts[1]*60 + durationParts[2]
                : durationParts[0]*60 + (durationParts[1] || 0);

            playerContainer.innerHTML = `
                <iframe 
                    id="ytPlayer"
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1" 
                    style="width:100%;aspect-ratio:16/9;border-radius:10px;"
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
            // For YouTube, use time-based estimation since postMessage API is limited
            if (user && totalSecs > 0) {
                let pointsGiven = false;
                const checkInterval = setInterval(() => {
                    // Check if modal is still open
                    if (!document.getElementById('videoModal')?.classList.contains('active')) {
                        clearInterval(checkInterval);
                        return;
                    }
                }, 5000);

                // Award partial points after 40% of duration, full after 80%
                const halfTime = totalSecs * 0.4 * 1000;
                const fullTime = totalSecs * 0.8 * 1000;

                setTimeout(() => {
                    if (!pointsGiven && document.getElementById('videoModal')?.classList.contains('active')) {
                        pointsGiven = true;
                        if (typeof awardVideoPoints === 'function') awardVideoPoints(id, video.title, 50);
                    }
                }, halfTime);

                setTimeout(() => {
                    if (document.getElementById('videoModal')?.classList.contains('active')) {
                        // Upgrade to full points if still watching
                        if (typeof awardVideoPoints === 'function') awardVideoPoints(id, video.title, 90);
                    }
                    clearInterval(checkInterval);
                }, fullTime);
            } else if (user) {
                // No duration info — award after 2 minutes
                setTimeout(() => {
                    if (document.getElementById('videoModal')?.classList.contains('active')) {
                        if (typeof awardVideoPoints === 'function') awardVideoPoints(id, video.title, 80);
                    }
                }, 120000);
            }
        } else {
            playerContainer.innerHTML = `
                <div style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:white;">
                    <div style="text-align:center;">
                        <i class="fas fa-exclamation-circle" style="font-size:50px;margin-bottom:15px;"></i>
                        <p>Video yüklənə bilmədi</p>
                    </div>
                </div>
            `;
        }
    } else {
        playerContainer.innerHTML = `
            <div style="aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;color:white;">
                <div style="text-align:center;">
                    <i class="fas fa-play-circle" style="font-size:60px;opacity:0.6;"></i>
                    <p style="margin-top:15px;opacity:0.6;">Video mövcud deyil</p>
                </div>
            </div>
        `;
    }
    
    document.getElementById('videoModal').classList.add('active');
}

function incrementVideoViews(videoId) {
    // For uploaded videos
    if (typeof videoId === 'string' && videoId.includes('uploaded_')) {
        const videos = Storage.get('videos') || [];
        const realId = parseInt(videoId.replace('uploaded_', ''));
        const video = videos.find(v => v.id === realId);
        if (video) {
            video.views = (video.views || 0) + 1;
            Storage.set('videos', videos);
        }
    }
    // For mock videos, track separately
    else {
        const viewCounts = Storage.get('videoViews') || {};
        viewCounts[videoId] = (viewCounts[videoId] || 0) + 1;
        Storage.set('videoViews', viewCounts);
    }
}

function trackUserVideoWatch(videoId) {
    const user = getCurrentUser();
    if (!user) return;
    
    const userVideos = Storage.get('userVideos_' + user.id) || [];
    if (!userVideos.includes(videoId)) {
        userVideos.push(videoId);
        Storage.set('userVideos_' + user.id, userVideos);
        
        // Update teacher's student count
        const videos = Storage.get('videos') || [];
        const video = videos.find(v => v.id === videoId || v.id === 'uploaded_' + videoId);
        
        if (video && video.teacherId) {
            updateTeacherStudentCount(video.teacherId, user.id);
        }
    }
}

// New function to update teacher student count
function updateTeacherStudentCount(teacherId, userId) {
    const teachers = Storage.get('teachers') || [];
    const teacher = teachers.find(t => t.id == teacherId);
    
    if (!teacher) return;
    
    // Track unique students per teacher
    const teacherStudents = Storage.get(`teacher_${teacherId}_students`) || [];
    
    if (!teacherStudents.includes(userId)) {
        teacherStudents.push(userId);
        Storage.set(`teacher_${teacherId}_students`, teacherStudents);
        
        // Update teacher's student count
        const teacherIndex = teachers.findIndex(t => t.id == teacherId);
        if (teacherIndex !== -1) {
            teachers[teacherIndex].students = teacherStudents.length;
            Storage.set('teachers', teachers);
            console.log(`✅ Müəllim ${teacher.name} - Tələbə sayı: ${teacherStudents.length}`);
        }
    }
}

function extractYouTubeId(url) {
    if (!url) return null;
    if (url.includes('youtube.com/watch?v=')) {
        return url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
        return url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
        return url.split('embed/')[1].split('?')[0];
    }
    return null;
}

function closeModal() {
    const modal = document.getElementById('videoModal');
    modal.classList.remove('active');
    // Stop video playback
    document.getElementById('videoPlayerContainer').innerHTML = '';
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('videoModal').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    renderVideos();
});

// Re-render after Upstash loads fresh data
window.addEventListener('upstash:loaded', renderVideos);


// Show premium prompt when user tries to access premium content
function showPremiumPrompt(type = 'video', expired = false) {
    const overlay = document.createElement('div');
    overlay.id = 'premiumPromptOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); z-index: 9999;
        display: flex; align-items: center; justify-content: center; padding: 20px;
    `;
    
    const user = getCurrentUser();
    const isLoggedIn = !!user;
    const hasPending = user && user.premiumRequestedAt;
    
    overlay.innerHTML = `
        <div style="background:white;border-radius:20px;padding:35px;max-width:480px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="font-size:60px;margin-bottom:15px;">👑</div>
            <h2 style="margin:0 0 10px 0;font-size:24px;color:#1f2937;">
                ${expired ? 'Premium Müddəti Bitib' : 'Premium Məzmun'}
            </h2>
            <p style="color:#6b7280;margin:0 0 25px 0;line-height:1.6;">
                ${expired 
                    ? 'Premium üzvlüyünüzün müddəti bitib. Yenidən müraciət edin.'
                    : `Bu ${type === 'video' ? 'video' : 'sınaq'} yalnız premium üzvlər üçündür. Bütün məzmuna giriş üçün premium olun!`
                }
            </p>
            
            ${hasPending ? `
                <div style="background:#fef3c7;border-radius:12px;padding:16px;margin-bottom:20px;">
                    <p style="margin:0;color:#92400e;font-size:14px;">
                        <i class="fas fa-clock"></i> Müraciətiniz admin tərəfindən yoxlanılır.
                    </p>
                </div>
            ` : `
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
                    <div style="background:#f0f9ff;border-radius:10px;padding:12px;cursor:pointer;border:2px solid transparent;transition:all 0.2s;" onclick="selectPlanInPrompt(this,'premium1',1,15)">
                        <div style="font-weight:700;color:#667eea;">15 ₼</div>
                        <div style="font-size:12px;color:#6b7280;">1 Ay</div>
                    </div>
                    <div style="background:#f5f3ff;border-radius:10px;padding:12px;cursor:pointer;border:2px solid #8b5cf6;transition:all 0.2s;" onclick="selectPlanInPrompt(this,'premium6',6,75)">
                        <div style="font-weight:700;color:#8b5cf6;">75 ₼</div>
                        <div style="font-size:12px;color:#6b7280;">6 Ay</div>
                        <div style="font-size:10px;color:#10b981;">-17%</div>
                    </div>
                    <div style="background:#fffbeb;border-radius:10px;padding:12px;cursor:pointer;border:2px solid transparent;transition:all 0.2s;" onclick="selectPlanInPrompt(this,'premium12',12,120)">
                        <div style="font-weight:700;color:#f59e0b;">120 ₼</div>
                        <div style="font-size:12px;color:#6b7280;">1 İl</div>
                        <div style="font-size:10px;color:#10b981;">-33%</div>
                    </div>
                </div>
            `}
            
            <div style="display:flex;gap:12px;">
                <button onclick="document.getElementById('premiumPromptOverlay').remove()" 
                    style="flex:1;padding:12px;border:2px solid #e5e7eb;background:white;border-radius:10px;font-weight:600;cursor:pointer;color:#6b7280;">
                    Bağla
                </button>
                ${!isLoggedIn ? `
                    <a href="login.html" style="flex:2;padding:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:10px;font-weight:600;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;">
                        <i class="fas fa-sign-in-alt"></i> Giriş Et
                    </a>
                ` : hasPending ? `
                    <button onclick="document.getElementById('premiumPromptOverlay').remove()"
                        style="flex:2;padding:12px;background:#f59e0b;color:white;border-radius:10px;font-weight:600;cursor:pointer;border:none;">
                        <i class="fas fa-clock"></i> Gözlənilir...
                    </button>
                ` : `
                    <button id="promptSubmitBtn" onclick="submitPromptRequest()"
                        style="flex:2;padding:12px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:10px;font-weight:600;cursor:pointer;border:none;">
                        <i class="fas fa-paper-plane"></i> Müraciət Et
                    </button>
                `}
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    
    // Default select middle plan
    if (!hasPending && isLoggedIn) {
        window._selectedPromptPlan = { planId: 'premium6', months: 6, price: 75 };
    }
}

function selectPlanInPrompt(el, planId, months, price) {
    document.querySelectorAll('#premiumPromptOverlay [onclick^="selectPlan"]').forEach(e => {
        e.style.border = '2px solid transparent';
    });
    el.style.border = '2px solid #667eea';
    window._selectedPromptPlan = { planId, months, price };
}

function submitPromptRequest() {
    const plan = window._selectedPromptPlan;
    if (!plan) { alert('Paket seçin'); return; }
    
    const user = getCurrentUser();
    if (!user) { window.location.href = 'login.html'; return; }
    
    const btn = document.getElementById('promptSubmitBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; }
    
    const allUsers = Storage.get('allUsers') || [];
    const userIndex = allUsers.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
        allUsers[userIndex].premiumRequestedAt = new Date().toISOString();
        allUsers[userIndex].requestedPlan = plan;
        Storage.set('allUsers', allUsers);
        user.premiumRequestedAt = allUsers[userIndex].premiumRequestedAt;
        user.requestedPlan = plan;
        Storage.set('currentUser', user);
    }
    
    const requests = Storage.get('premiumRequests') || [];
    const newReq = {
        id: Date.now(), userId: user.id, userName: user.name, userEmail: user.email,
        plan: plan.planId, months: plan.months, price: plan.price,
        requestedAt: new Date().toISOString(), status: 'pending',
        date: new Date().toLocaleDateString('az-AZ'), time: new Date().toLocaleTimeString('az-AZ')
    };
    requests.unshift(newReq);
    Storage.set('premiumRequests', requests);
    
    // Force sync to Upstash
    if (typeof upstash !== 'undefined' && upstash) {
        Promise.all([
            upstash.set('premiumRequests', requests, 86400 * 30),
            upstash.set('allUsers', Storage.get('allUsers') || [], 86400 * 30)
        ]).catch(e => console.error('Upstash sync error:', e));
    }
    
    setTimeout(() => {
        document.getElementById('premiumPromptOverlay')?.remove();
        alert('✅ Müraciətiniz göndərildi!\nAdmin tərəfindən yoxlanılacaq.');
    }, 600);
}
