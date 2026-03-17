const express        = require('express');
const jwt            = require('jsonwebtoken');
const router         = express.Router();
const authController = require('../controllers/authController');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id; req.userRole = decoded.role; next();
  } catch (err) { res.status(401).json({ message: 'Invalid token' }); }
};

// Original routes
router.post('/register', authController.registerUser);
router.post('/login',    authController.loginUser);

// New routes needed by frontend
router.get('/me', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/wallet', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('walletBalance');
    res.json({ walletBalance: user?.walletBalance || 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/wallet/topup', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Invalid amount' });
    const user = await User.findByIdAndUpdate(req.userId, { $inc: { walletBalance: Number(amount) } }, { new: true });
    res.json({ walletBalance: user.walletBalance, message: `Added ₹${amount} to wallet` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;