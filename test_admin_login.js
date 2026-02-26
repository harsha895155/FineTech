const axios = require('axios');

console.log('🔐 Testing Admin Login...\n');

axios.post('http://localhost:5011/api/auth/login', {
    email: 'harshavardhan10003@gmail.com',
    password: '12345678',
    role: 'admin'
}).then(r => {
    console.log('✅ Login successful!\n');
    console.log('📋 User Details:');
    console.log(`   Name: ${r.data.data.fullName}`);
    console.log(`   Email: ${r.data.data.email}`);
    console.log(`   Role: ${r.data.data.role}`);
    console.log(`   Database: ${r.data.data.databaseName}`);
    console.log(`\n🔑 Token Generated: ${r.data.data.token.substring(0, 50)}...`);
    console.log('\n🎉 You can now access the admin portal!');
}).catch(e => {
    console.log('❌ Login failed!');
    console.log(`   Error: ${e.response?.data?.message || e.message}`);
    if (e.response?.data) {
        console.log(`   Details:`, e.response.data);
    }
});
