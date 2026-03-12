const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const jwt = require('jsonwebtoken');

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

const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'college-admin' && req.userRole !== 'superadmin')
    return res.status(403).json({ message: 'Not authorized' });
  next();
};

router.put('/:id', authMiddleware, adminMiddleware, registrationController.updateRegistrationStatus);

module.exports = router;
