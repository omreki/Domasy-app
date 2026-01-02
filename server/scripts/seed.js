const dotenv = require('dotenv');
const path = require('path');

// Load env vars FIRST before any other require that might use them
dotenv.config({ path: path.join(__dirname, '../.env') });

const UserService = require('../services/UserService');

const seedUsers = async () => {
    try {
        // --- ADMIN USER ---
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@domasy.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

        console.log(`Checking for admin user: ${adminEmail}...`);
        let adminUser = await UserService.findByEmail(adminEmail);

        if (adminUser) {
            console.log('✅ Admin user already exists.');
        } else {
            console.log('Creating admin user...');
            try {
                await UserService.create({
                    name: process.env.ADMIN_NAME || 'Admin User',
                    email: adminEmail,
                    password: adminPassword,
                    role: 'Super Admin',
                    department: 'IT',
                    status: 'Active'
                });
                console.log('✅ Admin user created successfully');
            } catch (err) {
                if (err.message.includes('unique constraint') || err.message.includes('already registered')) {
                    console.log('⚠️  Admin user likely exists in Auth but not in public table. Skipping...');
                } else {
                    console.error('❌ Error creating admin:', err.message);
                }
            }
        }

        // --- DEFAULT USER (SUPER ADMIN) ---
        const userEmail = 'user@domasy.com';
        const userPassword = 'password123';

        console.log(`Checking for default user: ${userEmail}...`);
        let defaultUser = await UserService.findByEmail(userEmail);

        if (defaultUser) {
            console.log('✅ Default user found.');
            if (defaultUser.role !== 'Super Admin') {
                console.log('🔄 Updating default user role to Super Admin...');
                await UserService.update(defaultUser.id, { role: 'Super Admin' });
                console.log('✅ Default user role updated.');
            } else {
                console.log('✅ Default user is already Super Admin.');
            }
        } else {
            console.log('Creating default user...');
            try {
                await UserService.create({
                    name: 'Default User',
                    email: userEmail,
                    password: userPassword,
                    role: 'Super Admin',
                    department: 'General',
                    status: 'Active'
                });
                console.log('✅ Default user created successfully as Super Admin');
            } catch (err) {
                if (err.message.includes('unique constraint') || err.message.includes('already registered')) {
                    console.log('⚠️  Default user likely exists in Auth but not in public table. Skipping...');
                } else {
                    console.error('❌ Error creating default user:', err.message);
                }
            }
        }

        console.log('🎉 Seeding completed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Unexpected error during seeding:', error);
        process.exit(1);
    }
};

seedUsers();
