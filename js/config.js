const CONFIG = {
    API_URL: 'https://bizimriyaziyyat.work.gd/api',
    APP_NAME: 'Bizim Riyaziyyat',
    VERSION: '1.0.0',
    DOMAIN: 'bizimriyaziyyat.work.gd'
};

// Upstash Configuration (Backend olmadan cloud storage)
window.UPSTASH_CONFIG = {
    url: 'https://kind-moccasin-40956.upstash.io',
    token: 'AZ_8AAIgcDFkODk5NGEzNmUzZDQ0ZTdjODIwNjFiYzQ4MjNhNzhhYw',
    enabled: true,
    autoSync: true
};

// LocalStorage helpers
const Storage = {
    get: (key) => {
        try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
    },
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    remove: (key) => localStorage.removeItem(key),
    clear: () => localStorage.clear()
};

// Hybrid Storage Helper - Upstash və ya LocalStorage
const StorageHelper = {
    async get(key) {
        if (UPSTASH_CONFIG.enabled && typeof upstash !== 'undefined') {
            try {
                return await upstash.get(key);
            } catch (error) {
                console.error('Upstash error, using LocalStorage:', error);
                return Storage.get(key);
            }
        }
        return Storage.get(key);
    },
    
    async set(key, value, ttl = 86400) {
        if (UPSTASH_CONFIG.enabled && typeof upstash !== 'undefined') {
            try {
                await upstash.set(key, value, ttl);
            } catch (error) {
                console.error('Upstash error, using LocalStorage:', error);
                Storage.set(key, value);
            }
        } else {
            Storage.set(key, value);
        }
    },
    
    async remove(key) {
        if (UPSTASH_CONFIG.enabled && typeof upstash !== 'undefined') {
            try {
                await upstash.delete(key);
            } catch (error) {
                console.error('Upstash error:', error);
            }
        }
        Storage.remove(key);
    }
};

// Simple mock data (backend hazır olana qədər)
const MOCK_USERS = [
    { id: 1, name: 'Admin', email: 'admin@riyazmath.az', password: 'admin123', role: 'admin', balance: 100, demoTests: 0 },
    { id: 2, name: 'Tələbə', email: 'telebe@test.az', password: 'test123', role: 'user', balance: 25, demoTests: 0 }
];

// Test pricing
const TEST_PRICE = 5; // hər sınaq 5 manat
