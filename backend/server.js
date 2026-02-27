const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection with Atlas
const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔌 Attempting to connect to MongoDB...');
console.log('📊 Using database:', MONGODB_URI ? MONGODB_URI.split('/').pop().split('?')[0] : 'Not specified');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  console.log('📊 Database name:', mongoose.connection.name);
  console.log('📦 Host:', mongoose.connection.host);
})
.catch(err => {
  console.error('❌ MongoDB connection error:');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
});

// Routes with logging
console.log('📂 Loading routes...');

if (authRoutes) {
  console.log('✅ Auth routes loaded from ./routes/authRoutes.js');
  app.use('/api/auth', authRoutes);
} else {
  console.log('❌ Auth routes failed to load');
}

if (eventRoutes) {
  console.log('✅ Event routes loaded from ./routes/eventRoutes.js');
  app.use('/api/events', eventRoutes);
} else {
  console.log('❌ Event routes failed to load');
}

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is working!',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name || 'unknown',
    routes: {
      auth: !!authRoutes,
      events: !!eventRoutes
    },
    endpoints: {
      test: '/api/test',
      auth: '/api/auth/register',
      events: '/api/events'
    }
  });
});

// 404 handler for undefined routes - FIXED VERSION
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.originalUrl);
  res.status(404).json({ 
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    availableEndpoints: ['/api/test', '/api/auth/register', '/api/auth/login', '/api/events']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Test API: http://localhost:${PORT}/api/test`);
  console.log(`🔑 Auth API: http://localhost:${PORT}/api/auth/register`);
  console.log(`📅 Events API: http://localhost:${PORT}/api/events`);
});