const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('DB connected');

  try {
    const email = 'gopal@gmail.com';
    const userExists = await User.findOne({ email });
    console.log('UserExists check:', userExists ? 'Found user' : 'Not found');
    
    // Simulate user creation if duplicate check somehow passes (which it shouldn't)
    if (!userExists) {
        console.log('User does not exist, attempting creation');
        await User.create({
            fullName: 'Gopal2', email: 'gopal@gmail.com', college: 'sona', role: 'superadmin', password: 'password123'
        });
        console.log('Created user');
    }
  } catch (err) {
    console.log('Error caught:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

test();
