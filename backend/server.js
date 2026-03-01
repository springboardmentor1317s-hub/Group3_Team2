const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Load environment variables immediately
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Server Start Logic
const startServer = async () => {
  try {
    const MONGODB_URI = (process.env.MONGODB_URI || '').trim();

    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('🔗 URI Prefix:', MONGODB_URI.substring(0, 20) + '...');

    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    // Set connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    console.log('🕒 Mongoose connect starting...');
    await mongoose.connect(MONGODB_URI, options);
    console.log('✅ Connected to MongoDB successfully');

    // Import and use routes only AFTER successful connection
    const authRoutes = require('./routes/authRoutes');
    const eventRoutes = require('./routes/eventRoutes');
    const chatRoutes = require('./routes/chatRoutes');

    app.use('/api/auth', authRoutes);
    app.use('/api/events', eventRoutes);
    app.use('/api/chat', chatRoutes);

    // Test route
    app.get('/api/test', (req, res) => {
      res.json({
        message: 'Backend is working!',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        dbName: mongoose.connection.name
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        message: 'Route not found',
        requestedUrl: req.originalUrl
      });
    });

    // Error handler
    app.use((err, req, res, next) => {
      console.error('❌ Server error:', err.stack);
      res.status(500).json({ message: 'Something went wrong!', error: err.message });
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('❌ Server failed to start:');
    console.error(err.name + ': ' + err.message);
    process.exit(1);
  }
};

startServer();