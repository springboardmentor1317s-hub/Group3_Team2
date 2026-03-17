const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const email = 'monish@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User ${email} not found.`);
      process.exit(0);
    }

    user.password = 'password123';
    await user.save();
    console.log(`Password for ${email} reset to "password123"`);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

resetPassword();
