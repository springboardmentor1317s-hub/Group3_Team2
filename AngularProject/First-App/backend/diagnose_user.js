const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const email = 'monish@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User ${email} not found.`);
      process.exit(0);
    }

    console.log('User found:', {
      _id: user._id,
      email: user.email,
      role: user.role,
      hashedPassword: user.password
    });

    // Test a common password if known, otherwise just check if it's a valid hash
    const testPassword = 'password123'; // Common test password
    const isMatch = await bcrypt.compare(testPassword, user.password);
    console.log(`Bcrypt compare for "${testPassword}":`, isMatch);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

checkUser();
