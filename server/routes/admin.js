const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const auditLog = require('../middleware/auditLogger');
const tenantResolver = require('../middleware/tenantResolver');
const { 
    getOrganizationUsers, 
    getPendingTransactions, 
    updateTransactionStatus, 
    addEmployee,
    getAllPlatformUsers,
    updatePlatformUser,
    adminCreatePlatformUser,
    deletePlatformUser,
    createPlatformTeam,
    getAllPlatformTeams,
    deletePlatformTeam
} = require('../controllers/adminController');

// All admin routes are protected
router.use((req, res, next) => {
    console.log(`📡 [Admin Router Debug] Method: ${req.method}, Path: ${req.path}, URL: ${req.originalUrl}`);
    next();
});
router.use(protect);

/**
 * Platform Administration Routes
 * Only accessible by platform 'administrator'
 */
// Group related platform routes
router.get('/platform/users', authorize('administrator', 'admin'), getAllPlatformUsers);
router.post('/platform/users', authorize('administrator', 'admin'), adminCreatePlatformUser);

// Team Management
router.get('/platform/teams', authorize('administrator', 'admin'), getAllPlatformTeams);
router.post('/platform/teams', authorize('administrator', 'admin'), createPlatformTeam);
router.delete('/platform/teams/:id', authorize('administrator', 'admin'), deletePlatformTeam);

// Use a single route definition for user-specific platform actions
router.route('/platform/users/:id')
    .patch(authorize('administrator', 'admin'), updatePlatformUser)
    .delete(authorize('administrator', 'admin'), deletePlatformUser);

router.post('/platform/users/:id/impersonate', authorize('administrator', 'admin'), require('../controllers/adminController').impersonateUser);

// Explicitly catch unmatched platform routes to prevent fall-through
router.use('/platform', (req, res) => {
    console.log(`📡 [Admin Router] Unmatched Platform Route: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `Platform administration endpoint ${req.method} ${req.originalUrl} does not exist.`
    });
});

/**
 * Organization/Business Administration Routes
 * Accessible by business owners and organizations
 * These require the tenantResolver
 */
router.use(authorize('administrator', 'admin'));
router.use(tenantResolver);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users sharing the same tenant database
 */
router.get('/users', getOrganizationUsers);

/**
 * @route   GET /api/admin/transactions/pending
 * @desc    Get pending transactions from the tenant database
 */
router.get('/transactions/pending', getPendingTransactions);

/**
 * @route   PUT /api/admin/transactions/:id/status
 * @desc    Approve or reject a transaction in the tenant database
 */
router.put('/transactions/:id/status', auditLog('Updated Transaction Status'), updateTransactionStatus);

/**
 * @route   POST /api/admin/employees
 * @desc    Add a new employee to the same tenant database
 */
router.post('/employees', auditLog('Added Employee'), addEmployee);

module.exports = router;
