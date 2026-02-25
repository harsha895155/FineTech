const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    transactionId: {
        type: String, // Merchant Transaction ID
        required: true,
        unique: true
    },
    amount: {
        type: Number, // In Paise for PhonePe
        required: true
    },
    provider: {
        type: String,
        enum: ['phonepe', 'bank'],
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'PAYMENT_ERROR'],
        default: 'PENDING'
    },
    paymentReference: {
        type: String, // Provider's reference ID
    },
    merchantId: {
        type: String
    },
    mobileNumber: {
        type: String
    },
    metadata: {
        type: Object
    }
}, { timestamps: true });

const createModel = (conn) => conn.model('PaymentTransaction', paymentTransactionSchema);

module.exports = { createModel };
