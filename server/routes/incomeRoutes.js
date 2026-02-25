const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const tenantResolver = require('../middleware/tenantResolver');

router.use(protect);
router.use(tenantResolver);

/**
 * @desc    Get all income records
 * @route   GET /api/income
 */
router.get('/', async (req, res) => {
    try {
        const { Income } = req.tenantModels;
        const income = await Income.find({}).sort({ date: -1 });
        res.json({ success: true, count: income.length, data: income });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Add new income
 * @route   POST /api/income
 */
router.post('/', async (req, res) => {
    try {
        const { Income } = req.tenantModels;
        const income = await Income.create({
            ...req.body,
            createdBy: req.user._id
        });

        // Update Master User Balance
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        await User.findByIdAndUpdate(req.user._id, { $inc: { balance: req.body.amount || 0 } });

        res.status(201).json({ success: true, data: income });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

module.exports = router;
