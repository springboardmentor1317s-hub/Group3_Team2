const mongoose = require('mongoose');
const Event = require('./models/Event');
const Registration = require('./models/Registration');
require('dotenv').config();

const checkDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const ev = await Event.countDocuments({ registeredUsers: { $exists: true, $not: { $size: 0 } } });
        const regs = await Registration.countDocuments();
        console.log('Events with users:', ev);
        console.log('Total registrations:', regs);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkDb();
