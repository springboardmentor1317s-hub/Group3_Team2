const mongoose = require('mongoose');
require('dotenv').config();
const Registration = require('./models/Registration');

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    const count = await Registration.countDocuments();
    console.log(`Total Registrations: ${count}`);
    
    const unknownStatus = await Registration.find({ status: { $exists: false } });
    console.log(`Registrations without status field: ${unknownStatus.length}`);
    
    const allRegs = await Registration.find().limit(10);
    console.log('Sample Registrations:', JSON.stringify(allRegs, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

checkDB();
