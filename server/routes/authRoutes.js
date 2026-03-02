const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const connectMasterDB = require('../config/masterDb');
const { createModel: createUserModel } = require('../models/master/User');
const { protect } = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');

const transporter = require('../config/mailer');
const { createNotification } = require('../controllers/notificationController');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/profiles/';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // userId + timestamp + extension to ensure uniqueness
        const uniqueSuffix = `profile_${req.user._id}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, webp) are allowed'));
    }
});

/**
 * @desc    Upload profile image
 * @route   POST /api/auth/upload-image
 */
router.post('/upload-image', protect, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image' });
        }

        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        // Path to be stored in DB (accessible via static middleware)
        const imagePath = `/uploads/profiles/${req.file.filename}`;

        // Find user and update ONLY their record using ID from token
        const user = await User.findById(req.user._id);
        
        // Optional: Delete old image file if it exists and isn't the default
        if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
            const oldPath = path.join(__dirname, '..', user.profileImage);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        user.profileImage = imagePath;
        await user.save();

        res.json({
            success: true,
            message: 'Profile image updated successfully',
            profileImage: imagePath
        });
    } catch (error) {
        console.error('Upload Image Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Reset profile image to default
 * @route   DELETE /api/auth/profile-image
 */
router.delete('/profile-image', protect, async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        const user = await User.findById(req.user._id);
        
        // Delete custom image file if it exists
        if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '..', user.profileImage);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Reset to default avatar
        user.profileImage = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        await user.save();

        res.json({
            success: true,
            message: 'Profile image reset to default',
            profileImage: user.profileImage
        });
    } catch (error) {
        console.error('Reset Image Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Register a new user and assign a unique database
 * @route   POST /api/auth/signup
 */
router.post('/signup', async (req, res) => {
    try {
        const { fullName, email, phoneNumber, password, role } = req.body;
        console.log('📝 Signup Attempt:', { fullName, email, phoneNumber, role });

        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        // 1. Check if email exists for this SPECIFIC role
        const targetRole = role || 'business';
        const existingUser = await User.findOne({ email, role: targetRole });

        if (existingUser && existingUser.isEmailVerified) {
            console.log(`❌ Signup Blocked: Email ${email} already exists for role ${targetRole}`);
            return res.status(400).json({ 
                success: false, 
                message: `This email is already registered as a ${targetRole}. Please use a different email or role.` 
            });
        }

        // Generate a unique database name based on user role and identity
        const uniqueSuffix = Math.random().toString(36).substring(2, 8);
        const databaseName = `expense_${targetRole}_${uniqueSuffix}`;

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        let user;
        if (existingUser && !existingUser.isEmailVerified) {
            // Update existing unverified account instead of creating a new one
            console.log(`🔄 Updating existing unverified account: ${email} (${targetRole})`);
            existingUser.fullName = fullName;
            existingUser.phoneNumber = phoneNumber;
            existingUser.password = hashedPassword;
            existingUser.databaseName = databaseName;
            existingUser.verificationOTP = otp;
            existingUser.otpExpiry = otpExpiry;
            user = await existingUser.save();
        } else {
            // Create user in Master Database
            user = await User.create({
                fullName,
                email,
                phoneNumber,
                password: hashedPassword,
                role: targetRole,
                databaseName,
                isEmailVerified: false,
                isPhoneVerified: false,
                verificationOTP: otp,
                otpExpiry: otpExpiry
            });
        }

        if (user) {
            // SEND ACTUAL EMAIL
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verify your FintechPro Account',
                text: `
                    Welcome to FintechPro!
                    
                    Your verification code is: ${otp}
                    
                    This code will expire in 10 minutes. 
                    Please do not share this code with anyone.
                    
                    Thank you,
                    The FintechPro Team
                `,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #6366F1; text-align: center;">Verify Your Account</h2>
                        <p>Hi ${fullName},</p>
                        <p>Thank you for joining <strong>FintechPro</strong>! To complete your registration, please use the following verification code:</p>
                        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 2rem; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p style="color: #6b7280; font-size: 0.875rem;">This code is valid for <strong>10 minutes</strong>. If you didn't request this, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="text-align: center; color: #9ca3af; font-size: 0.75rem;">&copy; 2026 FintechPro. All rights reserved.</p>
                    </div>
                `
            };

            try {
                await transporter.sendMail(mailOptions);
                console.log(`✅ OTP Email sent successfully to ${email}`);
            } catch (mailError) {
                console.error('Failed to send OTP email:', mailError);
                // We still returned success in simulation before, but maybe we should notify user if it fails?
                // For now, let's keep the user flow going but log the error.
            }

            res.status(201).json({
                success: true,
                message: 'Account created! Please verify your email with the OTP sent.',
                data: {
                    _id: user._id,
                    email: user.email,
                    needsVerification: true
                }
            });
        }
    } catch (error) {
        console.error('Signup Error:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            res.status(400).json({ success: false, message: `The ${field} is already in use. Please try again.` });
        } else {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

/**
 * @desc    Verify OTP for a new user
 * @route   POST /api/auth/verify-otp
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, role, otp } = req.body;
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        // Find user by email and role to ensure correct account verification
        const query = { email };
        if (role) query.role = role.toLowerCase();
        
        const user = await User.findOne(query).select('+verificationOTP +otpExpiry');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: 'Account already verified' });
        }

        if (user.verificationOTP !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (user.otpExpiry < new Date()) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        // Mark as verified
        user.isEmailVerified = true;
        user.isPhoneVerified = true;
        user.verificationOTP = undefined;
        user.otpExpiry = undefined;
        await user.save();

        // Create welcome notification + send confirmation email
        const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        await createNotification({
            userId: user._id,
            type: 'account_created',
            title: '🎉 Welcome to FintechPro!',
            message: `Your account was successfully created and verified on ${now}. Welcome aboard, ${user.fullName}!`,
            icon: '🎉',
            sendEmail: true,
            emailTo: user.email,
            emailSubject: 'Welcome to FintechPro - Account Confirmed!',
            emailHtml: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #0F172A; padding: 40px; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #6366F1, #D946EF); border-radius: 14px; line-height: 60px; font-size: 28px; transform: rotate(45deg);">
                            <span style="display: inline-block; transform: rotate(-45deg); color: white; font-weight: 800;">F</span>
                        </div>
                    </div>
                    <h2 style="color: #E2E8F0; text-align: center;">Welcome to FintechPro! 🎉</h2>
                    <p style="color: #94A3B8; text-align: center; font-size: 15px;">Hi ${user.fullName},</p>
                    <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 24px; margin: 24px 0;">
                        <p style="color: #CBD5E1; margin: 0; font-size: 14px;">✅ Your account has been successfully verified.</p>
                        <p style="color: #94A3B8; margin: 8px 0 0; font-size: 13px;">📧 Email: ${user.email}</p>
                        <p style="color: #94A3B8; margin: 4px 0 0; font-size: 13px;">👤 Role: ${user.role}</p>
                        <p style="color: #94A3B8; margin: 4px 0 0; font-size: 13px;">🕐 Verified: ${now}</p>
                    </div>
                    <p style="color: #64748B; text-align: center; font-size: 12px;">You can now log in and start managing your finances.</p>
                    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0;">
                    <p style="text-align: center; color: #475569; font-size: 11px;">&copy; 2026 FintechPro. All rights reserved.</p>
                </div>
            `
        });

        res.json({
            success: true,
            message: 'Account verified successfully! You can now login.',
            data: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                databaseName: user.databaseName,
                token: generateToken(user._id)
            }
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password, role: expectedRole } = req.body;

        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        // Find user by email AND role to allow multiple accounts per email
        const query = { email };
        if (expectedRole) {
            // Support admin/administrator interchangeability in query if needed,
            // but usually we stick to the stored role. Let's handle admin aliasing.
            if (expectedRole.toLowerCase() === 'admin' || expectedRole.toLowerCase() === 'administrator') {
                query.role = { $in: ['admin', 'administrator'] };
            } else {
                query.role = expectedRole;
            }
        }

        const user = await User.findOne(query).select('+password');

        // Role verification (Allow admin and administrator to be interchangeable)
        if (user && expectedRole) {
            const userRole = String(user.role || '').toLowerCase();
            const reqRole = String(expectedRole || '').toLowerCase();
            const isAdminPath = reqRole === 'admin' || reqRole === 'administrator';
            const isUserAdmin = userRole === 'admin' || userRole === 'administrator';

            if (isAdminPath && !isUserAdmin) {
                 return res.status(403).json({ success: false, message: 'Access Denied: Not an authorized administrator account.' });
            }
            
            if (!isAdminPath) {
                const isBusOrOrg = userRole === 'business' || userRole === 'organization';
                const isReqBusOrOrg = reqRole === 'business' || reqRole === 'organization';

                if (!(isBusOrOrg && isReqBusOrOrg) && userRole !== reqRole) {
                    return res.status(403).json({ 
                        success: false, 
                        message: `Access Denied: You cannot login to the ${expectedRole} portal with a ${user.role} account.` 
                    });
                }
            }
        }

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isEmailVerified) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Your account is pending verification. Please contact your administrator to activate it.',
                    needsVerification: true
                });
            }

            // Create login alert notification + send email
            const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
            const userAgent = req.headers['user-agent'] || 'Unknown Device';
            const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';

            await createNotification({
                userId: user._id,
                type: 'login_alert',
                title: '🔐 New Login Detected',
                message: `A login was detected on your account at ${now} from IP: ${clientIP}.`,
                icon: '🔐',
                metadata: { ip: clientIP, userAgent, loginTime: now },
                sendEmail: true,
                emailTo: user.email,
                emailSubject: 'FintechPro - New Login Alert',
                emailHtml: `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #0F172A; padding: 40px; border-radius: 16px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #6366F1, #D946EF); border-radius: 14px; line-height: 60px; font-size: 28px; transform: rotate(45deg);">
                                <span style="display: inline-block; transform: rotate(-45deg); color: white; font-weight: 800;">F</span>
                            </div>
                        </div>
                        <h2 style="color: #E2E8F0; text-align: center;">🔐 Login Alert</h2>
                        <p style="color: #94A3B8; text-align: center; font-size: 15px;">Hi ${user.fullName},</p>
                        <div style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 12px; padding: 24px; margin: 24px 0;">
                            <p style="color: #FDE68A; margin: 0 0 12px; font-weight: 700; font-size: 15px;">New sign-in to your account</p>
                            <p style="color: #CBD5E1; margin: 0; font-size: 13px;">🕐 Time: ${now}</p>
                            <p style="color: #CBD5E1; margin: 4px 0 0; font-size: 13px;">🌐 IP Address: ${clientIP}</p>
                            <p style="color: #CBD5E1; margin: 4px 0 0; font-size: 13px;">💻 Device: ${userAgent.substring(0, 80)}</p>
                        </div>
                        <p style="color: #94A3B8; text-align: center; font-size: 13px;">If this wasn't you, please change your password immediately.</p>
                        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0;">
                        <p style="text-align: center; color: #475569; font-size: 11px;">&copy; 2026 FintechPro. All rights reserved.</p>
                    </div>
                `
            });

            res.json({
                success: true,
                data: {
                    _id: user._id,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    profileImage: user.profileImage,
                    databaseName: user.databaseName,
                    token: generateToken(user._id)
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Update user profile
 * @route   PATCH /api/auth/profile
 */
router.patch('/profile', protect, async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);

        const updates = req.body;

        // Securely handle password update
        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(updates.password, salt);
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                databaseName: user.databaseName
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 */
router.get('/me', protect, async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        
        const user = await User.findById(req.user._id);
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * @desc    Get current user profile (Alias for /me)
 * @route   GET /api/auth/profile
 */
router.get('/profile', protect, async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        const user = await User.findById(req.user._id);
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

/**
 * @desc    Delete current user account
 * @route   DELETE /api/auth/me
 */
router.delete('/me', protect, async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        
        await User.findByIdAndDelete(req.user._id);
        
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;

