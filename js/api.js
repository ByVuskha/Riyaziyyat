// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...defaultOptions,
            ...options,
            headers: { ...defaultOptions.headers, ...options.headers }
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Call Error:', error);
        throw error;
    }
}

// Auth API
const AuthAPI = {
    register: async (data) => {
        return await apiCall('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    login: async (email, password) => {
        return await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    getCurrentUser: async () => {
        return await apiCall('/auth/me');
    },
    
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
    }
};

// Video API
const VideoAPI = {
    getAll: async () => {
        return await apiCall('/videos');
    },
    
    getById: async (id) => {
        return await apiCall(`/videos/${id}`);
    },
    
    create: async (data) => {
        return await apiCall('/videos', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    update: async (id, data) => {
        return await apiCall(`/videos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    delete: async (id) => {
        return await apiCall(`/videos/${id}`, {
            method: 'DELETE'
        });
    },
    
    incrementView: async (id) => {
        return await apiCall(`/videos/${id}/view`, {
            method: 'POST'
        });
    },
    
    getByCategory: async (category) => {
        return await apiCall(`/videos/category/${category}`);
    },
    
    getByTeacher: async (teacherId) => {
        return await apiCall(`/videos/teacher/${teacherId}`);
    }
};

// News API
const NewsAPI = {
    getAll: async () => {
        return await apiCall('/news');
    },
    
    getById: async (id) => {
        return await apiCall(`/news/${id}`);
    },
    
    create: async (data) => {
        return await apiCall('/news', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    update: async (id, data) => {
        return await apiCall(`/news/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    delete: async (id) => {
        return await apiCall(`/news/${id}`, {
            method: 'DELETE'
        });
    },
    
    incrementView: async (id) => {
        return await apiCall(`/news/${id}/view`, {
            method: 'POST'
        });
    }
};

// User API
const UserAPI = {
    getAll: async () => {
        return await apiCall('/users');
    },
    
    getById: async (id) => {
        return await apiCall(`/users/${id}`);
    },
    
    update: async (id, data) => {
        return await apiCall(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    getWatchedVideos: async (id) => {
        return await apiCall(`/users/${id}/videos`);
    }
};

// Teacher API
const TeacherAPI = {
    getAll: async () => {
        return await apiCall('/teachers');
    },
    
    getById: async (id) => {
        return await apiCall(`/teachers/${id}`);
    },
    
    create: async (data) => {
        return await apiCall('/teachers', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    update: async (id, data) => {
        return await apiCall(`/teachers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    delete: async (id) => {
        return await apiCall(`/teachers/${id}`, {
            method: 'DELETE'
        });
    }
};

// Migration Helper - LocalStorage-dən Database-ə köçürmək üçün
const MigrationHelper = {
    async migrateVideos() {
        const videos = Storage.get('videos') || [];
        console.log(`Migrating ${videos.length} videos...`);
        
        for (const video of videos) {
            try {
                await VideoAPI.create(video);
                console.log(`✓ Video migrated: ${video.title}`);
            } catch (error) {
                console.error(`✗ Failed to migrate video: ${video.title}`, error);
            }
        }
    },
    
    async migrateNews() {
        const news = Storage.get('news') || [];
        console.log(`Migrating ${news.length} news...`);
        
        for (const item of news) {
            try {
                await NewsAPI.create(item);
                console.log(`✓ News migrated: ${item.title}`);
            } catch (error) {
                console.error(`✗ Failed to migrate news: ${item.title}`, error);
            }
        }
    },
    
    async migrateAll() {
        console.log('🚀 Starting migration...');
        await this.migrateVideos();
        await this.migrateNews();
        console.log('✅ Migration completed!');
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthAPI, VideoAPI, NewsAPI, UserAPI, TeacherAPI, MigrationHelper };
}
