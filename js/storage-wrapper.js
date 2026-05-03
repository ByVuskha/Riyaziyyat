/**
 * Storage Wrapper - LocalStorage-i Upstash ilə əvəz edir
 * Minimal kod dəyişikliyi ilə Upstash inteqrasiyası
 */

(function() {
    'use strict';
    
    // Check if Upstash is enabled
    if (typeof UPSTASH_CONFIG === 'undefined' || !UPSTASH_CONFIG.enabled) {
        console.log('📦 Using LocalStorage (Upstash disabled)');
        return;
    }
    
    // Check if upstash client exists
    if (typeof upstash === 'undefined') {
        console.warn('⚠️ Upstash client not found, using LocalStorage');
        return;
    }
    
    console.log('⚡ Upstash enabled - wrapping Storage methods');
    
    // Save original methods
    const originalStorage = {
        get: Storage.get,
        set: Storage.set,
        remove: Storage.remove
    };
    
    // Keys that should stay in LocalStorage (sensitive data)
    const LOCAL_ONLY_KEYS = [
        'token',
        'authToken',
        'sessionToken'
    ];
    
    // Keys that should use Upstash (public data)
    const UPSTASH_KEYS = [
        'allUsers',
        'videos',
        'news',
        'teachers',
        'tests',
        'payments',
        'activities'
    ];
    
    // Check if key should use Upstash
    function shouldUseUpstash(key) {
        // Check if in local-only list
        if (LOCAL_ONLY_KEYS.includes(key)) {
            return false;
        }
        
        // Check if in Upstash list
        if (UPSTASH_KEYS.includes(key)) {
            return true;
        }
        
        // Check if starts with userVideos_
        if (key.startsWith('userVideos_')) {
            return true;
        }
        
        // Default: use LocalStorage for unknown keys
        return false;
    }
    
    // Wrap Storage.get
    const originalGet = Storage.get;
    Storage.get = function(key) {
        if (shouldUseUpstash(key)) {
            // Return promise for Upstash
            return upstash.get(key).then(value => {
                if (value !== null) {
                    console.log(`📦 [Upstash] GET ${key}`);
                    return value;
                }
                // Fallback to LocalStorage if not in Upstash
                console.log(`📦 [LocalStorage] GET ${key} (fallback)`);
                return originalGet.call(this, key);
            }).catch(error => {
                console.error(`❌ Upstash GET error for ${key}:`, error);
                return originalGet.call(this, key);
            });
        }
        
        // Use LocalStorage for sensitive data
        return originalGet.call(this, key);
    };
    
    // Wrap Storage.set
    const originalSet = Storage.set;
    Storage.set = function(key, value) {
        if (shouldUseUpstash(key)) {
            // Save to both Upstash and LocalStorage (backup)
            console.log(`💾 [Upstash] SET ${key}`);
            
            // Save to LocalStorage immediately (sync)
            originalSet.call(this, key, value);
            
            // Save to Upstash (async)
            upstash.set(key, value, 86400).catch(error => {
                console.error(`❌ Upstash SET error for ${key}:`, error);
            });
            
            return;
        }
        
        // Use LocalStorage for sensitive data
        originalSet.call(this, key, value);
    };
    
    // Wrap Storage.remove
    const originalRemove = Storage.remove;
    Storage.remove = function(key) {
        if (shouldUseUpstash(key)) {
            console.log(`🗑️ [Upstash] REMOVE ${key}`);
            
            // Remove from LocalStorage
            originalRemove.call(this, key);
            
            // Remove from Upstash
            upstash.delete(key).catch(error => {
                console.error(`❌ Upstash REMOVE error for ${key}:`, error);
            });
            
            return;
        }
        
        // Use LocalStorage
        originalRemove.call(this, key);
    };
    
    // Helper: Sync LocalStorage to Upstash
    window.syncToUpstash = async function() {
        console.log('🔄 Syncing LocalStorage to Upstash...');
        
        for (const key of UPSTASH_KEYS) {
            const value = originalGet(key);
            if (value) {
                try {
                    await upstash.set(key, value, 86400);
                    console.log(`✅ Synced ${key}`);
                } catch (error) {
                    console.error(`❌ Failed to sync ${key}:`, error);
                }
            }
        }
        
        console.log('✅ Sync completed!');
    };
    
    // Helper: Load from Upstash to LocalStorage
    window.loadFromUpstash = async function() {
        console.log('📥 Loading from Upstash to LocalStorage...');
        
        for (const key of UPSTASH_KEYS) {
            try {
                const value = await upstash.get(key);
                if (value) {
                    originalSet(key, value);
                    console.log(`✅ Loaded ${key}`);
                }
            } catch (error) {
                console.error(`❌ Failed to load ${key}:`, error);
            }
        }
        
        console.log('✅ Load completed!');
    };
    
    // Auto-sync on page load (optional)
    if (UPSTASH_CONFIG.autoSync) {
        window.addEventListener('load', function() {
            setTimeout(() => {
                loadFromUpstash().catch(console.error);
            }, 1000);
        });
    }
    
    console.log('✅ Storage wrapper initialized');
    console.log('💡 Use syncToUpstash() to sync LocalStorage → Upstash');
    console.log('💡 Use loadFromUpstash() to load Upstash → LocalStorage');
    
})();
