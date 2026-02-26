const axios = require('axios');

axios.post('http://localhost:5011/api/auth/login', {
    email: 'harshavardhan10003@gmail.com',
    password: '12345678',
    role: 'administrator'
}).then(r => {
    console.log('✅ Login successful!');
    console.log('\n📋 User Details:');
    console.log(`   Name: ${r.data.data.fullName}`);
    console.log(`   Email: ${r.data.data.email}`);
    console.log(`   Role: ${r.data.data.role}`);
    console.log(`   Database: ${r.data.data.databaseName}`);
    console.log(`\n🔑 Token: ${r.data.data.token.substring(0, 50)}...`);
}).catch(e => {
    console.log('❌ Login failed:', e.response?.data?.message || e.message);
});
