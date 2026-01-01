const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Load env vars with explicit path to ensure it works
const envPath = path.join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('❌ Failed to load .env file from:', envPath);
    console.error(result.error);
}

// Helper to check for Firebase credentials
const checkFirebaseConfig = () => {
    if (!process.env.FIREBASE_PROJECT_ID && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        console.warn('⚠️  WARNING: Firebase credentials missing in .env');
        console.warn('   Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
        console.warn('   OR set FIREBASE_SERVICE_ACCOUNT_PATH to your serviceAccountKey.json');
    }
};

checkFirebaseConfig();

// Initialize Firebase
require('./config/firebase');

// Import caching middleware
const { cacheMiddleware } = require('./middleware/cache');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const documentRoutes = require('./routes/documents');
const projectRoutes = require('./routes/projects');
const approvalRoutes = require('./routes/approvals');
const auditRoutes = require('./routes/audit');
const dashboardRoutes = require('./routes/dashboard');
const categoryRoutes = require('./routes/categories');

// Initialize express app
const app = express();

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
// CORS middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any localhost (for development with dynamic ports)
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }

        // Check specific allowed origins
        const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',');
        if (allowedOrigins.indexOf(origin) === -1) {
            // Optional: You might want to just allow it in dev mode
            if (process.env.NODE_ENV === 'development') return callback(null, true);

            return callback(new Error('CORS policy check failed'), false);
        }
        return callback(null, true);
    },
    credentials: true
}));

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Create uploads directory if it doesn't exist (for temp storage before Firebase upload if needed)
// Although we use memoryStorage or stream directly? 
// Documents/upload middleware still uses diskStorage in 'middleware/upload.js'? 
// DocumentService handles stream from 'req.file', wait. 
// Standard multer 'diskStorage' saves to disk. 
// DocumentService reads from disk? 
// Let's check DocumentService.create logic again.
// It uses `file.buffer`. BUT multer `diskStorage` puts file on disk, `req.file` has `path`. 
// If `diskStorage` is used, `req.file.buffer` is undefined. 
// I should probably switch `middleware/upload.js` to `memoryStorage` for Firebase efficiency 
// OR read from disk in DocumentService.
// Let's check `middleware/upload.js`. It uses `diskStorage`.
// Let's check `services/DocumentService.js`. I wrote `await fileUpload.save(file.buffer ...`. 
// THIS WILL FAIL with diskStorage. 
// I must update `middleware/upload.js` to use `memoryStorage` OR update `DocumentService` to read from disk.
// Using `memoryStorage` is better for serverless/cloud but `diskStorage` is safer for large files on limited RAM.
// Given `MAX_FILE_SIZE` is 25MB, memory is fine.
// I will update `middleware/upload.js` shortly.

// Serve static files (uploads) - Keeping this for fallback or local dev if needed, 
// though we aim for Firebase Storage URLs now.
const uploadsDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, uploadsDir)));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/audit', auditRoutes);
// Cache dashboard stats for 2 minutes (frequently accessed, but can be slightly stale)
app.use('/api/dashboard', cacheMiddleware(120000), dashboardRoutes);
app.use('/api/categories', categoryRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running (Local Storage Mode)',
        timestamp: new Date().toISOString()
    });
});

// Root endpoint for convenience
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Domasy API Server is running. Please access endpoints via /api/.',
        documentation: '/api/health'
    });
});

app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Domasy API v1.0. Available endpoints: /auth, /documents, /users, /projects, /dashboard'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    console.log(`🔥 Connected to Firebase project: ${process.env.FIREBASE_PROJECT_ID || 'Unknown (Check .env)'}`);

    // DEBUG: Log mounted routes
    /*
    console.log('--- Mounted Routes ---');
    app._router.stack.forEach(r => {
        if (r.route && r.route.path) {
            console.log(r.route.path);
        } else if (r.name === 'router') {
             // For mounted routers, regexp shows the prefix
             console.log('Router:', r.regexp);
        }
    });
    */
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    // server.close(() => process.exit(1)); // Don't crash in production
});

module.exports = app;
