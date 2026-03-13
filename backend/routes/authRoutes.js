const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

// REGISTER ROUTE
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Register endpoint hit with:', req.body);
    
    const { fullName, email, password, role, college } = req.body;
    
    // Check if all fields are present
    if (!fullName || !email || !password || !role || !college) {
      return res.status(400).json({ 
        message: 'All fields are required',
        received: req.body 
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const user = new User({
      fullName,
      email,
      password,
      role,
      college
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'mysecretkey123',
      { expiresIn: '7d' }
    );
    
    console.log('✅ User registered successfully:', email);
    
    res.status(201).json({
      message: 'Registration successful!',
      token,
      role: user.role,
      fullName: user.fullName,
      email: user.email
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
  try {
    console.log('🔑 Login endpoint hit with:', req.body.email);
    
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'mysecretkey123',
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful!',
      token,
      role: user.role,
      fullName: user.fullName,
      email: user.email
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;