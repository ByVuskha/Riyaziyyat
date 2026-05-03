const CONFIG = {
    API_URL: 'https://bizimriyaziyyat.work.gd/api',  // Backend hazır olduqda
    APP_NAME: 'Bizim Riyaziyyat',
    VERSION: '1.0.0',
    DOMAIN: 'bizimriyaziyyat.work.gd'
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

// Simple mock data (backend hazır olana qədər)
const MOCK_USERS = [
    { id: 1, name: 'Admin', email: 'admin@riyazmath.az', password: 'admin123', role: 'admin', balance: 100, demoTests: 0 },
    { id: 2, name: 'Tələbə', email: 'telebe@test.az', password: 'test123', role: 'user', balance: 25, demoTests: 0 }
];

// Test pricing
const TEST_PRICE = 5; // hər sınaq 5 manat
