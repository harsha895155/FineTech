const connectMasterDB = require('../config/masterDb');
const { createModel: createPaymentAppModel } = require('../models/master/PaymentAppConnection');

/**
 * @desc    Link a new payment app (UPI/Wallet)
 * @route   POST /api/payment/apps/link
 */
exports.linkPaymentApp = async (req, res) => {
    const { appName, identifier, type } = req.body;

    if (!appName || !identifier) {
        return res.status(400).json({ success: false, message: 'App name and identifier are required' });
    }

    try {
        const masterDb = await connectMasterDB();
        const PaymentApp = masterDb.models.PaymentAppConnection || createPaymentAppModel(masterDb);

        // Check if already linked
        const existing = await PaymentApp.findOne({ userId: req.user.id, appName, identifier });
        if (existing) {
            return res.status(400).json({ success: false, message: 'This account is already linked' });
        }

        const connection = await PaymentApp.create({
            userId: req.user.id,
            appName,
            identifier,
            type: type || 'upi',
            status: 'linked'
        });

        res.json({
            success: true,
            message: `${appName} linked successfully`,
            data: connection
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get all linked payment apps
 * @route   GET /api/payment/apps
 */
exports.getLinkedApps = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const PaymentApp = masterDb.models.PaymentAppConnection || createPaymentAppModel(masterDb);

        const apps = await PaymentApp.find({ userId: req.user.id });
        res.json({ success: true, data: apps });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Unlink a payment app
 * @route   DELETE /api/payment/apps/:id
 */
exports.unlinkApp = async (req, res) => {
    const { id } = req.params;

    try {
        const masterDb = await connectMasterDB();
        const PaymentApp = masterDb.models.PaymentAppConnection || createPaymentAppModel(masterDb);

        const result = await PaymentApp.findOneAndDelete({ _id: id, userId: req.user.id });
        if (!result) {
            return res.status(404).json({ success: false, message: 'Connection not found' });
        }

        res.json({ success: true, message: 'App unlinked successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
