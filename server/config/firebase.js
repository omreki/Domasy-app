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
        serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
        };
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
        const errorMsg = '🛑 CRITICAL SETUP ERROR: No Firebase credentials found. ' +
            'Please ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY ' +
            'are set in your environment variables.';
        console.error(errorMsg);
        // On Vercel, we shouldn't kill the process, but we should make it obvious what went wrong
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
