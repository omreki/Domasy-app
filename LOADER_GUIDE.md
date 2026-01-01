# Quick Start: Using Loaders & Optimizations

## For Frontend Developers

### Automatic Loaders (No Code Changes Needed!)
All API calls now automatically show loaders. Just use the API class as normal:

```javascript
// This will automatically show/hide loader
const documents = await API.getDocuments();
const users = await API.getUsers();
```

### Custom Loader Messages
```javascript
// Show custom message during long operations
await API.request('/api/documents', {
    method: 'POST',
    body: JSON.stringify(data),
    loaderMessage: 'Creating your document...'
});
```

### Disable Loader (Rare Cases)
```javascript
// For background operations that shouldn't block UI
await API.request('/api/stats', {
    showLoader: false
});
```

### Button Loading States
```javascript
async function handleSubmit() {
    const button = document.getElementById('submitBtn');
    
    // Show loading state
    API.setButtonLoading(button, true);
    
    try {
        await API.uploadDocument(formData);
    } finally {
        // Hide loading state
        API.setButtonLoading(button, false);
    }
}
```

### Available Loader CSS Classes
- `.global-loader` - Full screen loader
- `.spinner-sm` - Small inline spinner
- `.btn.loading` - Button with loading spinner
- `.skeleton` - Skeleton loading placeholder
- `.overlay-loader` - Section overlay loader
- `.loading-dots` - Animated dots

---

## For Backend Developers

### Cache Configuration
Caching is already configured for optimal performance:

```javascript
// Dashboard: 2 minutes cache
app.use('/api/dashboard', cacheMiddleware(120000), dashboardRoutes);

// Other routes use default 5 minutes
```

### Adding Cache to New Routes
```javascript
const { cacheMiddleware } = require('./middleware/cache');

// Apply 1-minute cache
app.use('/api/stats', cacheMiddleware(60000), statsRoutes);
```

### Cache Invalidation
```javascript
const { invalidateCacheMiddleware } = require('./middleware/cache');

// Invalidate cache on data changes
const cachePatterns = [/\/api\/documents/, /\/api\/dashboard/];

router.post('/documents', 
    protect, 
    invalidateCacheMiddleware(cachePatterns), 
    createDocument
);
```

### Manual Cache Control
```javascript
const { cache } = require('./middleware/cache');

// Get cache value
const data = cache.get('unique-key');

// Set cache value
cache.set('unique-key', data, 60000); // 60 seconds

// Invalidate specific cache
cache.invalidate('/api/documents');

// Invalidate by pattern
cache.invalidate(/\/api\/documents/);

// Clear all cache
cache.clear();
```

### Query Optimization
```javascript
const { logQueryPerformance } = require('./utils/queryOptimizer');

// Log slow queries
const users = await logQueryPerformance('getUsers', async () => {
    return await UserService.getAll(filters);
});
```

---

## Testing the Optimizations

### 1. Test Loaders
- Navigate to any page - loader should appear
- Upload a document - "Uploading document..." message
- Click any button - button should show loading state

### 2. Test Caching
```bash
# Make a request
curl http://localhost:5000/api/dashboard/stats

# Check server logs for [CACHE SET]

# Make same request again
curl http://localhost:5000/api/dashboard/stats

# Check server logs for [CACHE HIT]
```

### 3. Monitor Performance
Check console for:
- `[CACHE HIT]` - Cache working
- `[CACHE SET]` - Data cached
- `[SLOW QUERY]` - Query took >1000ms
- `[CACHE INVALIDATED]` - Cache cleared on mutation

---

## Common Issues & Solutions

### Issue: Loader Doesn't Appear
**Solution**: Check that `globalLoader` element exists in HTML
```javascript
const loader = document.getElementById('globalLoader');
console.log(loader); // Should not be null
```

### Issue: Cache Not Invalidating
**Solution**: Ensure invalidation middleware is before the route handler
```javascript
// ✅ Correct
router.post('/', invalidateCacheMiddleware(patterns), handler);

// ❌ Wrong
router.post('/', handler, invalidateCacheMiddleware(patterns));
```

### Issue: Stale Data
**Solution**: Reduce cache TTL or add invalidation patterns
```javascript
// Reduce cache time
cacheMiddleware(30000) // 30 seconds instead of 5 minutes

// Add more invalidation patterns
const patterns = [/\/api\/documents/, /\/api\/users/, /\/api\/dashboard/];
```

---

## Performance Metrics

### Expected Response Times
- **Cached Request**: 5-10ms
- **Fresh Request**: 50-200ms
- **Database Query**: 100-500ms
- **File Upload**: Depends on file size

### Cache Hit Rates (Target)
- Dashboard: >80%
- Document List: >70%
- User List: >60%

---

## Best Practices

### ✅ Do
- Use automatic loaders for all user actions
- Monitor console for slow query warnings
- Clear cache when data changes
- Use custom loader messages for clarity
- Test cache invalidation after mutations

### ❌ Don't
- Don't disable loaders unless absolutely necessary
- Don't cache user-specific data globally
- Don't set very long TTLs for changing data
- Don't ignore [SLOW QUERY] warnings
- Don't forget to invalidate cache on updates

---

## Quick Reference

### Frontend
```javascript
// Basic API call (auto-loader)
await API.getDocuments();

// Custom message
await API.uploadDocument(data, {
    loaderMessage: 'Processing...'
});

// Button loading
API.setButtonLoading(btn, true);
```

### Backend
```javascript
// Add cache
app.use('/api/route', cacheMiddleware(60000), handler);

// Invalidate cache
router.post('/', invalidateCacheMiddleware([/pattern/]), handler);

// Manual control
cache.set('key', data);
cache.invalidate(/pattern/);
```

---

**Need Help?** Check OPTIMIZATION_SUMMARY.md for detailed documentation.
