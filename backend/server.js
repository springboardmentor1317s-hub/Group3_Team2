const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// ── Middleware ─────────────────────────────────────────
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Import Routes First ────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const eventRoutes        = require('./routes/eventRoutes');
const registrationRoutes = require('./routes/registrationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// ── Mount Routes ───────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/notifications', notificationRoutes);

console.log("Routes loaded");

// ── MongoDB Connection ─────────────────────────────────
const connectDB = async () => {
  const MONGODB_URI = (process.env.MONGODB_URI || '').trim();
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI missing in .env');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');

    // Extract host from SRV URI
    const host = new URL(MONGODB_URI.replace('mongodb+srv://', 'http://')).hostname;

    // DNS diagnostic
    const resolved = await dns.promises.resolveSrv(`_mongodb._tcp.${host}`).catch(async (e) => {
      console.warn(`📡 SRV DNS failed for ${host}: ${e.message}. Trying direct A record...`);
      return await dns.promises.resolve(host).catch(() => 'DNS_FATAL');
    });
    console.log(`📡 DNS resolution result:`, JSON.stringify(resolved));

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4
    });

    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// ── Test Routes ───────────────────────────────────────
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend working!',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name
  });
});

app.get('/', (req, res) => {
  res.send('<h1>CampusEventHub API Running ✅</h1><p>Test API: <a href="/api/test">/api/test</a></p>');
});

// ── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found', url: req.originalUrl });
});

// ── Global Error Handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ── Start Server ──────────────────────────────────────
const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
};

startServer();