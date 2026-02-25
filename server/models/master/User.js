// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//     fullName: {
//         type: String,
//         required: [true, 'Full name is required'],
//         trim: true
//     },
//     email: {
//         type: String,
//         required: [true, 'Email is required'],
//         unique: true,
//         trim: true,
//         lowercase: true,
//         match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
//     },
//     phoneNumber: {
//         type: String,
//         required: [true, 'Phone number is required'],
//         trim: true
//     },
//     password: {
//         type: String,
//         required: [true, 'Password is required'],
//         minlength: 6,
//         select: false
//     },
//     role: {
//         type: String,
//         enum: ['administrator', 'business', 'organization'],
//         default: 'business'
//     },
//     databaseName: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     isEmailVerified: {
//         type: Boolean,
//         default: false
//     },
//     isPhoneVerified: {
//         type: Boolean,
//         default: false
//     },
//     profileImage: {
//         type: String,
//         default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
//     },
//     verificationOTP: {
//         type: String,
//         select: false
//     },
//     otpExpiry: {
//         type: Date,
//         select: false
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now
//     }
// }, {
//     timestamps: true
// });

// // Since we are using dynamic connections, we export the schema
// // and a helper to get the model on a specific connection.
// module.exports = {
//     UserSchema,
//     createModel: (connection) => connection.model('User', UserSchema)
// };


const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['administrator', 'admin', 'business', 'organization'],
        default: 'business'
    },
    databaseName: {
        type: String,
        required: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    profileImage: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
    },
    verificationOTP: {
        type: String,
        select: false
    },
    otpExpiry: {
        type: Date,
        select: false
    },
    balance: {
        type: Number,
        default: 10000.00, // Starting balance for demo/new users
        min: [0, 'Balance cannot be negative']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Since we are using dynamic connections, we export the schema
// and a helper to get the model on a specific connection.
module.exports = {
    UserSchema,
    createModel: (connection) => connection.models.User || connection.model('User', UserSchema)
};
