const connectMasterDB = require('../config/masterDb');
const { createModel: createNotificationModel } = require('../models/master/Notification');
const transporter = require('../config/mailer');

/**
 * Helper: Create a notification and optionally send email
 */
const createNotification = async ({ userId, type, title, message, icon, metadata, sendEmail, emailTo, emailSubject, emailHtml }) => {
    try {
        const masterDb = await connectMasterDB();
        const Notification = masterDb.models.Notification || createNotificationModel(masterDb);

        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            icon: icon || '🔔',
            metadata: metadata || {},
            emailSent: false
        });

        // Send email notification if requested
        if (sendEmail && emailTo) {
            try {
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: emailTo,
                    subject: emailSubject || title,
                    html: emailHtml || `
                        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #0F172A; padding: 40px; border-radius: 16px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <div style="display: inline-block; width: 50px; height: 50px; background: linear-gradient(135deg, #6366F1, #D946EF); border-radius: 12px; line-height: 50px; font-size: 24px; transform: rotate(45deg);">
                                    <span style="display: inline-block; transform: rotate(-45deg); color: white; font-weight: 800;">F</span>
                                </div>
                            </div>
                            <h2 style="color: #E2E8F0; text-align: center; margin-bottom: 8px;">${title}</h2>
                            <p style="color: #94A3B8; text-align: center; font-size: 14px; margin-bottom: 30px;">${message}</p>
                            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                                <p style="color: #CBD5E1; margin: 0; font-size: 14px; line-height: 1.6;">${message}</p>
                            </div>
                            <p style="color: #64748B; text-align: center; font-size: 12px;">This is an automated notification from FintechPro.</p>
                            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0;">
                            <p style="text-align: center; color: #475569; font-size: 11px;">&copy; 2026 FintechPro. All rights reserved.</p>
                        </div>
                    `
                };

                await transporter.sendMail(mailOptions);
                notification.emailSent = true;
                await notification.save();
                console.log(`📧 [Notification] Email sent to ${emailTo}: ${title}`);
            } catch (mailErr) {
                console.error(`❌ [Notification] Email failed for ${emailTo}:`, mailErr.message);
            }
        }

        console.log(`🔔 [Notification] Created: ${type} for user ${userId}`);
        return notification;
    } catch (err) {
        console.error('❌ [Notification] Creation failed:', err.message);
        return null;
    }
};

/**
 * @desc    Get notifications for the logged-in user
 * @route   GET /api/notifications
 * @access  Protected
 */
const getNotifications = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const Notification = masterDb.models.Notification || createNotificationModel(masterDb);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Notification.countDocuments({ userId: req.user._id });
        const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

        res.json({
            success: true,
            data: notifications,
            unreadCount,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Get Notifications Error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Protected
 */
const markAsRead = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const Notification = masterDb.models.Notification || createNotificationModel(masterDb);

        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, data: notification });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Protected
 */
const markAllAsRead = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const Notification = masterDb.models.Notification || createNotificationModel(masterDb);

        await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { isRead: true }
        );

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * @desc    Delete a single notification
 * @route   DELETE /api/notifications/:id
 * @access  Protected
 */
const deleteNotification = async (req, res) => {
    try {
        const masterDb = await connectMasterDB();
        const Notification = masterDb.models.Notification || createNotificationModel(masterDb);

        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
