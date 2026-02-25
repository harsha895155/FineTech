const axios = require('axios');

/**
 * ============================================================
 *  REAL-TIME SMS OTP SERVICE
 *  Sends actual SMS messages to the user's mobile phone.
 * 
 *  SUPPORTED PROVIDERS:
 *  1. Fast2SMS  — Free tier, Indian numbers (+91)
 *     Get API Key: https://www.fast2sms.com
 *  2. Twilio    — Global paid service
 *     Get API Key: https://www.twilio.com
 * ============================================================
 */
class SMSService {

    constructor() {
        // Load from .env
        this.fast2smsKey = process.env.FAST2SMS_API_KEY || '';
        this.twilioSid   = process.env.TWILIO_SID || '';
        this.twilioToken  = process.env.TWILIO_AUTH_TOKEN || '';
        this.twilioPhone  = process.env.TWILIO_PHONE || '';
    }

    /**
     * Primary method — sends an OTP SMS to the given phone number.
     * Automatically chooses Fast2SMS (India) or Twilio (global).
     *
     * @param {string} phoneNumber  e.g. "+919876543210" or "9876543210"
     * @param {string} otp          e.g. "482917"
     * @param {string} bankName     e.g. "HDFC Bank"
     * @returns {object}            { success, provider, message }
     */
    async sendOTP(phoneNumber, otp, bankName) {

        // Clean number: keep only digits
        const digits = phoneNumber.replace(/\D/g, '');

        // Decide provider
        if (this.fast2smsKey) {
            return this._sendViaFast2SMS(digits, otp, bankName);
        }

        if (this.twilioSid && this.twilioToken) {
            return this._sendViaTwilio(phoneNumber, otp, bankName);
        }

        // No API key configured — log clearly so user knows what to do
        console.warn('');
        console.warn('╔══════════════════════════════════════════════════╗');
        console.warn('║  ⚠️  NO SMS API KEY CONFIGURED                  ║');
        console.warn('║                                                  ║');
        console.warn('║  To send REAL SMS to the user\'s phone:           ║');
        console.warn('║                                                  ║');
        console.warn('║  1. Go to https://www.fast2sms.com               ║');
        console.warn('║  2. Sign up and get your free API Key            ║');
        console.warn('║  3. Add this line to server/.env :               ║');
        console.warn('║     FAST2SMS_API_KEY=your_key_here               ║');
        console.warn('║  4. Restart the server                           ║');
        console.warn('║                                                  ║');
        console.warn('║  Until then, OTP is printed below for testing:   ║');
        console.warn('╚══════════════════════════════════════════════════╝');
        console.warn('');
        console.log(`📱 [DEMO] OTP for ${bankName} → Phone: ${phoneNumber} → OTP: ${otp}`);

        return {
            success: false,
            provider: 'none',
            message: 'No SMS provider configured. Add FAST2SMS_API_KEY to server/.env'
        };
    }

    // ───────────────────────────────────────────────
    //  FAST2SMS  (free for Indian +91 numbers)
    // ───────────────────────────────────────────────
    async _sendViaFast2SMS(digits, otp, bankName) {
        try {
            // Fast2SMS expects 10-digit Indian number without country code
            const tenDigit = digits.length > 10 ? digits.slice(-10) : digits;

            console.log(`📡 [Fast2SMS] Sending OTP ${otp} to ${tenDigit}...`);

            // Using 'q' (quick) route — works WITHOUT DLT/website verification
            const response = await axios.post(
                'https://www.fast2sms.com/dev/bulkV2',
                {
                    route: 'q',
                    message: `Your FintechPro OTP for ${bankName} is: ${otp}. Valid for 5 mins.`,
                    language: 'english',
                    flash: 0,
                    numbers: tenDigit
                },
                {
                    headers: {
                        'authorization': this.fast2smsKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.return === true) {
                console.log(`✅ [Fast2SMS] OTP delivered to ${tenDigit}`);
                return {
                    success: true,
                    provider: 'Fast2SMS',
                    message: `OTP sent to ${tenDigit}`
                };
            } else {
                if (response.data.status_code === 999) {
                    console.error('\n' + '='.repeat(60));
                    console.error('❌ FAST2SMS API BLOCK DETECTED (ERROR 999)');
                    console.error('Fast2SMS requires at least one transaction of 100 INR');
                    console.error('to enable API routes. Your current balance is insufficient.');
                    console.error('To fix this: Please add 100 INR to your Fast2SMS wallet.');
                    console.error('FOR NOW: Generating OTP in console below for testing...');
                    console.error('='.repeat(60) + '\n');
                } else {
                    console.error('❌ [Fast2SMS] API responded with error:', response.data);
                }
                
                return {
                    success: false,
                    provider: 'Fast2SMS',
                    message: response.data?.message || 'Fast2SMS delivery failed',
                    otpDemo: otp // Include it so user can see it in console
                };
            }
        } catch (error) {
            console.error('❌ [Fast2SMS] Request failed:', error.response?.data || error.message);
            return {
                success: false,
                provider: 'Fast2SMS',
                message: error.response?.data?.message || error.message
            };
        }
    }

    // ───────────────────────────────────────────────
    //  TWILIO  (global, paid)
    // ───────────────────────────────────────────────
    async _sendViaTwilio(phoneNumber, otp, bankName) {
        try {
            // Twilio requires E.164 format: +[country code][number]
            // For Indian numbers: +91XXXXXXXXXX
            let formattedTo = phoneNumber.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parens
            
            // If number doesn't start with +, add +91 for India
            if (!formattedTo.startsWith('+')) {
                // Remove leading 0 if present
                if (formattedTo.startsWith('0')) {
                    formattedTo = formattedTo.substring(1);
                }
                // If it's a 10-digit number, prefix with +91
                if (formattedTo.length === 10) {
                    formattedTo = '+91' + formattedTo;
                } else if (formattedTo.startsWith('91') && formattedTo.length === 12) {
                    formattedTo = '+' + formattedTo;
                } else {
                    formattedTo = '+' + formattedTo;
                }
            }

            console.log(`📡 [Twilio] Sending OTP to ${formattedTo}...`);

            // Twilio uses Basic Auth with SID:TOKEN
            const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');

            const response = await axios.post(
                `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`,
                new URLSearchParams({
                    To: formattedTo,
                    From: this.twilioPhone,
                    Body: `Your FintechPro OTP for ${bankName} bank link is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`
                }),
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            console.log(`✅ [Twilio] SMS delivered successfully!`);
            console.log(`   Message SID: ${response.data.sid}`);
            console.log(`   To: ${formattedTo}`);
            return {
                success: true,
                provider: 'Twilio',
                message: `OTP sent via SMS to ${formattedTo}`
            };
        } catch (error) {
            console.error('❌ [Twilio] SMS delivery failed:');
            if (error.response?.data) {
                console.error('   Error Code:', error.response.data.code);
                console.error('   Message:', error.response.data.message);
            } else {
                console.error('   Error:', error.message);
            }
            return {
                success: false,
                provider: 'Twilio',
                message: error.response?.data?.message || error.message
            };
        }
    }
}

module.exports = new SMSService();
