const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const connectMasterDB = require('../config/masterDb');
const { createModel: createUserModel } = require('../models/master/User');
const { createModel: createTeamModel } = require('../models/master/Team');

const LOG_FILE = path.join(__dirname, 'admin_debug.log');
const debugLog = (msg) => {
    const logMsg = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, logMsg);
    console.log(msg);
};

exports.getAllPlatformUsers = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        const allUsers = await User.find({}).select('-password').lean();
        
        let resultData = allUsers.filter(u => {
            if (!u) return false;
            const isVerified = u.isEmailVerified === true;
            const isRequester = req.user && String(u.email).toLowerCase() === String(req.user.email).toLowerCase();
            return isVerified || isRequester;
        });

        if (resultData.length === 0 && req.user) {
            resultData = [{
                _id: req.user._id,
                fullName: req.user.fullName || 'Administrator',
                email: req.user.email,
                role: req.user.role || 'administrator',
                isEmailVerified: true,
                databaseName: req.user.databaseName
            }];
        }

        res.status(200).json({ success: true, data: resultData });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updatePlatformUser = async (req, res) => {
    debugLog('--- UPDATE REQUEST RECEIVED ---');
    try {
        const { fullName, email, phoneNumber, role, password } = req.body;
        let { id } = req.params;

        debugLog(`Payload: ${JSON.stringify(req.body)}`);
        debugLog(`ID from Params: ${id}`);

        if (id && id.includes('/')) id = id.split('/')[0];
        id = id.trim();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            debugLog(`❌ INVALID ID: ${id}`);
            return res.status(400).json({ success: false, message: 'Invalid User ID format' });
        }

        const masterDb = await connectMasterDB();
        debugLog(`DB State: ${masterDb.readyState}`);
        
        const User = createUserModel(masterDb);
        
        // Use findByIdAndUpdate for direct DB hit
        const updateFields = { fullName, email, phoneNumber, role };
        
        // Remove undefined fields
        Object.keys(updateFields).forEach(key => (updateFields[key] === undefined || updateFields[key] === '') && delete updateFields[key]);

        if (password && password.trim() !== '') {
            debugLog('Processing password update...');
            const salt = await bcrypt.genSalt(10);
            updateFields.password = await bcrypt.hash(password, salt);
        }

        debugLog(`Attempting update for ID ${id} with: ${JSON.stringify(updateFields)}`);
        
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            debugLog('❌ USER NOT FOUND IN DB');
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        debugLog(`✅ UPDATE SUCCESSFUL: ${updatedUser.email}`);
        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser
        });
    } catch (err) {
        debugLog(`🔥 ERROR: ${err.message}`);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.adminCreatePlatformUser = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password, role } = req.body;
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ success: false, message: 'User already exists' });

        const databaseName = `expense_${role || 'business'}_${Math.random().toString(36).substring(2, 8)}`;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            fullName, email, phoneNumber, 
            password: hashedPassword, 
            role: role || 'business', 
            databaseName, 
            isEmailVerified: false, 
            verificationOTP: otp,
            otpExpiry: new Date(Date.now() + 600000)
        });

        const transporter = require('../config/mailer');
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verification Code',
            html: `Your code: <b>${otp}</b>`
        }).catch(e => debugLog(`Mail error: ${e.message}`));

        res.status(201).json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.deletePlatformUser = async (req, res) => {
    try {
        let { id } = req.params;
        if (id && id.includes('/')) id = id.split('/')[0];
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        await User.findByIdAndDelete(id.trim());
        res.status(200).json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.impersonateUser = async (req, res) => {
    try {
        let { id } = req.params;
        if (id && id.includes('/')) id = id.split('/')[0];
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        const user = await User.findById(id.trim());
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ success: true, data: { ...user._doc, token } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.createPlatformTeam = async (req, res) => {
    debugLog('--- CREATE TEAM REQUEST RECEIVED ---');
    try {
        const { name, description, members } = req.body;
        
        if (!name || !members || !Array.isArray(members) || members.length === 0) {
            debugLog('❌ Invalid payload: MISSING NAME OR MEMBERS');
            return res.status(400).json({ success: false, message: 'Team name and at least one member are required' });
        }

        debugLog(`📦 Team: "${name}", Desc: "${description}", Members: [${members.join(', ')}]`);
        
        const masterDb = await connectMasterDB();
        if (!masterDb || masterDb.readyState !== 1) {
             throw new Error('Master Database not connected or ready');
        }

        const Team = createTeamModel(masterDb);
        const User = createUserModel(masterDb); // Ensure User model is on this connection for createdBy ref
        
        const team = await Team.create({
            name,
            description: description || '',
            members,
            createdBy: req.user._id
        });

        debugLog(`✅ TEAM CREATION SUCCESS: ID ${team._id}`);
        res.status(201).json({ success: true, data: team });
    } catch (err) {
        debugLog(`🔥 TEAM CREATION ERROR: ${err.message}`);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

exports.getAllPlatformTeams = async (req, res) => {
    debugLog('--- GET ALL TEAMS REQUEST RECEIVED ---');
    try {
        const masterDb = await connectMasterDB();
        const Team = createTeamModel(masterDb);
        const User = createUserModel(masterDb); 

        const teams = await Team.find({})
            .populate('members', 'fullName email role')
            .populate('createdBy', 'fullName email')
            .lean();

        debugLog(`✅ FETCHED ${teams.length} TEAMS: ${JSON.stringify(teams.map(t => t.name))}`);
        res.status(200).json({ success: true, data: teams });
    } catch (err) {
        debugLog(`🔥 GET TEAMS ERROR: ${err.message}`);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

exports.deletePlatformTeam = async (req, res) => {
    try {
        let { id } = req.params;
        const masterDb = await connectMasterDB();
        const Team = createTeamModel(masterDb);
        await Team.findByIdAndDelete(id.trim());
        res.status(200).json({ success: true, message: 'Team deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
// --- Organization/Business Management ---

// @desc    Get all users sharing the same tenant database
// @route   GET /api/admin/users
exports.getOrganizationUsers = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        const users = await User.find({ databaseName: req.user.databaseName }).select('-password').lean();
        res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Get pending transactions from the tenant database
// @route   GET /api/admin/transactions/pending
exports.getPendingTransactions = async (req, res) => {
    try {
        if (!req.tenantModels || !req.tenantModels.Expense) {
            return res.status(400).json({ success: false, message: 'Tenant database not resolved' });
        }
        
        // Find pending expenses in tenant DB
        const pending = await req.tenantModels.Expense.find({ status: 'pending' }).lean();
        
        // Fetch user info from master DB for these expenses
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        
        const results = await Promise.all(pending.map(async (tx) => {
            const user = await User.findById(tx.createdBy).select('fullName email').lean();
            return { ...tx, user };
        }));

        res.status(200).json({ success: true, data: results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Approve or reject a transaction in the tenant database
// @route   PUT /api/admin/transactions/:id/status
exports.updateTransactionStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        if (!req.tenantModels || !req.tenantModels.Expense) {
            return res.status(400).json({ success: false, message: 'Tenant database not resolved' });
        }

        const expense = await req.tenantModels.Expense.findByIdAndUpdate(
            req.params.id,
            { $set: { status, rejectionReason } },
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        res.status(200).json({ success: true, message: `Transaction ${status}`, data: expense });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// @desc    Add a new employee to the same tenant database
// @route   POST /api/admin/employees
exports.addEmployee = async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password, role } = req.body;
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Employee inherits the admin's databaseName
        const user = await User.create({
            fullName,
            email,
            phoneNumber,
            password: hashedPassword,
            role: role || 'employee',
            databaseName: req.user.databaseName,
            isEmailVerified: true // Admin-created accounts are typically pre-verified or don't need immediate OTP
        });

        res.status(201).json({ success: true, message: 'Account created successfully', data: user });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
