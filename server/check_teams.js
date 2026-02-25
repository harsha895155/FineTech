const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectMasterDB = require('./config/masterDb');
const { createModel: createTeamModel } = require('./models/master/Team');

async function check() {
    try {
        const masterDb = await connectMasterDB();
        const Team = createTeamModel(masterDb);
        const teams = await Team.find({}).lean();
        console.log('--- TEAMS IN DATABASE ---');
        console.log(JSON.stringify(teams, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
