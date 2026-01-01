const dotenv = require('dotenv');
const path = require('path');

// Load env vars FIRST before any other require that might use them
dotenv.config({ path: path.join(__dirname, '../.env') });

const UserService = require('../services/UserService');
const admin = require('firebase-admin');

// Initialize Firebase (if not already handled by UserService require chain, but safer here)
try {
    const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../config/serviceAccountKey.json');
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (error) {
    console.warn('Firebase initialization warning:', error.message);
}

const seedAdmin = async () => {
    try {
        const email = process.env.ADMIN_EMAIL || 'admin@domasy.com';
        const password = process.env.ADMIN_PASSWORD || 'password123';

        console.log(`Checking for admin user: ${email}...`);
        const existingUser = await UserService.findByEmail(email);

        if (existingUser) {
            console.log('Admin user already exists.');
            process.exit(0);
        }

        console.log('Creating admin user...');
        await UserService.create({
            name: process.env.ADMIN_NAME || 'Admin User',
            email,
            password,
            role: 'Super Admin',
            department: 'IT',
            status: 'Active'
        });

        console.log('✅ Admin user created successfully');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin user:', error);
        process.exit(1);
    }
};

seedAdmin();
