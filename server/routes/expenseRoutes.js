const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const tenantResolver = require('../middleware/tenantResolver');
const { createNotification } = require('../controllers/notificationController');

// All routes here require authentication and tenant resolution
router.use(protect);
router.use(tenantResolver);

/**
 * @desc    Get all expenses for the logged-in tenant
 * @route   GET /api/expenses
 */
router.get('/', async (req, res) => {
    try {
        const { Expense } = req.tenantModels;
        const expenses = await Expense.find({}).sort({ date: -1 });
        
        res.json({
            success: true,
            count: expenses.length,
            data: expenses
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Add a new expense to tenant database
 * @route   POST /api/expenses
 */
router.post('/', async (req, res) => {
    try {
        const { Expense } = req.tenantModels;
        const { title, amount, category, description, date, tags } = req.body;

        const expense = await Expense.create({
            title,
            amount,
            category,
            description,
            date,
            tags,
            createdBy: req.user._id
        });

        // Update Master User Balance (Deduct Expense)
        const masterDb = await connectMasterDB();
        const { createModel: createUserModel } = require('../models/master/User');
        const User = createUserModel(masterDb);
        await User.findByIdAndUpdate(req.user._id, { $inc: { balance: -amount } });

        // Create transaction notification
        await createNotification({
            userId: req.user._id,
            type: 'transaction',
            title: '💸 New Expense Recorded',
            message: `₹${amount.toLocaleString('en-IN')} spent on "${title}" (${category || 'General'})`,
            icon: '💸',
            metadata: { expenseId: expense._id, amount, category, title },
            sendEmail: false
        });

        res.status(201).json({
            success: true,
            data: expense
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Get single expense
 * @route   GET /api/expenses/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { Expense } = req.tenantModels;
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({ success: true, data: expense });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Update expense
 * @route   PATCH /api/expenses/:id
 */
router.patch('/:id', async (req, res) => {
    try {
        const { Expense } = req.tenantModels;
        const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({ success: true, data: expense });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Delete expense
 * @route   DELETE /api/expenses/:id
 */
router.delete('/:id', async (req, res) => {
    try {
        const { Expense } = req.tenantModels;
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        await expense.deleteOne();

        res.json({ success: true, message: 'Expense removed' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

