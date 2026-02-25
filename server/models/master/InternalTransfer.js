const mongoose = require('mongoose');

const internalTransferSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: [0.01, 'Amount must be greater than 0']
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success'
    },
    description: {
        type: String,
        trim: true,
        default: 'Internal Transfer'
    }
}, { timestamps: true });

// Indexing for faster history lookups
internalTransferSchema.index({ senderId: 1, createdAt: -1 });
internalTransferSchema.index({ receiverId: 1, createdAt: -1 });

const createModel = (conn) => conn.models.InternalTransfer || conn.model('InternalTransfer', internalTransferSchema);

module.exports = { createModel };
