const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function testFast2SMS() {
    const key = process.env.FAST2SMS_API_KEY;
    const phone = '8951556645'; // User's number from logs
    const otp = '123456';
    const bankName = 'Test Bank';

    console.log(`Testing Fast2SMS with key: ${key.substring(0, 10)}...`);

    try {
        const response = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
            params: {
                authorization: key,
                route: 'q',
                message: `Your FintechPro OTP for ${bankName} is: ${otp}`,
                language: 'english',
                flash: 0,
                numbers: phone
            }
        });
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testFast2SMS();
