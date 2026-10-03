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

function normalizeFilterValue(value) {
    const normalized = String(value || 'all').trim().toLowerCase();
    const aliases = {
        all: 'all',
        hamisi: 'all',
        ceber: 'cebr',
        cəbr: 'cebr',
        cabr: 'cebr',
        hendese: 'hendese',
        həndəsə: 'hendese',
        hendese: 'hendese',
        analiz: 'analiz',
        ehtimal: 'ehtimal',
        free: 'free',
        pulsuz: 'free',
    };
    return aliases[normalized] || normalized;
}

function syncFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(item => {
        const filterValue = normalizeFilterValue(item.dataset.filter || item.textContent || 'all');
        item.classList.toggle('active', filterValue === normalizeFilterValue(currentCategory));
    });
}

let youtubeApiPromise = null;
let youtubePlayer = null;

function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (youtubeApiPromise) return youtubeApiPromise;
    youtubeApiPromise = new Promise((resolve, reject) => {
        const previousReady = window.onYouTubeIframeAPIReady;
        const timeout = window.setTimeout(() => reject(new Error('YouTube player yüklənmədi')), 15000);
        window.onYouTubeIframeAPIReady = () => {
            if (typeof previousReady === 'function') previousReady();
            window.clearTimeout(timeout);
            resolve(window.YT);
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.onerror = () => {
                window.clearTimeout(timeout);
                reject(new Error('YouTube player yüklənmədi'));
            };
            document.head.appendChild(script);
        }
    });
    return youtubeApiPromise;
}

async function completeVideoWatch(videoId) {
    try {
        const result = await API.videos.completeWatch(videoId);
        if (result.earnedPoints > 0) {
            showNotification(`Video tamamlandı: +${result.earnedPoints} xal`, 'success');
            window.dispatchEvent(new CustomEvent('points:updated'));
        }
        return true;
    } catch (error) {
        showNotification(error.message || 'Video izlənməsi təsdiqlənmədi.', 'error');
        return false;
    }
}

async function loadVideos() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    grid.innerHTML = '<p class="videos-state">Video dərslər yüklənir...</p>';

    try {
        const { data } = await API.videos.list({ limit: 100 });
        videoCatalog = Array.isArray(data) ? data : [];
        const params = new URLSearchParams(window.location.search);
        const category = normalizeFilterValue(params.get('filter'));
        const teacher = params.get('teacher');
        if (category) currentCategory = category;
        if (teacher) {
            currentSearch = teacher;
            const input = document.getElementById('searchInput');
            if (input) input.value = teacher;
        }
        syncFilterButtons();
        renderVideos();
    } catch (error) {
        grid.innerHTML = `<div class="videos-state videos-error">${escapeVideoText(error.message || 'Videolar yüklənmədi. Şəbəkə bağlantısını yoxlayın.')}</div>`;
    }
}

function filterVideos(category, button) {
    currentCategory = normalizeFilterValue(category || 'all');
    if (button && button.dataset.filter) currentCategory = normalizeFilterValue(button.dataset.filter);
    syncFilterButtons();
    renderVideos();
}

function searchVideos(value) {
    currentSearch = value || '';
    renderVideos();
}

function renderVideos() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    const category = normalizeFilterValue(currentCategory);
    const query = normalizeVideoText(currentSearch);
    const filtered = videoCatalog.filter(video => {
        const rawCategory = normalizeVideoText(video.category || video.subject || 'Riyaziyyat');
        const rawTitle = normalizeVideoText(video.title || '');
        const rawTeacher = normalizeVideoText(video.teacherName || '');
        const matchesCategory = category === 'all' ? true : category === 'free' ? !video.isPremium : (
            rawCategory === category || rawTitle.includes(category) || rawTeacher.includes(category)
        );
        const matchesFree = category !== 'free' || !video.isPremium;
        const matchesSearch = !query || normalizeVideoText(`${video.title} ${video.description} ${video.teacherName}`).includes(query);
        return matchesCategory && matchesFree && matchesSearch;
    });

    if (!filtered.length) {
        const hasCatalog = videoCatalog.length > 0;
        grid.innerHTML = `
            <div class="videos-state">
                <span class="videos-state-icon" aria-hidden="true"><i class="fas ${hasCatalog ? 'fa-magnifying-glass' : 'fa-circle-play'}"></i></span>
                <h2>${hasCatalog ? 'Uyğun video tapılmadı' : 'Hələ video dərs yoxdur'}</h2>
                <p>${hasCatalog ? 'Axtarış sözünü və ya seçilmiş mövzunu dəyişib yenidən yoxlayın.' : 'Yeni video dərslər əlavə olunduqda burada görünəcək.'}</p>
                ${hasCatalog ? '<button class="btn btn-secondary btn-sm" type="button" onclick="resetVideoFilters()">Filtrləri təmizlə</button>' : ''}
            </div>`;
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
        const image = thumbnail ? `<img src="${escapeVideoText(thumbnail)}" alt="${title}" data-fallback="${escapeVideoText(video.emoji || '📐')}" loading="lazy">` : `<span class="topic-emoji">${escapeVideoText(video.emoji || '📐')}</span>`;
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

    grid.querySelectorAll('.video-thumb img').forEach(image => {
        image.addEventListener('error', () => {
            const fallback = document.createElement('span');
            fallback.className = 'topic-emoji';
            fallback.textContent = image.dataset.fallback || '📐';
            image.replaceWith(fallback);
        }, { once: true });
    });
}

function resetVideoFilters() {
    currentCategory = 'all';
    currentSearch = '';
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    syncFilterButtons();
    renderVideos();
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
        let watchSessionStarted = false;
        let watchSessionPromise = null;
        let completionRequested = false;
        const startWatchSession = () => {
            if (watchSessionPromise) return watchSessionPromise;
            watchSessionPromise = API.videos.startWatch(id)
                .then(() => { watchSessionStarted = true; })
                .catch(error => {
                    watchSessionPromise = null;
                    if (error.status !== 401) showNotification(error.message || 'Video izlənməsi qeydə alınmadı.', 'warning');
                });
            return watchSessionPromise;
        };
        const finishWatchSession = async () => {
            if (completionRequested) return;
            completionRequested = true;
            if (watchSessionPromise) await watchSessionPromise;
            if (watchSessionStarted) await completeVideoWatch(id);
        };
        if (youtubeId) {
            const hostId = `youtube-player-${Date.now()}`;
            player.innerHTML = `<div class="video-player-frame"><div id="${hostId}"></div></div>`;
            try {
                const YT = await loadYouTubeApi();
                youtubePlayer = new YT.Player(hostId, {
                    width: '100%',
                    height: '390',
                    videoId: youtubeId,
                    playerVars: { rel: 0 },
                    events: {
                        onStateChange: event => {
                            if (event.data === YT.PlayerState.PLAYING) startWatchSession();
                            if (event.data === YT.PlayerState.ENDED) finishWatchSession();
                        },
                    },
                });
            } catch (error) {
                player.innerHTML = `<div class="video-player-frame"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}" title="${escapeVideoText(fullVideo.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
                showNotification(error.message || 'YouTube player yüklənmədi.', 'warning');
            }
        } else if (fullVideo.videoUrl && /^https:\/\//i.test(fullVideo.videoUrl)) {
            player.innerHTML = `<video controls playsinline preload="metadata" style="width:100%;max-height:70vh;background:#000"><source src="${escapeVideoText(fullVideo.videoUrl)}">Brauzer videonu aça bilmədi.</video>`;
            const nativePlayer = player.querySelector('video');
            nativePlayer.addEventListener('play', startWatchSession);
            nativePlayer.addEventListener('ended', finishWatchSession, { once: true });
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
    if (youtubePlayer) {
        youtubePlayer.destroy();
        youtubePlayer = null;
    }
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