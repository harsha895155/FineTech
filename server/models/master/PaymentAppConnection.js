const mongoose = require('mongoose');

const paymentAppConnectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    appName: {
        type: String, // e.g., 'PhonePe', 'Google Pay', 'PayPal'
        required: true
    },
    identifier: {
        type: String, // UPI ID, Mobile Number, or Email
        required: true
    },
    type: {
        type: String,
        enum: ['upi', 'wallet', 'card'],
        default: 'upi'
    },
    status: {
        type: String,
        enum: ['linked', 'pending', 'unlinked'],
        default: 'linked'
    },
    lastVerified: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const createModel = (conn) => conn.model('PaymentAppConnection', paymentAppConnectionSchema);

module.exports = { createModel };
