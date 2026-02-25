const { getTenantConnection } = require('../config/tenantDb');
const { createModel: createExpenseModel } = require('../models/tenant/Expense');
const { createModel: createIncomeModel } = require('../models/tenant/Income');
const { createModel: createAuditLogModel } = require('../models/tenant/AuditLog');
const { createModel: createCategoryModel } = require('../models/tenant/Category');
const { createModel: createReportModel } = require('../models/tenant/Report');
const { createModel: createSettingsModel } = require('../models/tenant/Settings');

/**
 * Middleware to resolve tenant database connection and models
 */
const tenantResolver = async (req, res, next) => {
    try {
        if (!req.user || !req.user.databaseName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tenant identity unknown. Ensure user is authenticated.' 
            });
        }

        const dbName = req.user.databaseName;
        
        // Resolve the specific connection for this tenant
        const tenantConnection = await getTenantConnection(dbName);

        // Attach tenant-specific models to the request object
        // This allows controllers to use req.tenantModels.Expense.find() etc.
        req.tenantModels = {
            Expense: createExpenseModel(tenantConnection),
            Income: createIncomeModel(tenantConnection),
            AuditLog: createAuditLogModel(tenantConnection),
            Category: createCategoryModel(tenantConnection),
            Report: createReportModel(tenantConnection),
            Settings: createSettingsModel(tenantConnection)
        };

        next();
    } catch (error) {
        console.error('Tenant Resolver Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error resolving tenant database' 
        });
    }
};

module.exports = tenantResolver;
