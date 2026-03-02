const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

function mailLog(msg) {
    console.log(`[Mailer] ${msg}`);
}

mailLog('--- Mailer Initialization ---');

// Use a more robust configuration for Gmail
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // port 587 is STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
                rejectUnauthorized: false
            },
    timeout: 15000,
    connectionTimeout: 15000 
});

// Verify transporter
transporter.verify(function(error, success) {
    if (error) {
        console.error('❌ [Mailer] Connection error:', error.message);
        mailLog('❌ Connection error: ' + error.message);
    } else {
        console.log('✅ [Mailer] Service is ready to deliver messages');
        mailLog('✅ Service is ready');
    }
});

module.exports = transporter;


// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     },
//     connectionTimeout: 15000, 
//     greetingTimeout: 15000,
//     socketTimeout: 30000
// });

// // Verify transporter
// transporter.verify(function(error, success) {
//     if (error) {
//         console.error('❌ Mailer connection error:', error);
//     } else {
//         console.log('✅ Mailer is ready');
//     }
// });

// module.exports = transporter;
