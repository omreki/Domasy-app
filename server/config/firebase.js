const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Initialize Firebase Admin
let serviceAccount;

// Try to load from service account file first
if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
        // Resolve absolute path from CWD (server root)
        const keyPath = path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
            ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
            : path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

        serviceAccount = require(keyPath);
        console.log(`🔑 Loaded service account from ${keyPath}`);
    } catch (error) {
        console.log('⚠️  Service account file not found, checking environment variables...');
    }
}

// If no service account file, use environment variables
if (!serviceAccount) {
    if (process.env.FIREBASE_PROJECT_ID) {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;
        if (privateKey) {
            // Handle cases where the key is wrapped in quotes
            if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
                privateKey = privateKey.substring(1, privateKey.length - 1);
            }
            // Handle escaped newlines
            privateKey = privateKey.replace(/\\n/g, '\n');
        }

        serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key: privateKey,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
        };

        if (!privateKey) {
            console.warn('⚠️  FIREBASE_PRIVATE_KEY is missing');
        } else if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            console.warn('⚠️  FIREBASE_PRIVATE_KEY does not seem to have a valid header');
        }
    }
}

// Initialize Firebase Admin SDK
try {
    if (serviceAccount) {
        // Fallback to default bucket naming convention if env var is missing
        // Note: Some projects use .appspot.com, new ones use .firebasestorage.app
        let bucketName = process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.firebasestorage.app`;

        // Auto-fix for common misconfiguration (using appspot instead of firebasestorage for new projects)
        if (bucketName.includes('appspot.com')) {
            console.log(`⚠️  Note: Switching bucket from ${bucketName} to .firebasestorage.app domain to avoid 404s.`);
            bucketName = bucketName.replace('appspot.com', 'firebasestorage.app');
        }

        console.log(`📦 Using Firebase Storage Bucket: ${bucketName}`);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: bucketName
        });
        console.log('✅ Firebase Admin initialized successfully');
    } else {
        const missing = [];
        if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
        if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
        if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');

        const errorMsg = `🛑 CRITICAL SETUP ERROR: Missing Firebase variables: ${missing.join(', ')}. ` +
            'Please check your Vercel Environment Variables dashboard.';
        console.error(errorMsg);
        if (process.env.VERCEL) {
            throw new Error(errorMsg);
        }
    }
} catch (error) {
    // Check if simple re-initialization error
    if (error.code === 'app/already-exists') {
        // ignore
    } else {
        console.error('❌ Firebase initialization error:', error.message);
        if (process.env.VERCEL) {
            throw error;
        }
    }
}

// Get Firestore instance
const db = admin.firestore();

// Get Storage instance
const bucket = admin.storage().bucket();

// Get Auth instance
const auth = admin.auth();

// Firestore settings
db.settings({
    timestampsInSnapshots: true,
    ignoreUndefinedProperties: true
});

module.exports = {
    admin,
    db,
    bucket,
    auth,
    FieldValue: admin.firestore.FieldValue,
    Timestamp: admin.firestore.Timestamp
};
