const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function checkWallet() {
    const key = process.env.FAST2SMS_API_KEY;
    console.log(`Checking Fast2SMS wallet with key: ${key.substring(0, 10)}...`);

    try {
        const response = await axios.post('https://www.fast2sms.com/dev/wallet', {}, {
            headers: {
                'authorization': key
            }
        });
        console.log('Wallet Status:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

checkWallet();
