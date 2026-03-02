const User = require('../models/User');
const Company = require('../models/Company');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const connectMasterDB = require('../config/masterDb');
const { createModel: createUserModel } = require('../models/master/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
    const { name, username, email, password, role, companyName, industry } = req.body;

    try {
        const targetRole = role || 'individual';
        let user = await User.findOne({ email, role: targetRole });
        if (user && user.isEmailVerified) {
            return res.status(400).json({ msg: 'User already registered for this role' });
        }

        let newCompany = null;
        const userId = new mongoose.Types.ObjectId();

        // If registering as Admin and providing Company details
        if (role === 'admin' && companyName) {
            newCompany = await Company.create({
                companyName,
                industry: industry || 'Other'
            });
        }

        user = new User({
            _id: userId,
            name,
            username,
            email,
            password,
            role: role || 'individual',
            companyId: newCompany ? newCompany._id : null
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            id: user.id,
            role: user.role,
            companyId: user.companyId
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '30d' }, 
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    companyId: user.companyId
                }});
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Try Master DB (New Multi-Tenant Architecture)
        const masterDb = await connectMasterDB();
        const MasterUser = masterDb.models.User || createUserModel(masterDb);
        const { role: expectedRole } = req.body;
        
        const query = { email };
        if (expectedRole) {
            if (expectedRole.toLowerCase() === 'admin' || expectedRole.toLowerCase() === 'administrator') {
                query.role = { $in: ['admin', 'administrator'] };
            } else {
                query.role = expectedRole;
            }
        }
        const masterUser = await MasterUser.findOne(query).select('+password');

        if (masterUser) {
            const isMatch = await bcrypt.compare(password, masterUser.password);
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Invalid Credentials' });
            }

            const payload = {
                id: masterUser._id,
                role: masterUser.role,
                databaseName: masterUser.databaseName
            };

            const token = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '30d' }
            );

            return res.json({
                success: true,
                token,
                data: {
                    _id: masterUser._id,
                    fullName: masterUser.fullName,
                    email: masterUser.email,
                    role: masterUser.role,
                    databaseName: masterUser.databaseName
                }
            });
        }

        // 2. Fallback to Legacy DB (models/User)
        let user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(400).json({ success: false, msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, msg: 'Invalid Credentials' });
        }

        const payload = {
            id: user.id,
            role: user.role,
            companyId: user.companyId
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '30d' },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    success: true, 
                    token, 
                    user: {
                        id: user.id,
                        name: user.name,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        companyId: user.companyId
                    }
                });
            }
        );
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

// @desc    Verify OTP for new account
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
    const { email, role, otp } = req.body;

    try {
        const masterDb = await connectMasterDB();
        const MasterUser = masterDb.models.User || createUserModel(masterDb);
        
        const query = { email };
        if (role) query.role = role.toLowerCase();

        // Find user and include hidden OTP fields
        const user = await MasterUser.findOne(query).select('+verificationOTP +otpExpiry');

        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: 'User is already verified' });
        }

        if (!user.verificationOTP || user.verificationOTP !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid verificaton code' });
        }

        if (user.otpExpiry && user.otpExpiry < Date.now()) {
            return res.status(400).json({ success: false, message: 'Verification code expired' });
        }

        // Verify user
        user.isEmailVerified = true;
        user.verificationOTP = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Account verified successfully!'
        });

    } catch (err) {
        console.error('Verify OTP Error:', err);
        res.status(500).json({ success: false, message: 'Server error during verification' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/user
// @access  Private
exports.getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password').populate('companyId');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
