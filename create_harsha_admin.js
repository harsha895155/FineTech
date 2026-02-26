const axios = require('axios');

axios.post('http://localhost:5011/api/auth/signup', {
    fullName: 'harsha',
    email: 'harshavardhan10003@gmail.com',
    phoneNumber: '8951556645',
    password: '12345678',
    role: 'administrator'
}).then(r => {
    console.log('✅ Administrator user "harsha" created successfully');
    console.log('📧 Please check email for OTP verification code');
    console.log('Response:', r.data);
}).catch(e => console.log('ℹ️ Info:', e.response?.data?.message || e.message));
