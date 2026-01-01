/**
 * Database Query Optimization Utilities
 * Helper functions for efficient Firebase queries
 */

/**
 * Batch process array in chunks for better performance
 * @param {Array} array - Array to process
 * @param {number} chunkSize - Size of each chunk
 * @param {Function} processor - Async function to process each chunk
 */
async function batchProcess(array, chunkSize, processor) {
    const results = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        const chunkResults = await processor(chunk);
        results.push(...chunkResults);
    }
    return results;
}

/**
 * Parallel query execution with limit
 * @param {Array} queries - Array of promise-returning functions
 * @param {number} concurrency - Max concurrent queries
 */
async function parallelQueries(queries, concurrency = 5) {
    const results = [];
    for (let i = 0; i < queries.length; i += concurrency) {
        const batch = queries.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(q => q()));
        results.push(...batchResults);
    }
    return results;
}

/**
 * Debounce function for rate limiting
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Memoize expensive computations
 * @param {Function} fn - Function to memoize
 * @param {number} maxAge - Max age in ms (optional)
 */
function memoize(fn, maxAge = 60000) {
    const cache = new Map();

    return function (...args) {
        const key = JSON.stringify(args);
        const cached = cache.get(key);

        if (cached && (!maxAge || Date.now() - cached.timestamp < maxAge)) {
            return cached.value;
        }

        const result = fn.apply(this, args);
        cache.set(key, {
            value: result,
            timestamp: Date.now()
        });

        return result;
    };
}

/**
 * Build efficient Firebase query with pagination
 * @param {Object} collection - Firestore collection reference
 * @param {Object} options - Query options
 * @returns {Object} - Query and metadata
 */
function buildPaginatedQuery(collection, options = {}) {
    const {
        filters = [],
        orderBy = null,
        limit = 20,
        startAfter = null,
        select = null
    } = options;

    let query = collection;

    // Apply filters
    filters.forEach(filter => {
        const { field, operator, value } = filter;
        query = query.where(field, operator, value);
    });

    // Apply ordering
    if (orderBy) {
        const { field, direction = 'asc' } = orderBy;
        query = query.orderBy(field, direction);
    }

    // Apply pagination
    if (startAfter) {
        query = query.startAfter(startAfter);
    }

    // Apply limit
    if (limit) {
        query = query.limit(limit);
    }

    // Apply field selection
    if (select && select.length > 0) {
        query = query.select(...select);
    }

    return query;
}

/**
 * Optimize document projection - select only needed fields
 * @param {Object} document - Firestore document
 * @param {Array} fields - Fields to include
 */
function projectFields(document, fields) {
    if (!fields || fields.length === 0) return document;

    const projected = { id: document.id };
    fields.forEach(field => {
        if (document[field] !== undefined) {
            projected[field] = document[field];
        }
    });

    return projected;
}

/**
 * Batch write operations for better performance
 * @param {Object} db - Firestore instance
 * @param {Array} operations - Array of {type, ref, data}
 */
async function batchWrite(db, operations) {
    const BATCH_SIZE = 500; // Firestore limit
    const batches = [];

    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = operations.slice(i, i + BATCH_SIZE);

        chunk.forEach(op => {
            switch (op.type) {
                case 'set':
                    batch.set(op.ref, op.data, op.options || {});
                    break;
                case 'update':
                    batch.update(op.ref, op.data);
                    break;
                case 'delete':
                    batch.delete(op.ref);
                    break;
            }
        });

        batches.push(batch.commit());
    }

    return Promise.all(batches);
}

/**
 * Create composite index hint for complex queries
 * @param {Array} fields - Fields to index
 * @returns {string} - Index hint
 */
function createIndexHint(fields) {
    return `/* INDEX: ${fields.join(', ')} */`;
}

/**
 * Query performance logger
 * @param {string} queryName - Name of the query
 * @param {Function} queryFn - Query function to execute
 */
async function logQueryPerformance(queryName, queryFn) {
    const startTime = Date.now();
    try {
        const result = await queryFn();
        const duration = Date.now() - startTime;

        if (duration > 1000) {
            console.warn(`[SLOW QUERY] ${queryName} took ${duration}ms`);
        } else {
            console.log(`[QUERY] ${queryName} completed in ${duration}ms`);
        }

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[QUERY ERROR] ${queryName} failed after ${duration}ms:`, error.message);
        throw error;
    }
}

module.exports = {
    batchProcess,
    parallelQueries,
    debounce,
    memoize,
    buildPaginatedQuery,
    projectFields,
    batchWrite,
    createIndexHint,
    logQueryPerformance
};
