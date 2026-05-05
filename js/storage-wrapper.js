/**
 * Storage Wrapper - Upstash Integration
 * LocalStorage = ani cache, Upstash = əsas mənbə
 * Debounce ilə yazma — eyni key üçün 2s gözlə, sonra bir dəfə yaz
 */

window.Storage = {
    get: function(key) {
        const item = localStorage.getItem(key);
        if (!item) return null;
        try { return JSON.parse(item); } catch { return item; }
    },
    set: function(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {
            console.error('Storage.set error:', e);
        }
    },
    remove: function(key) { localStorage.removeItem(key); }
};

(function() {
    'use strict';

    if (typeof UPSTASH_CONFIG === 'undefined' || !UPSTASH_CONFIG.enabled) {
        console.log('📦 LocalStorage only (Upstash disabled)');
        return;
    }
    if (typeof upstash === 'undefined') {
        console.warn('⚠️ Upstash client not found');
        return;
    }

    // Keys synced to Upstash
    const UPSTASH_KEYS = [
        'allUsers','videos','news','teachers','tests','testResults',
        'testStats','payments','activities','siteSettings','userSessions',
        'premiumRequests','suspiciousActivities','activeUsers',
        'userPoints','leaderboard','revenue'
    ];

    // Debounce timers per key
    const _timers = {};
    // In-flight write promises per key (prevent parallel writes of same key)
    const _writing = {};

    function shouldUseUpstash(key) {
        if (UPSTASH_KEYS.includes(key)) return true;
        if (key.startsWith('userVideos_') || key.startsWith('user_') || key.startsWith('teacher_')) return true;
        if (['token','authToken','sessionToken','currentUser','deviceId'].includes(key)) return false;
        return true;
    }

    const _origGet = Storage.get.bind(Storage);
    const _origSet = Storage.set.bind(Storage);
    const _origRemove = Storage.remove.bind(Storage);

    // get — always from localStorage (Upstash loaded on page start)
    Storage.get = function(key) {
        if (!shouldUseUpstash(key)) return _origGet(key);
        return _origGet(key);
    };

    // set — write localStorage immediately, debounce Upstash write (2s)
    Storage.set = function(key, value) {
        _origSet(key, value);

        if (!shouldUseUpstash(key)) return;

        // Cancel pending write for this key
        if (_timers[key]) clearTimeout(_timers[key]);

        _timers[key] = setTimeout(async () => {
            delete _timers[key];
            // Wait if a write is already in flight
            if (_writing[key]) await _writing[key];

            _writing[key] = upstash.set(key, value, 86400 * 30)
                .then(() => console.log(`✅ [Upstash] ${key} yazıldı`))
                .catch(e => console.error(`❌ [Upstash] ${key} xəta:`, e))
                .finally(() => delete _writing[key]);
        }, 2000);
    };

    // remove
    Storage.remove = function(key) {
        _origRemove(key);
        if (!shouldUseUpstash(key)) return;
        if (_timers[key]) { clearTimeout(_timers[key]); delete _timers[key]; }
        upstash.delete(key).catch(e => console.error(`❌ [Upstash] delete ${key}:`, e));
    };

    // Force immediate write (bypass debounce) — used by points/auth for critical data
    Storage.flush = async function(key) {
        if (_timers[key]) { clearTimeout(_timers[key]); delete _timers[key]; }
        const value = _origGet(key);
        if (value === null) return;
        try {
            await upstash.set(key, value, 86400 * 30);
            console.log(`✅ [Upstash] flush ${key}`);
        } catch (e) {
            console.error(`❌ [Upstash] flush ${key}:`, e);
        }
    };

    // Load all keys from Upstash into localStorage (called once on page load)
    window.loadFromUpstash = async function() {
        let ok = 0, fail = 0;
        const promises = UPSTASH_KEYS.map(async key => {
            try {
                const val = await upstash.get(key);
                if (val !== null && val !== undefined) {
                    _origSet(key, val);
                    ok++;
                }
            } catch { fail++; }
        });
        await Promise.all(promises);
        console.log(`📥 Upstash yükləndi: ${ok} uğurlu, ${fail} xəta`);
        return { success: ok, errors: fail };
    };

    // Sync localStorage → Upstash (manual/admin use)
    window.syncToUpstash = async function() {
        let ok = 0, fail = 0;
        for (const key of UPSTASH_KEYS) {
            const val = _origGet(key);
            if (val !== null) {
                try { await upstash.set(key, val, 86400 * 30); ok++; }
                catch { fail++; }
            }
        }
        console.log(`🔄 Sync: ${ok} uğurlu, ${fail} xəta`);
        return { success: ok, errors: fail };
    };

    // Auto-load on page start — parallel fetch, then fire event
    window.addEventListener('load', function() {
        setTimeout(async () => {
            await loadFromUpstash();
            // Signal that fresh data is available
            window.dispatchEvent(new Event('upstash:loaded'));
        }, 300);
    });

    console.log('✅ Storage wrapper hazır (debounce: 2s)');
})();
