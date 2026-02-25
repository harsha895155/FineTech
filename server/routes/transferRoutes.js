const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    transferMoney, 
    getHistory, 
    getAllSystemTransactions,
    validateReceiver
} = require('../controllers/transferController');

router.use(protect); // All transfer routes are protected

// Base routes
router.post('/', transferMoney);
router.get('/history', getHistory);
router.post('/validate', validateReceiver);

// Admin route
router.get('/admin/all', getAllSystemTransactions);

module.exports = router;
