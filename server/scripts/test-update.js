const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'admin@domasy.com';
const PASSWORD = 'Admin@123456';

async function testUpdateProfile() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });

        const token = loginRes.data.data.token;
        const user = loginRes.data.data.user;
        console.log(`Logged in as ${user.name} (${user.role})`);

        // 2. Update Profile
        console.log('Updating profile...');
        const newName = `System Administrator`; // Keeping it consistent or changing slightly
        const newDept = 'IT Operations';

        const updateRes = await axios.put(`${API_URL}/auth/profile`, {
            name: newName,
            department: newDept
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Update response:', updateRes.data);

        if (updateRes.data.success && updateRes.data.data.user.department === newDept) {
            console.log('✅ PASS: Profile updated successfully.');
        } else {
            console.log('❌ FAIL: Profile update mismatch.');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

testUpdateProfile();
