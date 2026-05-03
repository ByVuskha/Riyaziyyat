// Mock data - backend hazır olana qədər
const MOCK_VIDEOS = [
    { id:1, title:'Üçbucaqda bucaqların cəmi', topic:'hendese', emoji:'📐', duration:'18:24', views:1240, free:true, desc:'Üçbucağın daxili bucaqlarının cəminin 180° olduğunu isbat edirik.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:2, title:'Pifaqor teoremi', topic:'hendese', emoji:'📐', duration:'22:10', views:980, free:true, desc:'Düzbucaqlı üçbucaqda a²+b²=c² əlaqəsi.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:3, title:'Dairə və onun elementləri', topic:'hendese', emoji:'📐', duration:'15:40', views:760, free:false, desc:'Radius, diametr, vətər, yay anlayışları.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:4, title:'Fəza həndəsəsinə giriş', topic:'hendese', emoji:'📐', duration:'28:05', views:540, free:false, desc:'3 ölçülü fəzada nöqtə, düz xətt, müstəvi.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:5, title:'Xətti tənliklər', topic:'cebr', emoji:'🔢', duration:'20:15', views:1560, free:true, desc:'ax+b=0 formasında tənliklərin həlli.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:6, title:'Kvadrat tənliklər', topic:'cebr', emoji:'🔢', duration:'25:30', views:1320, free:true, desc:'Diskriminant düsturu ilə həll.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:7, title:'Funksiyalar və qrafiklər', topic:'cebr', emoji:'🔢', duration:'32:00', views:890, free:false, desc:'Funksiya anlayışı, sahə, dəyərlər çoxluğu.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:8, title:'Bərabərsizliklər', topic:'cebr', emoji:'🔢', duration:'19:45', views:670, free:false, desc:'Xətti və kvadrat bərabərsizliklərin həlli.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:9, title:'Limitlərə giriş', topic:'analiz', emoji:'∫', duration:'35:20', views:430, free:true, desc:'Limitin anlayışı, sadə limit hesablamaları.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:10, title:'Törəmə anlayışı', topic:'analiz', emoji:'∫', duration:'40:10', views:380, free:false, desc:'Diferensiallaşma qaydaları.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:11, title:'İnteqral hesabı', topic:'analiz', emoji:'∫', duration:'45:00', views:290, free:false, desc:'Qeyri-müəyyən inteqral, əsas düsturlar.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:12, title:'Ehtimal nəzəriyyəsi', topic:'ehtimal', emoji:'🎲', duration:'22:30', views:510, free:true, desc:'Hadisə, ehtimal, klassik tərif.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { id:13, title:'Kombinatorika', topic:'ehtimal', emoji:'🎲', duration:'18:50', views:440, free:false, desc:'Permutasiya, kombinasiya, yerləşdirmə.', youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

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
    let filtered = VIDEOS.filter(v => {
        const matchFilter = currentFilter === 'all' || 
                           (currentFilter === 'free' ? v.free : v.topic === currentFilter);
        const matchSearch = v.title.toLowerCase().includes(currentSearch.toLowerCase());
        return matchFilter && matchSearch;
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
