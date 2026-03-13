const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

// ─── Routes with Debugging ─────────────────────
console.log('\n📂 Loading route modules...');

let authRoutes, eventRoutes, chatRoutes;

try {
  authRoutes = require('./routes/authRoutes');
  console.log('   ✅ authRoutes loaded successfully');
} catch (error) {
  console.error('   ❌ Failed to load authRoutes:', error.message);
}

try {
  eventRoutes = require('./routes/eventRoutes');
  console.log('   ✅ eventRoutes loaded successfully');
} catch (error) {
  console.error('   ❌ Failed to load eventRoutes:', error.message);
}

try {
  chatRoutes = require('./routes/chatRoutes');
  console.log('   ✅ chatRoutes loaded successfully');
} catch (error) {
  console.error('   ❌ Failed to load chatRoutes:', error.message);
}

// Mount routes if they loaded successfully
console.log('\n📌 Mounting routes...');

if (authRoutes) {
  app.use('/api/auth', authRoutes);
  console.log('   ✅ Mounted /api/auth');
} else {
  console.log('   ❌ Skipped /api/auth (module not loaded)');
}

if (eventRoutes) {
  app.use('/api/events', eventRoutes);
  console.log('   ✅ Mounted /api/events');
} else {
  console.log('   ❌ Skipped /api/events (module not loaded)');
}

if (chatRoutes) {
  app.use('/api/chat', chatRoutes);
  console.log('   ✅ Mounted /api/chat');
} else {
  console.log('   ❌ Skipped /api/chat (module not loaded)');
}

// ─── Test Route ─────────────────────────────────
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend working!',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name,
    routes: {
      auth: !!authRoutes,
      events: !!eventRoutes,
      chat: !!chatRoutes
    }
  });
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <h1>Campus Event Hub API Running</h1>
    <p>Test API: <a href="/api/test">/api/test</a></p>
    <p>Auth API: <a href="/api/auth/test">/api/auth/test</a></p>
    <p>Events API: <a href="/api/events">/api/events</a></p>
  `);
});

// ─── 404 Handler ────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    url: req.originalUrl,
    note: 'Check server console for route loading status'
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
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Test API: http://localhost:${PORT}/api/test`);
    console.log(`🔑 Auth API: http://localhost:${PORT}/api/auth/test (if route exists)`);
    console.log(`📅 Events API: http://localhost:${PORT}/api/events\n`);
  });

};

startServer();