const mongoose = require('mongoose');
const User = require('./models/User');
const Registration = require('./models/Registration');
const Event = require('./models/Event');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const regs = await Registration.find().populate('user_id', 'email fullName').populate('event_id', 'title').sort({ timestamp: -1 }).limit(10);
  regs.forEach(r => {
    const userEmail = r.user_id ? r.user_id.email : 'Unknown';
    const evTitle = r.event_id ? r.event_id.title : 'Unknown';
    console.log(`[${r.timestamp}] ${userEmail} -> ${evTitle} (${r.status})`);
  });
  process.exit(0);
}).catch(console.error);
