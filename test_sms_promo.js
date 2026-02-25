const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function testFast2SMSPromotional() {
    const key = process.env.FAST2SMS_API_KEY;
    const phone = '8951556645'; 
    const otp = '888888';

    console.log(`Testing Fast2SMS Promotional Route...`);

    try {
        const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
            route: 'p',
            sender_id: 'FSTSMS',
            message: `Your FintechPro OTP is: ${otp}`,
            language: 'english',
            flash: 0,
            numbers: phone
        }, {
            headers: {
                'authorization': key,
                'Content-Type': 'application/json'
            }
        });
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testFast2SMSPromotional();
