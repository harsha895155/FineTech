const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function testFast2SMSLegacy() {
    const key = process.env.FAST2SMS_API_KEY;
    const phone = '8951556645'; 
    const otp = '777777';

    console.log(`Testing Fast2SMS Legacy API...`);

    try {
        const response = await axios.get('https://www.fast2sms.com/dev/bulk', {
            params: {
                authorization: key,
                sender_id: 'FSTSMS',
                message: `Your FintechPro OTP is: ${otp}`,
                language: 'english',
                route: 'p',
                numbers: phone
            }
        });
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testFast2SMSLegacy();
