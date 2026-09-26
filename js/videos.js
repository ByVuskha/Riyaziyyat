'use strict';

let videoCatalog = [];
let currentCategory = 'all';
let currentSearch = '';

function normalizeVideoText(value) {
    return String(value || '').toLocaleLowerCase('az-AZ')
        .replace(/[ə]/g, 'e').replace(/[ı]/g, 'i').replace(/[ö]/g, 'o')
        .replace(/[ü]/g, 'u').replace(/[ş]/g, 's').replace(/[ç]/g, 'c')
        .replace(/[ğ]/g, 'g');
}

function escapeVideoText(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
}

function youtubeVideoId(url) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.endsWith('youtu.be')) return parsed.pathname.slice(1).split('/')[0];
        if (parsed.hostname.endsWith('youtube.com')) {
            if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
            const match = parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/);
            return match ? match[1] : '';
        }
    } catch {}
    return '';
}

async function loadVideos() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    grid.innerHTML = '<p class="videos-state">Video dərslər yüklənir...</p>';

    try {
        const { data } = await API.videos.list({ limit: 100 });
        videoCatalog = Array.isArray(data) ? data : [];
        const params = new URLSearchParams(window.location.search);
        const category = params.get('filter');
        const teacher = params.get('teacher');
        if (category) currentCategory = category;
        if (teacher) {
            currentSearch = teacher;
            document.getElementById('searchInput').value = teacher;
        }
        document.querySelectorAll('.filter-btn').forEach(button => {
            button.classList.toggle('active', button.getAttribute('onclick')?.includes(`'${currentCategory}'`));
        });
        renderVideos();
    } catch (error) {
        grid.innerHTML = `<div class="videos-state videos-error">${escapeVideoText(error.message || 'Videolar yüklənmədi. Şəbəkə bağlantısını yoxlayın.')}</div>`;
    }
}

function filterVideos(category, button) {
    currentCategory = category || 'all';
    document.querySelectorAll('.filter-btn').forEach(item => item.classList.remove('active'));
    if (button) button.classList.add('active');
    renderVideos();
}

function searchVideos(value) {
    currentSearch = value || '';
    renderVideos();
}

function renderVideos() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    const category = normalizeVideoText(currentCategory);
    const query = normalizeVideoText(currentSearch);
    const filtered = videoCatalog.filter(video => {
        const matchesCategory = category === 'all' || normalizeVideoText(video.category) === category;
        const matchesFree = category !== 'free' || !video.isPremium;
        const matchesSearch = !query || normalizeVideoText(`${video.title} ${video.description} ${video.teacherName}`).includes(query);
        return matchesCategory && matchesFree && matchesSearch;
    });

    if (!filtered.length) {
        grid.innerHTML = '<div class="videos-state">Bu mövzu üzrə video tapılmadı.</div>';
        return;
    }

    grid.innerHTML = filtered.map(video => {
        const id = escapeVideoText(video.id);
        const title = escapeVideoText(video.title);
        const description = escapeVideoText(video.description || '');
        const categoryLabel = escapeVideoText(video.category || 'Riyaziyyat');
        const teacher = escapeVideoText(video.teacherName || 'Bizim Riyaziyyat');
        const youtubeId = youtubeVideoId(video.youtubeUrl || '');
        const thumbnail = video.thumbnailUrl || (youtubeId ? `https://img.youtube.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg` : '');
        const image = thumbnail ? `<img src="${escapeVideoText(thumbnail)}" alt="${title}" loading="lazy">` : `<span class="topic-emoji">${escapeVideoText(video.emoji || '📐')}</span>`;
        return `
            <article class="video-card">
                <button class="video-thumb play-video" type="button" data-video-id="${id}" aria-label="${title} videosunu aç">
                    ${image}
                    <span class="play-btn"><i class="fas ${video.locked ? 'fa-lock' : 'fa-play'}"></i></span>
                    <span class="duration">${escapeVideoText(video.duration || 'Video')}</span>
                    ${video.isPremium ? '<span class="lock-badge">Premium</span>' : ''}
                </button>
                <div class="video-body">
                    <h3>${title}</h3>
                    <p>${description}</p>
                    <div class="video-meta">
                        <span>${categoryLabel} · ${teacher}</span>
                        <span>${Number(video.views) || 0} baxış</span>
                    </div>
                </div>
            </article>`;
    }).join('');
}

async function playVideo(id) {
    const video = videoCatalog.find(item => String(item.id) === String(id));
    if (!video) return;
    const modal = document.getElementById('videoModal');
    const title = document.getElementById('modalTitle');
    const description = document.getElementById('modalDesc');
    const player = document.getElementById('videoPlayerContainer');

    if (video.locked) {
        const user = await API.getCurrentUser();
        player.innerHTML = `<div class="videos-state">Bu dərs Premium üzvlər üçündür. <a href="${user ? 'index.html#premiumSection' : 'login.html'}">${user ? 'Paketlərə bax' : 'Daxil ol'}</a></div>`;
        title.textContent = video.title;
        description.textContent = '';
        modal.style.display = 'flex';
        return;
    }

    try {
        const fullVideo = await API.videos.get(id);
        title.textContent = fullVideo.title || video.title;
        description.textContent = fullVideo.description || '';
        const youtubeId = youtubeVideoId(fullVideo.youtubeUrl || '');
        if (youtubeId) {
            player.innerHTML = `<div class="video-player-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}" title="${escapeVideoText(fullVideo.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
        } else if (fullVideo.videoUrl && /^https:\/\//i.test(fullVideo.videoUrl)) {
            player.innerHTML = `<video controls playsinline preload="metadata" style="width:100%;max-height:70vh;background:#000"><source src="${escapeVideoText(fullVideo.videoUrl)}">Brauzer videonu aça bilmədi.</video>`;
        } else {
            throw new Error('Video ünvanı düzgün deyil');
        }
        API.videos.view(id).catch(() => {});
        modal.style.display = 'flex';
    } catch (error) {
        if (error.status === 403) {
            player.innerHTML = '<div class="videos-state">Bu dərs Premium üzvlər üçündür. <a href="index.html#premiumSection">Paketlərə bax</a></div>';
            title.textContent = video.title;
            description.textContent = '';
            modal.style.display = 'flex';
            return;
        }
        showNotification(error.message || 'Video açıla bilmədi', 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayerContainer');
    if (player) player.replaceChildren();
    if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('videosGrid');
    if (grid) grid.addEventListener('click', event => {
        const button = event.target.closest('.play-video');
        if (button) playVideo(button.dataset.videoId);
    });
    loadVideos();
});