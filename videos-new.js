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
    if (!video.free && (!user || user.balance < 5)) {
        alert('Bu video premium-dur. Balans yükləyin və ya abunə olun.');
        return;
    }
    
    // Increment view count
    incrementVideoViews(id);
    
    // Track user video watch
    trackUserVideoWatch(id);
    
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
            <video controls style="width:100%;border-radius:10px;background:#000;" autoplay>
                <source src="${video.videoUrl}" type="video/mp4">
                Brauzeriniz video təqdimatını dəstəkləmir.
            </video>
        `;
    } else if (video.youtubeUrl) {
        const videoId = extractYouTubeId(video.youtubeUrl);
        if (videoId) {
            playerContainer.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                    style="width:100%;aspect-ratio:16/9;border-radius:10px;"
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
            `;
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
