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

const fixAdminRole = async () => {
    const conn = await connectMasterDB();
    const User = conn.model('User', UserSchema);
    
    const targetEmail = 'harshavardhan10003@gmail.com';
    console.log(`🔍 Fixing admin role for: ${targetEmail}\n`);
    
    try {
        const user = await User.findOne({ email: targetEmail });
        
        if (user) {
            console.log('📋 Current Details:');
            console.log(`   Name: ${user.fullName}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Current Role: "${user.role}"`);
            
            // Change role to "admin" (lowercase, single word)
            user.role = 'admin';
            user.isEmailVerified = true;
            user.isPhoneVerified = true;
            await user.save();
            
            console.log('\n✅ Role updated successfully!');
            console.log(`   New Role: "${user.role}"`);
            console.log(`   Account Status: Verified`);
            console.log('\n🎉 You can now login at the admin portal!');
        } else {
            console.log('❌ User NOT found in database.');
        }
        
    } catch (err) {
        console.error('❌ Error updating user:', err);
    } finally {
        await conn.close();
        process.exit(0);
    }
};

fixAdminRole();
