const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');

const app = express();

// ✅ Middleware first
app.use(cors());
app.use(express.json());

// ✅ Then routes
app.use('/api/auth', require('./routes/authRoutes'));

// Test route
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✅'))
  .catch(err => console.log(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));