const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const userRoutes = require('./routes/userRoutes');
const roleRoute = require('./routes/role');

const app = express();


// ─── Middleware ─────────────────────────────────
app.use(cors({
  origin: 'http://localhost:4200', // Angular app
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── MongoDB Connection ─────────────────────────
const connectDB = async () => {

  const MONGODB_URI = (process.env.MONGODB_URI || '').trim();

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI missing in .env');
    process.exit(1);
  }

  try {

    console.log('🔌 Connecting to MongoDB...');

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    console.log('✅ MongoDB connected');

  } catch (error) {

    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);

  }
};

// ─── Routes ─────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/chat', chatRoutes);

//app.use('/api/role',require('./routes/role'));
app.use('/api/users', userRoutes);
app.use("/api/role", roleRoute);


// ─── Test Route ─────────────────────────────────
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend working!',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name
  });
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <h1>Campus Event Hub API Running</h1>
    <p>Test API: <a href="/api/test">/api/test</a></p>
  `);
});

// ─── 404 Handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    url: req.originalUrl
  });
});

// ─── Global Error Handler ───────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

// ─── Start Server ───────────────────────────────
const startServer = async () => {

  await connectDB();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });

};

startServer();


