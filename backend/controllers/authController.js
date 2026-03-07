const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require("express-validator");

// REGISTER USER
exports.registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, college, role, password } = req.body;

    // Validate required fields
    if (!fullName || !email || !college || !role || !password) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    // Check DB state
    const dbState = require('mongoose').connection.readyState;
    console.log('📊 DB Ready State during registration:', dbState);
    if (dbState !== 1) {
      console.warn('⚠️ MongoDB not connected. Attempting to proceed but might timeout.');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already registered. Please login.' });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      college,
      role,
      password // The pre-save hook in User model will hash this
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      role: user.role,
      fullName: user.fullName
    });

  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error. Registration failed.' });
  }
};

// // LOGIN USER
// exports.loginUser = async (req, res) => {
//   try {
//     const { email, password, role } = req.body;

//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ message: 'You are not registered. Please sign up first.' });

//     if (user.role !== role) return res.status(400).json({ message: 'Incorrect role selected.' });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '1d' }
//     );

//     res.json({
//       message: 'Login successful',
//       token,
//       role: user.role,
//       fullName: user.fullName
//     });

//   } catch (error) {
//     console.error('Login error:', error.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };


// LOGIN USER
// exports.loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check if user exists
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({
//         message: 'You are not registered. Please sign up first.'
//       });
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({
//         message: 'Invalid credentials'
//       });
//     }

//     // Generate JWT (role from DB)
//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '1d' }
//     );

//     res.json({
//       message: 'Login successful',
//       token,
//       role: user.role,
//       fullName: user.fullName
//     });

//   } catch (error) {
//     console.error('Login error:', error.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'You are not registered. Please sign up first.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'supersecretkey123',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      role: user.role,
      fullName: user.fullName,
      email: user.email
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

