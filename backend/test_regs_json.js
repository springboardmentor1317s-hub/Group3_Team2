const mongoose = require('mongoose');
const User = require('./models/User');
const Registration = require('./models/Registration');
const Event = require('./models/Event');
const fs = require('fs');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const regs = await Registration.find().populate('user_id', 'email fullName').populate('event_id', 'title').sort({ timestamp: -1 }).limit(10);
  const out = regs.map(r => ({
    time: r.timestamp,
    email: r.user_id ? r.user_id.email : 'Unknown',
    eventTitle: r.event_id ? r.event_id.title : 'Unknown',
    status: r.status
  }));
  fs.writeFileSync('out_regs.json', JSON.stringify(out, null, 2));
  process.exit(0);
}).catch(console.error);
