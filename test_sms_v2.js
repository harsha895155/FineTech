const axios = require('axios');
require('dotenv').config({ path: './server/.env' });

async function testFast2SMS() {
    const key = process.env.FAST2SMS_API_KEY;
    const phone = '8951556645'; // User's number
    const otp = '999999';
    const bankName = 'Final Test';

    console.log(`Testing Fast2SMS Quick Route...`);

    try {
        const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
            route: 'q',
            message: `Your FintechPro OTP for ${bankName} is: ${otp}. Valid for 5 mins.`,
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

testFast2SMS();
