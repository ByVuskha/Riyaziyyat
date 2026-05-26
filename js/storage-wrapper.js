/**
 * Storage Wrapper - Upstash Integration
 *
 * Strategiya:
 * - Yazma: localStorage-a dərhal yaz, Upstash-a 1.5s debounce ilə yaz
 * - Oxuma: localStorage-dan qaytar (cache), amma hər səhifə açılışında
 *   Upstash-dan bütün data yüklənir və localStorage yenilənir
 * - Kritik data (userPoints, allUsers): dərhal Upstash-a flush edilir
 */

// Base Storage — localStorage wrapper
window.Storage = {
    get(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {
            console.error('Storage.set error:', e);
        }
    },
    remove(key) { localStorage.removeItem(key); }
};

(function() {
    'use strict';

    if (typeof UPSTASH_CONFIG === 'undefined' || !UPSTASH_CONFIG.enabled) {
        console.log('📦 LocalStorage only');
        window.loadFromUpstash = async () => ({});
        window.syncToUpstash   = async () => ({});
        return;
    }
    if (typeof upstash === 'undefined') {
        console.warn('⚠️ Upstash client not found');
        window.loadFromUpstash = async () => ({});
        window.syncToUpstash   = async () => ({});
        return;
    }

    // All keys that live in Upstash
    const CLOUD_KEYS = [
        'allUsers', 'videos', 'news', 'teachers', 'tests',
        'testResults', 'testStats', 'payments', 'activities',
        'siteSettings', 'userSessions', 'premiumRequests',
        'suspiciousActivities', 'activeUsers', 'userPoints',
        'leaderboard', 'revenue'
    ];

    // Keys that must NEVER go to Upstash (sensitive / device-local)
    const LOCAL_ONLY = new Set([
        'token', 'authToken', 'sessionToken', 'currentUser', 'deviceId'
    ]);

    function isCloud(key) {
        if (LOCAL_ONLY.has(key)) return false;
        if (CLOUD_KEYS.includes(key)) return true;
        if (key.startsWith('userVideos_') || key.startsWith('user_') || key.startsWith('teacher_')) return true;
        return false;
    }

    // ── Debounce write queue ──────────────────────────────────────────────────
    const _timers  = {};
    const _writing = {};

    const _origSet    = Storage.set.bind(Storage);
    const _origGet    = Storage.get.bind(Storage);
    const _origRemove = Storage.remove.bind(Storage);

    Storage.set = function(key, value) {
        // Always write to localStorage immediately
        _origSet(key, value);
        if (!isCloud(key)) return;

        // Debounce Upstash write (1.5s)
        if (_timers[key]) clearTimeout(_timers[key]);
        _timers[key] = setTimeout(async () => {
            delete _timers[key];
            if (_writing[key]) await _writing[key];
            _writing[key] = upstash.set(key, value, 86400 * 30)
                .then(() => console.log(`✅ [Upstash] ${key}`))
                .catch(e => console.warn(`⚠️ [Upstash] ${key}:`, e))
                .finally(() => delete _writing[key]);
        }, 1500);
    };

    Storage.remove = function(key) {
        _origRemove(key);
        if (!isCloud(key)) return;
        if (_timers[key]) { clearTimeout(_timers[key]); delete _timers[key]; }
        upstash.delete(key).catch(() => {});
    };

    // Immediate flush — bypass debounce (used for critical data like userPoints)
    Storage.flush = async function(key) {
        if (_timers[key]) { clearTimeout(_timers[key]); delete _timers[key]; }
        const val = _origGet(key);
        if (val === null) return;
        try {
            await upstash.set(key, val, 86400 * 30);
            console.log(`✅ [Upstash] flush:${key}`);
        } catch(e) {
            console.warn(`⚠️ [Upstash] flush:${key}`, e);
        }
    };

    // ── Load from Upstash → localStorage ─────────────────────────────────────
    // Uses a 30-second session cache: if data was loaded recently in this tab,
    // skip Upstash and use localStorage directly (much faster page transitions).
    const SESSION_CACHE_KEY = '_upstash_loaded_at';
    const CACHE_TTL_MS = 30 * 1000; // 30 seconds

    window.loadFromUpstash = async function(force = false) {
        const lastLoaded = parseInt(sessionStorage.getItem(SESSION_CACHE_KEY) || '0');
        const age = Date.now() - lastLoaded;

        // Admin panel always gets fresh data
        const isAdmin = document.body.id === 'adminPage' ||
                        window.location.pathname.includes('admin.html');

        if (!force && !isAdmin && age < CACHE_TTL_MS) {
            // Data is fresh — skip Upstash, use localStorage cache
            console.log(`⚡ Upstash skip (${Math.round(age/1000)}s ago)`);
            return { ok: 0, fail: 0, cached: true };
        }

        let ok = 0, fail = 0;
        await Promise.all(CLOUD_KEYS.map(async key => {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const val = await upstash.get(key);
                    if (val !== null && val !== undefined) {
                        _origSet(key, val);
                        ok++;
                    }
                    return;
                } catch(e) {
                    if (attempt < 2) await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
                    else fail++;
                }
            }
        }));

        sessionStorage.setItem(SESSION_CACHE_KEY, String(Date.now()));
        console.log(`📥 Upstash → localStorage: ${ok} key, ${fail} xəta`);
        return { ok, fail };
    };

    // ── Sync localStorage → Upstash (manual / admin) ─────────────────────────
    window.syncToUpstash = async function() {
        let ok = 0, fail = 0;
        for (const key of CLOUD_KEYS) {
            const val = _origGet(key);
            if (val !== null) {
                try { await upstash.set(key, val, 86400 * 30); ok++; }
                catch { fail++; }
            }
        }
        console.log(`🔄 Sync: ${ok} ok, ${fail} fail`);
        return { ok, fail };
    };

    // ── Prefetch next pages for faster navigation ─────────────────────────────
    // Adds <link rel="prefetch"> for common pages so the browser downloads them
    // in the background — makes page transitions feel instant.
    function _prefetchPages() {
        const pages = [
            'videos.html', 'tests.html', 'dashboard.html',
            'success.html', 'teachers.html', 'news.html'
        ];
        pages.forEach(page => {
            if (!document.querySelector(`link[href="${page}"]`)) {
                const link = document.createElement('link');
                link.rel  = 'prefetch';
                link.href = page;
                document.head.appendChild(link);
            }
        });
    }

    // ── Auto-load on every page ───────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async function() {
        _prefetchPages();
        await loadFromUpstash();
        window.dispatchEvent(new Event('upstash:loaded'));
        console.log('🚀 upstash:loaded fired');
    });

    console.log('✅ Storage wrapper ready');
})();
