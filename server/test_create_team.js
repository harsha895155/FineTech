const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectMasterDB = require('./config/masterDb');
const { createModel: createUserModel } = require('./models/master/User');
const { createModel: createTeamModel } = require('./models/master/Team');

async function test() {
    try {
        const masterDb = await connectMasterDB();
        const User = createUserModel(masterDb);
        const Team = createTeamModel(masterDb);
        
        const admin = await User.findOne({ role: /admin/i });
        if (!admin) {
            console.log('No admin found to create team');
            process.exit(1);
        }

        const team = await Team.create({
            name: 'Test Team ' + Date.now(),
            description: 'Manual test team',
            members: [admin._id],
            createdBy: admin._id
        });

        console.log('✅ Manual Team Created:', team._id);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

test();
