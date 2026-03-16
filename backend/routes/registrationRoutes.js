const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const jwt = require('jsonwebtoken');

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    console.warn('⚠️ No token provided in Authorization header');
    return res.status(401).json({ message: 'No token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    req.userId = decoded.id;
    req.userRole = decoded.role;
    console.log(`🔑 Auth success: User=${req.userId}, Role=${req.userRole}`);
    next();
  } catch (err) { 
    console.error('❌ Token verification failed:', err.message);
    res.status(401).json({ message: 'Invalid token' }); 
  }
};

// Admin middleware
const admin = (req, res, next) => {
  if (req.userRole !== 'college-admin' && req.userRole !== 'superadmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// Debug log for all registration requests
router.use((req, res, next) => {
  console.log(`📡 Registration API: ${req.method} ${req.url}`);
  next();
});

router.get('/my/registrations', auth, (req, res, next) => {
  console.log('👤 Fetching user registrations...');
  next();
}, registrationController.getMyRegistrations);

router.post('/:id/register', auth, (req, res, next) => {
  console.log(`🖱️ Registering user ${req.userId} for event ${req.params.id}`);
  next();
}, registrationController.registerForEvent);

router.get('/:id/registrations', auth, admin, registrationController.getEventRegistrations);
router.patch('/bulk-status', auth, admin, registrationController.bulkUpdateStatus);
router.delete('/:id', auth, registrationController.unregisterFromEvent);

module.exports = router;
