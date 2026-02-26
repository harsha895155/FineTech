const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, 'server/.env') });

const connectMasterDB = async () => {
    try {
        const conn = await mongoose.createConnection(process.env.MASTER_DB_URI).asPromise();
        console.log(`✅ Connected to Master DB: ${conn.name}`);
        return conn;
    } catch (err) {
        console.error('❌ Master DB Connection Error:', err);
        process.exit(1);
    }
};

const UserSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    phoneNumber: String,
    role: String,
    isEmailVerified: Boolean,
    isPhoneVerified: Boolean
}, { strict: false });

const checkUserRole = async () => {
    const conn = await connectMasterDB();
    const User = conn.model('User', UserSchema);
    
    const targetEmail = 'harshavardhan10003@gmail.com';
    console.log(`🔍 Checking user: ${targetEmail}\n`);
    
    try {
        const user = await User.findOne({ email: targetEmail });
        
        if (user) {
            console.log('📋 Current User Details:');
            console.log(`   Name: ${user.fullName}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Phone: ${user.phoneNumber}`);
            console.log(`   Role: "${user.role}"`);
            console.log(`   Email Verified: ${user.isEmailVerified}`);
            console.log(`   Phone Verified: ${user.isPhoneVerified}`);
        } else {
            console.log('❌ User NOT found in database.');
        }
        
    } catch (err) {
        console.error('❌ Error checking user:', err);
    } finally {
        await conn.close();
        process.exit(0);
    }
};

checkUserRole();
