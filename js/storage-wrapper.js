/**
 * Storage Wrapper - Direct Upstash Integration
 * LocalStorage yalnız cache kimi, əsas məlumat Upstash-da
 */

// Global Storage object
window.Storage = {
    get: function(key) {
        const item = localStorage.getItem(key);
        if (!item) return null;
        try {
            return JSON.parse(item);
        } catch {
            return item;
        }
    },
    
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage.set error:', error);
        }
    },
    
    remove: function(key) {
        localStorage.removeItem(key);
    }
};

(function() {
    'use strict';
    
    // Check if Upstash is enabled
    if (typeof UPSTASH_CONFIG === 'undefined' || !UPSTASH_CONFIG.enabled) {
        console.log('📦 Using LocalStorage only (Upstash disabled)');
        return;
    }
    
    // Check if upstash client exists
    if (typeof upstash === 'undefined') {
        console.warn('⚠️ Upstash client not found, using LocalStorage');
        return;
    }
    
    console.log('⚡ Upstash enabled - Direct cloud storage');
    
    // Keys that should use Upstash (all data)
    const UPSTASH_KEYS = [
        'allUsers',
        'videos',
        'news',
        'teachers',
        'tests',
        'testResults',
        'testStats',
        'payments',
        'activities',
        'siteSettings',
        'userSessions',
        'premiumRequests',
        'suspiciousActivities',
        'activeUsers',
        'userPoints',
        'leaderboard'
    ];
    
    // Check if key should use Upstash
    function shouldUseUpstash(key) {
        // All data keys use Upstash
        if (UPSTASH_KEYS.includes(key)) {
            return true;
        }
        
        // User-specific data
        if (key.startsWith('userVideos_') || key.startsWith('user_') || key.startsWith('teacher_')) {
            return true;
        }
        
        // Sensitive data stays in LocalStorage only
        if (key === 'token' || key === 'authToken' || key === 'sessionToken' || key === 'currentUser' || key === 'deviceId') {
            return false;
        }
        
        // Default: use Upstash
        return true;
    }
    
    // Original Storage methods
    const originalGet = Storage.get;
    const originalSet = Storage.set;
    const originalRemove = Storage.remove;
    
    // Wrap Storage.get - Read from Upstash first, fallback to LocalStorage
    Storage.get = function(key) {
        // For sensitive data, use LocalStorage only
        if (!shouldUseUpstash(key)) {
            return originalGet.call(this, key);
        }
        
        // Try LocalStorage first (cache)
        const cached = originalGet.call(this, key);
        if (cached !== null) {
            return cached;
        }
        
        // If not in cache, will be loaded async
        return null;
    };
    
    // Wrap Storage.set - Write to both Upstash and LocalStorage
    Storage.set = function(key, value) {
        // Always save to LocalStorage first (immediate)
        originalSet.call(this, key, value);
        
        if (shouldUseUpstash(key)) {
            // Save to Upstash (async, with retry)
            console.log(`💾 [Upstash] Saving ${key}...`);
            
            const saveToUpstash = async (retries = 3) => {
                try {
                    await upstash.set(key, value, 86400 * 7); // 7 days TTL
                    console.log(`✅ [Upstash] Saved ${key}`);
                } catch (error) {
                    console.error(`❌ [Upstash] Error saving ${key}:`, error);
                    if (retries > 0) {
                        console.log(`🔄 Retrying... (${retries} attempts left)`);
                        setTimeout(() => saveToUpstash(retries - 1), 1000);
                    }
                }
            };
            
            saveToUpstash();
        }
    };
    
    // Wrap Storage.remove
    Storage.remove = function(key) {
        // Remove from LocalStorage
        originalRemove.call(this, key);
        
        if (shouldUseUpstash(key)) {
            console.log(`🗑️ [Upstash] Removing ${key}...`);
            upstash.delete(key).catch(error => {
                console.error(`❌ [Upstash] Error removing ${key}:`, error);
            });
        }
    };
    
    // Helper: Sync LocalStorage to Upstash
    window.syncToUpstash = async function() {
        console.log('🔄 Syncing to Upstash...');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const key of UPSTASH_KEYS) {
            const value = originalGet(key);
            if (value) {
                try {
                    await upstash.set(key, value, 86400 * 7);
                    console.log(`✅ Synced ${key}`);
                    successCount++;
                } catch (error) {
                    console.error(`❌ Failed to sync ${key}:`, error);
                    errorCount++;
                }
            }
        }
        
        console.log(`✅ Sync completed! Success: ${successCount}, Errors: ${errorCount}`);
        return { success: successCount, errors: errorCount };
    };
    
    // Helper: Load from Upstash to LocalStorage
    window.loadFromUpstash = async function() {
        console.log('📥 Loading from Upstash...');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const key of UPSTASH_KEYS) {
            try {
                const value = await upstash.get(key);
                if (value) {
                    originalSet(key, value);
                    console.log(`✅ Loaded ${key}`);
                    successCount++;
                }
            } catch (error) {
                console.error(`❌ Failed to load ${key}:`, error);
                errorCount++;
            }
        }
        
        console.log(`✅ Load completed! Success: ${successCount}, Errors: ${errorCount}`);
        return { success: successCount, errors: errorCount };
    };
    
    // Auto-load on page load
    window.addEventListener('load', function() {
        // Small delay to ensure upstash is ready
        setTimeout(() => {
            console.log('🔄 Auto-loading from Upstash...');
            loadFromUpstash().catch(console.error);
        }, 500);
    });
    
    console.log('✅ Upstash storage wrapper initialized');
    console.log('💡 All data is now stored in Upstash cloud');
    
})();
