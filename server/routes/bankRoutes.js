const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getBanks, initConnect, verifyAndLink, getConnections, removeConnection, verifyAccount } = require('../controllers/bankController');

router.use(protect);

router.get('/list', getBanks);
router.post('/connect', initConnect);
router.post('/verify', verifyAndLink); // OTP Verification
router.post('/verify-account', verifyAccount); // Server-to-Server Account Verification
router.post('/resend-otp', require('../controllers/bankController').resendOTP);
router.get('/connections', getConnections);
router.delete('/connections/:connectionId', removeConnection);

module.exports = router;
