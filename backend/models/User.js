const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  college: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'college-admin', 'super-admin'],
    required: true
  },
  password: {
    type: String,
    required: true
  },
  balance: {
    type: Number,
    default: 1000
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
