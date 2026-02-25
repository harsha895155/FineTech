const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createPayment, handleCallback, checkStatus } = require('../controllers/paymentController');
const { linkPaymentApp, getLinkedApps, unlinkApp } = require('../controllers/paymentAppController');

// For server-to-server webhook (public, but verified by checksum)
router.post('/callback', handleCallback);

// Protected routes for users
router.use(protect);
router.post('/create', createPayment);
router.get('/status/:transactionId', checkStatus);

// Payment App Connections
router.get('/apps', getLinkedApps);
router.post('/apps/link', linkPaymentApp);
router.delete('/apps/:id', unlinkApp);

module.exports = router;
