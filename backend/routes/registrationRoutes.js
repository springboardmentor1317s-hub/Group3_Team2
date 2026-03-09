const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const registrationController = require('../controllers/registrationController');

// We duplicate authMiddleware here to avoid modifying other modules, 
// per instruction "Do not modify existing logic or other modules".
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

router.get('/my/registrations', authMiddleware, registrationController.getMyRegistrations);
router.post('/:eventId/register', authMiddleware, registrationController.registerForEvent);
router.delete('/:eventId/unregister', authMiddleware, registrationController.unregisterFromEvent);

module.exports = router;
