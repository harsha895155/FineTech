const connectMasterDB = require('../config/masterDb');
const { createModel: createBankModel } = require('../models/master/BankConnection');
const { createModel: createUserModel } = require('../models/master/User');
const bcrypt = require('bcryptjs');
const smsService = require('../scripts/smsService'); // New SMS service

// Comprehensive bank database
const allBanks = [
    { id: 'bank_001', name: 'HDFC Bank', logo: '🏥', category: 'popular' },
    { id: 'bank_002', name: 'ICICI Bank', logo: '🛡️', category: 'popular' },
    { id: 'bank_003', name: 'SBI', logo: '🏛️', category: 'popular' },
    { id: 'bank_004', name: 'Axis Bank', logo: '💎', category: 'popular' },
    { id: 'bank_005', name: 'Kotak Mahindra', logo: '🔴', category: 'popular' },
    { id: 'bank_006', name: 'Federal Bank', logo: '🌴', category: 'local' },
    { id: 'bank_007', name: 'Canara Bank', logo: '🟡', category: 'local' },
    { id: 'bank_008', name: 'IDBI Bank', logo: '🏢', category: 'local' },
    { id: 'bank_009', name: 'Yes Bank', logo: '🔵', category: 'local' },
    { id: 'bank_010', name: 'HSBC', logo: '🟥', category: 'international' },
    { id: 'bank_011', name: 'Citibank', logo: '🏙️', category: 'international' },
    { id: 'bank_012', name: 'Standard Chartered', logo: '⚖️', category: 'international' },
    { id: 'bank_013', name: 'Barclays', logo: '🦅', category: 'international' }
];

/**
 * @desc    Get list of all supported banks
 */
exports.getBanks = async (req, res) => {
    res.json({ success: true, data: allBanks });
};

/**
 * @desc    Initialize Connection & Send SMS OTP
 */
// Helper to send OTP via preferred method
const sendOTPInternal = async (method, userData, otp, bankName) => {
    let sentVia = 'none';
    
    // 1. Try SMS if chosen
    if (method === 'sms' && userData.phoneNumber) {
        const smsResult = await smsService.sendOTP(userData.phoneNumber, otp, bankName);
        if (smsResult.success) {
            return { success: true, method: 'sms' };
        }
        console.warn('⚠️ SMS failed, falling back to Email if possible...');
    }

    // 2. Send via Email (as choice or fallback)
    try {
        const transporter = require('../config/mailer');
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: userData.email,
            subject: 'Bank Connection OTP - FintechPro',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #eef2ff; border-radius: 16px; max-width: 500px; margin: auto; background: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #6366F1; margin: 0; font-size: 24px;">Secure Verification</h2>
                        <p style="color: #64748B; font-size: 14px;">Bank Link Request for ${bankName}</p>
                    </div>
                    <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; border: 1px dashed #cbd5e1;">
                        <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
                        <div style="font-size: 32px; font-weight: 800; color: #1E293B; letter-spacing: 8px;">${otp}</div>
                    </div>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 25px; text-align: center;">
                        This code is valid for <b>5 minutes</b>. For your security, never share this code with anyone.
                    </p>
                    <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 15px; text-align: center;">
                        <p style="color: #94A3B8; font-size: 11px; margin: 0;">FintechPro Security Systems • Authorized Transaction</p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        return { success: true, method: 'email' };
    } catch (err) {
        console.error('❌ Email dispatch failed:', err.message);
        return { success: false, error: err.message };
    }
};

/**
 * @desc    Initialize Connection & Send OTP
 */
exports.initConnect = async (req, res) => {
    const { bankName, accountHolderName, accountNumber, ifscCode, otpMethod } = req.body;

    // 1. Basic Field Presence
    if (!bankName || !accountHolderName || !accountNumber || !ifscCode) {
        return res.status(400).json({ success: false, message: 'Please provide all details' });
    }

    // 2. Strict Validations
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode)) {
        return res.status(400).json({ success: false, message: 'Invalid IFSC Code format (e.g. HDFC0001234)' });
    }

    const accountRegex = /^\d{9,18}$/;
    if (!accountRegex.test(accountNumber)) {
        return res.status(400).json({ success: false, message: 'Account Number must be between 9 to 18 digits.' });
    }

    try {
        const masterDb = await connectMasterDB();
        const BankConnection = masterDb.models.BankConnection || createBankModel(masterDb);
        const User = masterDb.models.User || createUserModel(masterDb);

        const userData = await User.findById(req.user.id);
        if (!userData) return res.status(404).json({ success: false, message: 'User not found' });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = await bcrypt.hash(otp, 10);
        const otpExpiresAt = new Date(Date.now() + 5 * 60000); 

        const maskedNumber = '••••' + accountNumber.slice(-4);

        // Send OTP via chosen/best method
        const dispatch = await sendOTPInternal(otpMethod || 'sms', userData, otp, bankName);

        // Create connection record
        const connection = await BankConnection.create({
            userId: req.user._id,
            bankName,
            accountHolderName,
            accountNumberMasked: maskedNumber,
            ifscCode,
            otpHash,
            otpExpiresAt,
            deliveryMethod: dispatch.method || 'email',
            trials: 0,
            linkedStatus: 'pending'
        });

        const maskedPhone = userData.phoneNumber ? userData.phoneNumber.replace(/.(?=.{4})/g, '*') : 'N/A';
        const maskedEmail = userData.email ? userData.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => gp2 + '*'.repeat(gp3.length)) : 'N/A';

        res.json({ 
            success: true, 
            message: `OTP sent via ${dispatch.method === 'sms' ? 'SMS' : 'Email'}`,
            data: { 
                connectionId: connection._id,
                maskedPhone,
                maskedEmail,
                methodUsed: dispatch.method
            }
        });

        console.log(`[OTP] Sent via ${dispatch.method} to user ${userData.email} | Code: ${otp}`);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Verify OTP
 */
exports.verifyAndLink = async (req, res) => {
    const { connectionId, otp } = req.body;

    try {
        const masterDb = await connectMasterDB();
        const BankConnection = masterDb.models.BankConnection || createBankModel(masterDb);

        const connection = await BankConnection.findById(connectionId);
        if (!connection) return res.status(404).json({ success: false, message: 'Session expired' });

        // BRUTE FORCE PROTECTION: Limit to 3 trials
        if (connection.trials >= 3) {
            connection.linkedStatus = 'failed';
            await connection.save();
            return res.status(403).json({ success: false, message: 'Too many incorrect attempts. Session locked.' });
        }

        if (new Date() > connection.otpExpiresAt) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        const isMatch = await bcrypt.compare(otp, connection.otpHash);
        if (!isMatch) {
            connection.trials += 1;
            await connection.save();
            return res.status(400).json({ success: false, message: `Invalid OTP. ${3 - connection.trials} attempts remaining.` });
        }

        connection.linkedStatus = 'linked';
        connection.otpHash = undefined;
        connection.trials = 0;
        await connection.save();

        res.json({
            success: true,
            message: 'Bank Linked Successfully',
            data: {
                bankName: connection.bankName,
                accountLast4: connection.accountNumberMasked.slice(-4)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Resend OTP
 */
exports.resendOTP = async (req, res) => {
    const { connectionId } = req.body;
    try {
        const masterDb = await connectMasterDB();
        const BankConnection = masterDb.models.BankConnection || createBankModel(masterDb);
        const User = masterDb.models.User || createUserModel(masterDb);

        const connection = await BankConnection.findById(connectionId);
        if (!connection) return res.status(404).json({ success: false, message: 'Session not found' });

        const userData = await User.findById(connection.userId);
        if (!userData) return res.status(404).json({ success: false, message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        connection.otpHash = await bcrypt.hash(otp, 10);
        connection.otpExpiresAt = new Date(Date.now() + 5 * 60000);
        
        const dispatch = await sendOTPInternal(connection.deliveryMethod, userData, otp, connection.bankName);
        connection.deliveryMethod = dispatch.method;
        await connection.save();

        res.json({ 
            success: true, 
            message: `New OTP sent via ${dispatch.method === 'sms' ? 'SMS' : 'Email'}`
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Get linked accounts
 */
exports.getConnections = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const BankConnection = masterDb.models.BankConnection || createBankModel(masterDb);
        const connections = await BankConnection.find({ userId: req.user._id, linkedStatus: 'linked' });
        res.json({ success: true, data: connections });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Remove/Unlink bank account
 */
exports.removeConnection = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const BankConnection = masterDb.models.BankConnection || createBankModel(masterDb);
        
        const connection = await BankConnection.findOneAndDelete({ 
            _id: req.params.connectionId, 
            userId: req.user._id 
        });

        if (!connection) {
            return res.status(404).json({ success: false, message: 'Connection not found' });
        }

        res.json({ success: true, message: 'Account unlinked successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Verify Bank Account (S2S Aggregator)

 * @route   POST /api/banks/verify
 */
exports.verifyAccount = async (req, res) => {
    const { accountNumber, ifsc, name } = req.body;

    if (!accountNumber || !ifsc || !name) {
        return res.status(400).json({ success: false, message: 'Missing bank details' });
    }

    try {
        // In production, this would call a service like RazorpayX, Cashfree, or a direct Bank API
        // For demonstration, we simulate an external verification handshake
        console.log(`[BANK_VERIFY] S2S Request to Aggregator for ${accountNumber} | ${ifsc}`);
        
        // Mock success response
        const isValid = true; 
        const maskedNumber = '••••' + accountNumber.slice(-4);

        // Optional: Log this verification check in the database
        // await TransactionLog.create({ userId: req.user.id, type: 'VERIFICATION', ... });

        res.json({
            success: true,
            data: {
                accountValidity: isValid,
                bankName: 'SIMULATED BANK IND.',
                branch: 'S2S VIRTUAL BRANCH',
                accountNumberMasked: maskedNumber,
                verificationId: `V${Date.now()}`
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Bank verification service unavailable' });
    }
};

