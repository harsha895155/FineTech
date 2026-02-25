const axios = require('axios');
axios.post('http://localhost:5011/api/auth/register', {
    name: 'Admin',
    email: 'admin@fintechpro.com',
    password: 'password123',
    role: 'administrator'
}).then(r => console.log('✅ User created or updated'))
  .catch(e => console.log('ℹ️ Info:', e.response?.data?.message || e.message));
