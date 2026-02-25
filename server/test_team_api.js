const axios = require('axios');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const connectMasterDB = require('./config/masterDb');
const { createModel: createUserModel } = require('./models/master/User');

async function testApi() {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        const admin = await User.findOne({ role: /admin/i });
        
        if (!admin) {
            console.log('No admin user found');
            process.exit(1);
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
        console.log('Using token for:', admin.email);

        const baseUrl = `http://localhost:${process.env.PORT || 5011}/api/admin`;

        console.log('--- Testing GET /platform/teams ---');
        const getRes = await axios.get(`${baseUrl}/platform/teams`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('GET Response:', getRes.data);

        console.log('--- Testing POST /platform/teams ---');
        const postRes = await axios.post(`${baseUrl}/platform/teams`, {
            name: 'API Test Team',
            description: 'Created via test script',
            members: [admin._id]
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('POST Response:', postRes.data);

        process.exit(0);
    } catch (err) {
        if (err.response) {
            console.error('API Error:', err.response.status, err.response.data);
        } else {
            console.error('Network Error:', err.message);
        }
        process.exit(1);
    }
}

testApi();
