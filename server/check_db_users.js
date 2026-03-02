const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MASTER_DB_URI = process.env.MASTER_DB_URI || 'mongodb://127.0.0.1:27017/auth_db';

async function check() {
    try {
        console.log('Connecting to:', MASTER_DB_URI);
        await mongoose.connect(MASTER_DB_URI);
        console.log('Connected!');

        const userSchema = new mongoose.Schema({
            fullName: String,
            email: String,
            role: String,
            isEmailVerified: Boolean
        }, { collection: 'users' });

        const User = mongoose.model('User', userSchema);
        const users = await User.find({});

        console.log('\n--- MASTER DB USERS ---');
        users.forEach(u => {
            console.log(`- ${u.email} [${u.role}] Verified: ${u.isEmailVerified}`);
        });
        console.log('-----------------------\n');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
