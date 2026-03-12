const mongoose = require('mongoose');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
const fs = require('fs');
require('dotenv').config();

const dumpDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const events = await Event.find({ registeredUsers: { $exists: true, $not: { $size: 0 } } }, 'title registeredUsers');
        const regs = await Registration.find({}, 'event_id user_id status');
        fs.writeFileSync('dump.json', JSON.stringify({ events, regs }, null, 2), 'utf-8');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

dumpDb();
