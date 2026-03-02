const mongoose = require('mongoose');
const connectMasterDB = require('../config/masterDb');
const { createModel: createUserModel } = require('../models/master/User');
const { createModel: createTransferModel } = require('../models/master/InternalTransfer');

// @desc    Transfer Money between users
// @route   POST /api/transfer
// @access  Private
exports.transferMoney = async (req, res) => {
    let session = null;
    try {
        const { receiverIdentifier, amount, description } = req.body;
        const senderId = req.user.id;

        // 1. Validations
        if (!receiverIdentifier || !amount) {
            return res.status(400).json({ success: false, message: 'Receiver and amount are required' });
        }

        const transferAmount = parseFloat(amount);
        if (isNaN(transferAmount) || transferAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        const Transfer = createTransferModel(masterDb);

        // Find receiver (Email or ID or search by fullName for flexibility in demo)
        let receiver = await User.findOne({
            $or: [
                { email: receiverIdentifier.toLowerCase() },
                { phoneNumber: receiverIdentifier },
                { _id: mongoose.Types.ObjectId.isValid(receiverIdentifier) ? receiverIdentifier : null }
            ]
        });

        if (!receiver) {
            return res.status(404).json({ success: false, message: 'Receiver not found' });
        }

        if (String(receiver._id) === String(senderId)) {
            return res.status(400).json({ success: false, message: 'Cannot transfer to self' });
        }

        const sender = await User.findById(senderId);
        if (!sender) {
            return res.status(404).json({ success: false, message: 'Sender not found' });
        }

        if (sender.balance < transferAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance' });
        }

        // 2. Atomic Transaction
        // Try to use transactions if supported (Replica Sets required)
        try {
            session = await masterDb.startSession();
            session.startTransaction();

            // Deduct from sender
            const updatedSender = await User.findByIdAndUpdate(
                senderId, 
                { $inc: { balance: -transferAmount } }, 
                { session, new: true, runValidators: true }
            );
            
            // Add to receiver
            await User.findByIdAndUpdate(
                receiver._id, 
                { $inc: { balance: transferAmount } }, 
                { session, runValidators: true }
            );

            // Create transaction record
            const transactionId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
            await Transfer.create([{
                transactionId,
                senderId,
                receiverId: receiver._id,
                amount: transferAmount,
                description: description || 'Internal Transfer',
                status: 'success'
            }], { session });

            await session.commitTransaction();
            
            return res.status(200).json({
                success: true,
                message: 'Transfer successful',
                data: {
                    transactionId,
                    amount: transferAmount,
                    updatedBalance: updatedSender.balance,
                    receiverName: receiver.fullName,
                    receiverEmail: receiver.email
                }
            });
        } catch (txnError) {
            if (session) {
                await session.abortTransaction();
                session.endSession();
                session = null;
            }

            // Fallback for standalone MongoDB (No Transactions)
            if (txnError.codeName === 'IllegalOperation' || txnError.message.includes('replica set') || txnError.code === 20) {
                console.log('⚠️ Transactions not supported. Falling back to non-transactional transfer.');
                
                // Deduct from sender
                const updatedSender = await User.findByIdAndUpdate(
                    senderId, 
                    { $inc: { balance: -transferAmount } }, 
                    { new: true, runValidators: true }
                );
                
                // Add to receiver
                await User.findByIdAndUpdate(
                    receiver._id, 
                    { $inc: { balance: transferAmount } }, 
                    { runValidators: true }
                );

                // Create transaction record
                const transactionId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
                await Transfer.create({
                    transactionId,
                    senderId,
                    receiverId: receiver._id,
                    amount: transferAmount,
                    description: description || 'Internal Transfer',
                    status: 'success'
                });

                return res.status(200).json({
                    success: true,
                    message: 'Transfer successful',
                    data: {
                        transactionId,
                        amount: transferAmount,
                        updatedBalance: updatedSender.balance,
                        receiverName: receiver.fullName,
                        receiverEmail: receiver.email
                    }
                });
            }
            throw txnError;
        } finally {
            if (session) session.endSession();
        }

    } catch (err) {
        console.error('Transfer Error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Transaction failed. Please try again later.' 
        });
    }
};

// @desc    Get transaction history for logged in user
// @route   GET /api/transfer/history
// @access  Private
exports.getHistory = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const Transfer = createTransferModel(masterDb);
        const User = createUserModel(masterDb); // Ensure User model is known for population

        const userId = req.user.id;
        const history = await Transfer.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        })
        .populate('senderId', 'fullName email')
        .populate('receiverId', 'fullName email')
        .sort({ createdAt: -1 });

        const formattedHistory = history.map(txn => {
            const isSender = String(txn.senderId._id) === String(userId);
            return {
                id: txn._id,
                transactionId: txn.transactionId,
                amount: txn.amount,
                type: isSender ? 'debit' : 'credit',
                otherParty: isSender ? txn.receiverId.fullName : txn.senderId.fullName,
                otherPartyEmail: isSender ? txn.receiverId.email : txn.senderId.email,
                description: txn.description,
                status: txn.status,
                date: txn.createdAt
            };
        });

        res.status(200).json({ success: true, data: formattedHistory });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get all system transactions (Admin only)
// @route   GET /api/transfer/admin/all
// @access  Private/Admin
exports.getAllSystemTransactions = async (req, res) => {
    try {
        if (req.user.role !== 'administrator' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const masterDb = await connectMasterDB();
        const Transfer = createTransferModel(masterDb);
        const User = createUserModel(masterDb);

        const all = await Transfer.find({})
            .populate('senderId', 'fullName email role')
            .populate('receiverId', 'fullName email role')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: all });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Validate receiver existence (for UI confirmation step)
// @route   POST /api/transfer/validate-receiver
// @access  Private
exports.validateReceiver = async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ success: false, message: 'Identifier required' });

        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        const receiver = await User.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { phoneNumber: identifier },
                { _id: mongoose.Types.ObjectId.isValid(identifier) ? identifier : null }
            ]
        }).select('fullName email phoneNumber role');

        if (!receiver) {
            return res.status(404).json({ success: false, message: 'Receiver not found' });
        }

        if (String(receiver._id) === String(req.user.id)) {
            return res.status(400).json({ success: false, message: 'You cannot transfer to yourself' });
        }

        res.status(200).json({ success: true, data: receiver });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
