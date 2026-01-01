/**
 * Response caching middleware
 * Caches GET responses in memory for faster subsequent requests
 */

class ResponseCache {
    constructor(ttl = 300000) { // Default 5 minutes
        this.cache = new Map();
        this.ttl = ttl;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    set(key, data, customTtl = null) {
        const ttl = customTtl || this.ttl;
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }

    invalidate(pattern) {
        if (typeof pattern === 'string') {
            // Exact match
            this.cache.delete(pattern);
        } else if (pattern instanceof RegExp) {
            // Pattern match
            for (const key of this.cache.keys()) {
                if (pattern.test(key)) {
                    this.cache.delete(key);
                }
            }
        }
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

// Create singleton instance
const cache = new ResponseCache(300000); // 5 minutes default

/**
 * Express middleware for caching GET requests
 * @param {number} ttl - Time to live in milliseconds
 */
const cacheMiddleware = (ttl = null) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Create cache key from URL and query params
        const cacheKey = `${req.baseUrl}${req.path}:${JSON.stringify(req.query)}`;

        // Check cache
        const cachedResponse = cache.get(cacheKey);
        if (cachedResponse) {
            console.log(`[CACHE HIT] ${cacheKey}`);
            return res.json(cachedResponse);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to cache response
        res.json = function (data) {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(cacheKey, data, ttl);
                console.log(`[CACHE SET] ${cacheKey}`);
            }
            return originalJson(data);
        };

        next();
    };
};

/**
 * Middleware to invalidate cache on data mutations
 */
const invalidateCacheMiddleware = (patterns) => {
    return (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to invalidate cache after response
        res.json = function (data) {
            const result = originalJson(data);

            // Only invalidate on successful mutations
            if (res.statusCode >= 200 && res.statusCode < 300) {
                if (Array.isArray(patterns)) {
                    patterns.forEach(pattern => cache.invalidate(pattern));
                } else {
                    cache.invalidate(patterns);
                }
                console.log(`[CACHE INVALIDATED]`, patterns);
            }

            return result;
        };

        next();
    };
};

module.exports = {
    cache,
    cacheMiddleware,
    invalidateCacheMiddleware
};
