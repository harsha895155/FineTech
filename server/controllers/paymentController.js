const axios = require('axios');
const connectMasterDB = require('../config/masterDb');
const { createModel: createPaymentModel } = require('../models/master/PaymentTransaction');
const { generateChecksum, verifyChecksum } = require('../utils/phonepeUtils');

/**
 * @desc    Create PhonePe Payment Request
 * @route   POST /api/payment/create
 */
exports.createPayment = async (req, res) => {
    const { amount, mobileNumber } = req.body;
    
    if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });

    try {
        const masterDb = await connectMasterDB();
        const PaymentTransaction = masterDb.models.PaymentTransaction || createPaymentModel(masterDb);

        const merchantTransactionId = `MT${Date.now()}`;
        const amountInPaise = amount * 100; // PhonePe accepts amount in paise

        const payload = {
            merchantId: process.env.PHONEPE_MERCHANT_ID,
            merchantTransactionId,
            merchantUserId: req.user.id,
            amount: amountInPaise,
            redirectUrl: `${process.env.APP_FRONTEND_URL}/payment-status/${merchantTransactionId}`,
            redirectMode: 'REDIRECT',
            callbackUrl: process.env.PHONEPE_CALLBACK_URL,
            mobileNumber: mobileNumber || '',
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        const xVerify = generateChecksum(base64Payload, '/pg/v1/pay', process.env.PHONEPE_SALT_KEY, process.env.PHONEPE_SALT_INDEX);

        // Initiate S2S Request
        const response = await axios.post(process.env.PHONEPE_BASE_URL, {
            request: base64Payload
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'accept': 'application/json'
            }
        });

        if (response.data.success) {
            // Save transaction in database in PENDING status
            await PaymentTransaction.create({
                userId: req.user.id,
                transactionId: merchantTransactionId,
                amount: amountInPaise,
                provider: 'phonepe',
                status: 'PENDING',
                mobileNumber
            });

            res.json({
                success: true,
                paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
                transactionId: merchantTransactionId
            });
        } else {
            res.status(400).json({ success: false, message: 'Payment initiation failed' });
        }

    } catch (err) {
        console.error('PhonePe Error:', err.response?.data || err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    PhonePe Callback Handler (Webhook)
 * @route   POST /api/payment/callback
 */
exports.handleCallback = async (req, res) => {
    const xVerify = req.headers['x-verify'];
    const payload = req.body.response; // PhonePe sends base64 encoded response in body.response

    try {
        // 1. Authenticity Check
        const isValid = verifyChecksum(xVerify, payload, process.env.PHONEPE_SALT_KEY);
        if (!isValid) {
            console.warn('⚠️ Invalid Checksum in PhonePe Callback');
            return res.status(400).send('Invalid Checksum');
        }

        // 2. Decode Response
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        const { merchantTransactionId, transactionId: providerReference, code } = decoded.data;

        const masterDb = await connectMasterDB();
        const PaymentTransaction = masterDb.models.PaymentTransaction || createPaymentModel(masterDb);

        const status = code === 'PAYMENT_SUCCESS' ? 'SUCCESS' : 'FAILED';
        
        // 3. Update Database
        await PaymentTransaction.findOneAndUpdate(
            { transactionId: merchantTransactionId },
            { 
                status, 
                paymentReference: providerReference,
                metadata: decoded
            }
        );

        res.status(200).send('OK');
    } catch (err) {
        console.error('Callback Error:', err.message);
        res.status(500).send('Internal Error');
    }
};

/**
 * @desc    Check Payment Status (S2S)
 * @route   GET /api/payment/status/:transactionId
 */
exports.checkStatus = async (req, res) => {
    const { transactionId } = req.params;

    try {
        const merchantId = process.env.PHONEPE_MERCHANT_ID;
        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX;

        const apiEndpoint = `/pg/v1/status/${merchantId}/${transactionId}`;
        const xVerify = generateChecksum('', apiEndpoint, saltKey, saltIndex);

        const response = await axios.get(`${process.env.PHONEPE_STATUS_URL}/${merchantId}/${transactionId}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': merchantId,
                'accept': 'application/json'
            }
        });

        // Update DB status with result
        const masterDb = await connectMasterDB();
        const PaymentTransaction = masterDb.models.PaymentTransaction || createPaymentModel(masterDb);
        
        const finalStatus = response.data.data.state === 'COMPLETED' && response.data.code === 'PAYMENT_SUCCESS' ? 'SUCCESS' : 'FAILED';
        
        await PaymentTransaction.findOneAndUpdate(
            { transactionId },
            { status: finalStatus, paymentReference: response.data.data.transactionId }
        );

        res.json({
            success: true,
            status: finalStatus,
            data: response.data.data
        });

    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
