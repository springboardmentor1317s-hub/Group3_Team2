const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/registrationController');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const admin = requireRole('college-admin', 'superadmin');

// Debug log for all registration requests
router.use((req, res, next) => {
  console.log(`📡 Registration API: ${req.method} ${req.url}`);
  next();
});

// STATIC routes MUST come before parameterised /:id routes
router.get('/my/registrations', verifyToken, ctrl.getMyRegistrations);
router.patch('/bulk-status',    verifyToken, admin, ctrl.bulkUpdateStatus);

// Parameterised routes after
router.post('/:id/register',     verifyToken, ctrl.registerForEvent);
router.patch('/:id/status',      verifyToken, admin, ctrl.updateStatus);
router.get('/:id/registrations', verifyToken, admin, ctrl.getEventRegistrations);
router.delete('/:id',            verifyToken, ctrl.unregisterFromEvent);

module.exports = router;
