// const mongoose = require('mongoose');

// const ExpenseSchema = new mongoose.Schema({
//     title: {
//         type: String,
//         required: [true, 'Title is required'],
//         trim: true
//     },
//     amount: {
//         type: Number,
//         required: [true, 'Amount is required']
//     },
//     category: {
//         type: String,
//         required: [true, 'Category is required']
//     },
//     description: {
//         type: String,
//         trim: true
//     },
//     date: {
//         type: Date,
//         default: Date.now
//     },
//     tags: [String],
//     receiptUrl: String,
//     createdBy: {
//         type: mongoose.Schema.Types.ObjectId,
//         required: true // Refers to the User _id in master DB, stored here for reference
//     }
// }, {
//     timestamps: true
// });

// module.exports = {
//     ExpenseSchema,
//     createModel: (connection) => connection.model('Expense', ExpenseSchema)
// };


const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required']
    },
    category: {
        type: String,
        required: [true, 'Category is required']
    },
    description: {
        type: String,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    tags: [String],
    receiptUrl: String,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    paymentMode: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank'],
        default: 'cash'
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'approved'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = {
    ExpenseSchema,
    createModel: (connection) => connection.model('Expense', ExpenseSchema)
};
