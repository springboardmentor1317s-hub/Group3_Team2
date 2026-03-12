const mongoose = require('mongoose');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
require('dotenv').config();

const dumpDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const events = await Event.find({ registeredUsers: { $exists: true, $not: { $size: 0 } } }, 'title registeredUsers');
        
        console.log('--- EVENTS WITH USERS ---');
        console.log(JSON.stringify(events, null, 2));

        const regs = await Registration.find({}, 'event_id user_id status');
        console.log('\n--- ALL REGISTRATIONS ---');
        console.log(JSON.stringify(regs, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

dumpDb();
