// Upstash Redis Client for Frontend
// Serverless Redis cache

class UpstashClient {
    constructor(url, token) {
        this.url = url;
        this.token = token;
    }
    
    async request(command, ...args) {
        const url = `${this.url}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([command, ...args])
            });
            
            if (!response.ok) {
                throw new Error(`Upstash Error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Upstash Request Error:', error);
            return null;
        }
    }
    
    // Set key-value with optional TTL (seconds)
    async set(key, value, ttl = null) {
        const jsonValue = JSON.stringify(value);
        
        if (ttl) {
            return await this.request('SET', key, jsonValue, 'EX', ttl);
        }
        return await this.request('SET', key, jsonValue);
    }
    
    // Get value by key
    async get(key) {
        const response = await this.request('GET', key);
        if (response && response.result !== null && response.result !== undefined) {
            try {
                return JSON.parse(response.result);
            } catch {
                return response.result;
            }
        }
        return null;
    }
    
    // Delete key
    async delete(key) {
        return await this.request('DEL', key);
    }
    
    // Check if key exists
    async exists(key) {
        const response = await this.request('EXISTS', key);
        return response && response.result === 1;
    }
    
    // Increment counter
    async increment(key) {
        const response = await this.request('INCR', key);
        return response ? response.result : 0;
    }
    
    // Decrement counter
    async decrement(key) {
        const response = await this.request('DECR', key);
        return response ? response.result : 0;
    }
    
    // Set expiration time
    async expire(key, seconds) {
        return await this.request('EXPIRE', key, seconds);
    }
    
    // Get TTL
    async ttl(key) {
        const response = await this.request('TTL', key);
        return response ? response.result : -1;
    }
    
    // Get all keys matching pattern
    async keys(pattern = '*') {
        const response = await this.request('KEYS', pattern);
        return response && response.result ? response.result : [];
    }
    
    // Hash operations
    async hset(key, field, value) {
        const jsonValue = JSON.stringify(value);
        return await this.request('HSET', key, field, jsonValue);
    }
    
    async hget(key, field) {
        const response = await this.request('HGET', key, field);
        if (response && response.result !== null && response.result !== undefined) {
            try {
                return JSON.parse(response.result);
            } catch {
                return response.result;
            }
        }
        return null;
    }
    
    async hgetall(key) {
        const response = await this.request('HGETALL', key);
        return response && response.result ? response.result : {};
    }
    
    // List operations
    async lpush(key, ...values) {
        const jsonValues = values.map(v => JSON.stringify(v));
        return await this.request('LPUSH', key, ...jsonValues);
    }
    
    async rpush(key, ...values) {
        const jsonValues = values.map(v => JSON.stringify(v));
        return await this.request('RPUSH', key, ...jsonValues);
    }
    
    async lrange(key, start, stop) {
        const response = await this.request('LRANGE', key, start, stop);
        if (response && response.result) {
            return response.result.map(item => {
                try {
                    return JSON.parse(item);
                } catch {
                    return item;
                }
            });
        }
        return [];
    }
    
    // Flush all data (use with caution!)
    async flushall() {
        return await this.request('FLUSHALL');
    }
}

// Create global instance immediately (before storage-wrapper.js loads)
let upstash = null;

// Initialize after DOM loads or immediately if UPSTASH_CONFIG exists
if (typeof UPSTASH_CONFIG !== 'undefined' && UPSTASH_CONFIG.enabled) {
    upstash = new UpstashClient(UPSTASH_CONFIG.url, UPSTASH_CONFIG.token);
    console.log('✅ Upstash client initialized');
} else {
    console.log('⚠️ UPSTASH_CONFIG not found or disabled');
}

// Cache Helper Functions
const CacheHelper = {
    // Cache videos
    async cacheVideos(videos, ttl = 3600) {
        await upstash.set('videos:all', videos, ttl);
        console.log('✅ Videos cached');
    },
    
    async getCachedVideos() {
        const cached = await upstash.get('videos:all');
        if (cached) {
            console.log('📦 Videos from cache');
        }
        return cached;
    },
    
    // Cache news
    async cacheNews(news, ttl = 3600) {
        await upstash.set('news:all', news, ttl);
        console.log('✅ News cached');
    },
    
    async getCachedNews() {
        const cached = await upstash.get('news:all');
        if (cached) {
            console.log('📦 News from cache');
        }
        return cached;
    },
    
    // Cache teachers
    async cacheTeachers(teachers, ttl = 7200) {
        await upstash.set('teachers:all', teachers, ttl);
        console.log('✅ Teachers cached');
    },
    
    async getCachedTeachers() {
        const cached = await upstash.get('teachers:all');
        if (cached) {
            console.log('📦 Teachers from cache');
        }
        return cached;
    },
    
    // Increment video views
    async incrementVideoViews(videoId) {
        const key = `video:views:${videoId}`;
        const views = await upstash.increment(key);
        
        // Set expiration if new key
        if (views === 1) {
            await upstash.expire(key, 86400); // 24 hours
        }
        
        return views;
    },
    
    // Session management
    async saveSession(token, user, ttl = 86400) {
        await upstash.set(`session:${token}`, user, ttl);
    },
    
    async getSession(token) {
        return await upstash.get(`session:${token}`);
    },
    
    async deleteSession(token) {
        await upstash.delete(`session:${token}`);
    },
    
    // Rate limiting
    async checkRateLimit(userId, maxRequests = 100, windowSeconds = 60) {
        const key = `ratelimit:${userId}`;
        
        if (!await upstash.exists(key)) {
            await upstash.set(key, 1, windowSeconds);
            return true;
        }
        
        const requests = await upstash.increment(key);
        return requests <= maxRequests;
    },
    
    // Clear all cache
    async clearAllCache() {
        const keys = await upstash.keys('*');
        for (const key of keys) {
            await upstash.delete(key);
        }
        console.log('🗑️ All cache cleared');
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UpstashClient, upstash, CacheHelper };
}
