const Expense = require('../models/Expense');
const Income = require('../models/Income');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const connectMasterDB = require('../config/masterDb');
const { createModel: createUserModel } = require('../models/master/User');
const { createModel: createTransferModel } = require('../models/master/InternalTransfer');

// @desc    Get all transactions (Expense & Income)
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
    try {
        const { type, category, startDate, endDate, limit = 100, skip = 0 } = req.query;
        let expenses = [];
        let incomes = [];

        const query = { userId: req.user.id };
        if (startDate || endDate) {
            const dateQuery = {};
            if (startDate) dateQuery.$gte = new Date(startDate);
            if (endDate) dateQuery.$lte = new Date(endDate);
            query.expenseDate = dateQuery; // For Expense
            query.incomeDate = dateQuery;  // For Income
        }

        if (!type || type === 'expense') {
            const expQuery = { ...query };
            if (category) expQuery.category = category;
            delete expQuery.incomeDate;
            expenses = await Expense.find(expQuery).sort({ expenseDate: -1 });
        }

        if (!type || type === 'income') {
            const incQuery = { ...query };
            if (category) incQuery.source = category; // Mapping category to source for income list
            delete incQuery.expenseDate;
            incomes = await Income.find(incQuery).sort({ incomeDate: -1 });
        }

        // Fetch internal transfers
        const masterDb = await connectMasterDB();
        const Transfer = createTransferModel(masterDb);
        const internalTransfers = await Transfer.find({
            $or: [{ senderId: req.user.id }, { receiverId: req.user.id }]
        }).populate('senderId receiverId', 'fullName email');

        const formattedTransfers = internalTransfers.map(t => {
            const isSender = String(t.senderId._id) === String(req.user.id);
            return {
                _id: t._id,
                amount: t.amount,
                type: isSender ? 'expense' : 'income',
                category: isSender ? 'Transfer Sent' : 'Transfer Received',
                description: t.description || (isSender ? `To: ${t.receiverId.fullName}` : `From: ${t.senderId.fullName}`),
                date: t.createdAt,
                paymentMode: 'bank',
                isInternalTransfer: true
            };
        });

        // Combine and sort
        let all = [
            ...expenses.map(e => ({ ...e._doc, type: 'expense', date: e.expenseDate })),
            ...incomes.map(i => ({ ...i._doc, type: 'income', date: i.incomeDate, category: i.source })),
            ...formattedTransfers
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            count: all.length,
            data: all.slice(parseInt(skip), parseInt(skip) + parseInt(limit))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// @desc    Add transaction (Expense or Income)
// @route   POST /api/transactions
// @access  Private
exports.addTransaction = async (req, res) => {
    try {
        const { type, amount, category, description, date, paymentMode, receiptUrl } = req.body;

        if (type === 'income') {
            const income = await Income.create({
                userId: req.user.id,
                source: category, // Using category as source
                amount,
                incomeDate: date || Date.now()
            });
            return res.status(201).json({ success: true, data: income });
        } else {
            const status = req.user.role === 'employee' ? 'pending' : 'approved';
            const expense = await Expense.create({
                userId: req.user.id,
                companyId: req.user.companyId || null,
                amount,
                category,
                description,
                expenseDate: date || Date.now(),
                paymentMode: paymentMode || 'cash',
                receiptUrl: receiptUrl || '',
                status
            });
            return res.status(201).json({ success: true, data: expense });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        // Try deleting from both collections
        const exp = await Expense.findOneAndDelete({ _id: id, userId: req.user.id });
        if (exp) return res.status(200).json({ success: true, data: {} });

        const inc = await Income.findOneAndDelete({ _id: id, userId: req.user.id });
        if (inc) return res.status(200).json({ success: true, data: {} });

        res.status(404).json({ error: 'Transaction not found' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, amount, category, description, date, paymentMode } = req.body;

        // Try updating in Expense first
        let updated = await Expense.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            { 
                $set: { 
                    amount, category, description, 
                    expenseDate: date, paymentMode 
                } 
            },
            { new: true }
        );

        if (!updated) {
            // Try updating in Income
            updated = await Income.findOneAndUpdate(
                { _id: id, userId: req.user.id },
                { 
                    $set: { 
                        amount, source: category, 
                        incomeDate: date 
                    } 
                },
                { new: true }
            );
        }

        if (!updated) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.status(200).json({ success: true, data: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// @desc    Get stats
// @route   GET /api/transactions/stats
// @access  Private
exports.getStats = async (req, res) => {
    try {
        const uid = new mongoose.Types.ObjectId(req.user.id);
        
        const expenseTotal = await Expense.aggregate([
            { $match: { userId: uid, status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const incomeTotal = await Income.aggregate([
            { $match: { userId: uid } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalExpense = expenseTotal.length > 0 ? expenseTotal[0].total : 0;
        const totalIncome = incomeTotal.length > 0 ? incomeTotal[0].total : 0;

        // Fetch User Balance and Transfer Summary from Master DB
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        const Transfer = createTransferModel(masterDb);
        
        const masterUser = await User.findById(req.user.id);
        const actualBalance = masterUser ? masterUser.balance : 0;

        const transfersIn = await Transfer.aggregate([
            { $match: { receiverId: uid, status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const transfersOut = await Transfer.aggregate([
            { $match: { senderId: uid, status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalTransfersIn = transfersIn.length > 0 ? transfersIn[0].total : 0;
        const totalTransfersOut = transfersOut.length > 0 ? transfersOut[0].total : 0;

        res.status(200).json({
            data: {
                income: totalIncome + totalTransfersIn,
                expense: totalExpense + totalTransfersOut,
                balance: actualBalance
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// @desc    Get category stats
// @route   GET /api/transactions/category-stats
// @access  Private
exports.getCategoryStats = async (req, res) => {
    try {
        const { type = 'expense', startDate, endDate } = req.query;
        const uid = new mongoose.Types.ObjectId(req.user.id);
        let results = [];

        if (type === 'expense') {
            const query = { userId: uid, status: 'approved' };
            if (startDate || endDate) {
                query.expenseDate = {};
                if (startDate) query.expenseDate.$gte = new Date(startDate);
                if (endDate) query.expenseDate.$lte = new Date(endDate);
            }
            results = await Expense.aggregate([
                { $match: query },
                { $group: { _id: '$category', amount: { $sum: '$amount' } } },
                { $sort: { amount: -1 } }
            ]);
        } else {
            const query = { userId: uid };
            if (startDate || endDate) {
                query.incomeDate = {};
                if (startDate) query.incomeDate.$gte = new Date(startDate);
                if (endDate) query.incomeDate.$lte = new Date(endDate);
            }
            results = await Income.aggregate([
                { $match: query },
                { $group: { _id: '$source', amount: { $sum: '$amount' } } },
                { $sort: { amount: -1 } }
            ]);
        }

        // Include Internal Transfers in category stats
        const masterDb = await connectMasterDB();
        const Transfer = createTransferModel(masterDb);
        const transferQuery = { status: 'success' };
        if (type === 'expense') {
            transferQuery.senderId = uid;
        } else {
            transferQuery.receiverId = uid;
        }

        if (startDate || endDate) {
            transferQuery.createdAt = {};
            if (startDate) transferQuery.createdAt.$gte = new Date(startDate);
            if (endDate) transferQuery.createdAt.$lte = new Date(endDate);
        }

        const transferStats = await Transfer.aggregate([
            { $match: transferQuery },
            { $group: { _id: type === 'expense' ? 'Transfer Sent' : 'Transfer Received', amount: { $sum: '$amount' } } }
        ]);

        if (transferStats.length > 0) {
            results.push(transferStats[0]);
        }

        res.status(200).json({ data: results });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};

// @desc    Get monthly stats
// @route   GET /api/transactions/monthly-stats
// @access  Private
exports.getMonthlyStats = async (req, res) => {
    try {
        const { year = new Date().getFullYear(), type = 'expense' } = req.query;
        const uid = new mongoose.Types.ObjectId(req.user.id);
        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
        
        let stats = [];

        if (type === 'expense') {
            stats = await Expense.aggregate([
                { $match: { userId: uid, status: 'approved', expenseDate: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: { $month: '$expenseDate' }, amount: { $sum: '$amount' } } },
                { $sort: { '_id': 1 } }
            ]);
        } else {
            stats = await Income.aggregate([
                { $match: { userId: uid, incomeDate: { $gte: startDate, $lte: endDate } } },
                { $group: { _id: { $month: '$incomeDate' }, amount: { $sum: '$amount' } } },
                { $sort: { '_id': 1 } }
            ]);
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const result = months.map((month, index) => {
            const found = stats.find(s => s._id === index + 1);
            return { month, amount: found ? found.amount : 0 };
        });

        res.status(200).json({ data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
};
