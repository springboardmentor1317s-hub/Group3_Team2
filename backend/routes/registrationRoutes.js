const express    = require('express');
const jwt        = require('jsonwebtoken');
const router     = express.Router();
const ctrl       = require('../controllers/registrationController');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) { console.warn('⚠️ No token'); return res.status(401).json({ message: 'No token' }); }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id; req.userRole = decoded.role;
    console.log(`🔑 Auth: User=${req.userId}, Role=${req.userRole}`);
    next();
  } catch (err) { console.error('❌ Token failed:', err.message); res.status(401).json({ message: 'Invalid token' }); }
};

const admin = (req, res, next) => {
  if (req.userRole !== 'college-admin' && req.userRole !== 'superadmin')
    return res.status(403).json({ message: 'Forbidden' });
  next();
};

router.use((req, res, next) => { console.log(`📡 Registrations: ${req.method} ${req.url}`); next(); });

// STATIC routes MUST come before parameterised /:id routes
router.get('/my/registrations', auth, ctrl.getMyRegistrations);
router.patch('/bulk-status',    auth, admin, ctrl.bulkUpdateStatus);

// Parameterised routes after
router.post('/:id/register',     auth, ctrl.registerForEvent);
router.patch('/:id/status',      auth, admin, ctrl.updateStatus);
router.get('/:id/registrations', auth, admin, ctrl.getEventRegistrations);
router.delete('/:id',            auth, ctrl.unregisterFromEvent);

module.exports = router;