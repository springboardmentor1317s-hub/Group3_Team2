const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const jwt = require('jsonwebtoken');

// ─── Middleware ──────────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const superAdminMiddleware = (req, res, next) => {
  if (req.userRole !== 'superadmin') {
     return res.status(403).json({ message: 'Not authorized for this action' });
  }
  next();
};

// ─── SuperAdmin Dashboard Routes ─────────────────────────────────────────────
router.get('/', authMiddleware, superAdminMiddleware, userController.getAllUsers);
router.get('/admins', authMiddleware, superAdminMiddleware, userController.getAllAdmins);
router.get('/colleges', authMiddleware, superAdminMiddleware, userController.getColleges);

module.exports = router;
