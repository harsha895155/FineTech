const mongoose = require('mongoose');

const bankConnectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bankName: {
        type: String,
        required: true
    },
    accountHolderName: {
        type: String,
        required: true
    },
    accountNumberMasked: {
        type: String,
        required: true
    },
    ifscCode: {
        type: String,
        required: true
    },
    otpHash: {
        type: String
    },
    otpExpiresAt: {
        type: Date
    },
    trials: {
        type: Number,
        default: 0
    },
    deliveryMethod: {
        type: String,
        enum: ['sms', 'email'],
        default: 'sms'
    },
    linkedStatus: {
        type: String,
        enum: ['pending', 'linked', 'failed'],
        default: 'pending'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const createModel = (conn) => conn.model('BankConnection', bankConnectionSchema);

module.exports = { createModel };
