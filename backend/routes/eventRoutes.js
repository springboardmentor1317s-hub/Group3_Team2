const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  console.log('Auth middleware - Token received:', token ? 'Yes' : 'No');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my-temporary-secret-key');
    req.userId = decoded.id;
    req.userRole = decoded.role;
    console.log('Auth middleware - User role:', req.userRole);
    next();
  } catch (error) {
    console.error('Auth middleware - Token error:', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// TEST ROUTE - This should always work
router.get('/test', (req, res) => {
  res.json({ message: 'Events API test route is working!' });
});

// GET all events (public)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ startDate: 1 });
    console.log('GET /api/events - Found', events.length, 'events');
    res.json(events);
  } catch (error) {
    console.error('GET /api/events error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST create event (admin only)
router.post('/', authMiddleware, async (req, res) => {
  console.log('========== EVENT CREATION ==========');
  console.log('1. Request body:', req.body);
  console.log('2. User from token - ID:', req.userId, 'Role:', req.userRole);
  
  try {
    // Check if user is admin
    if (req.userRole !== 'college-admin' && req.userRole !== 'superadmin') {
      console.log('3. ❌ Authorization failed - user is', req.userRole);
      return res.status(403).json({ message: 'Not authorized to create events' });
    }
    
    console.log('3. ✅ Authorization passed');
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'type', 'category', 'venue', 
                           'startDate', 'endDate', 'registrationDeadline', 
                           'maxParticipants', 'organizer', 'contactEmail'];
    
    for (let field of requiredFields) {
      if (!req.body[field]) {
        console.log('4. ❌ Missing required field:', field);
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }
    
    console.log('4. ✅ All required fields present');
    
    const eventData = {
      ...req.body,
      createdBy: req.userId,
      isPaid: req.body.registrationFee > 0,
      currentParticipants: 0,
      status: 'upcoming'
    };
    
    console.log('5. Processed event data:', eventData);
    
    const event = new Event(eventData);
    const savedEvent = await event.save();
    
    console.log('6. ✅ Event saved successfully! ID:', savedEvent._id);
    console.log('=====================================');
    
    res.status(201).json({
      message: 'Event created successfully',
      event: savedEvent
    });
    
  } catch (error) {
    console.error('❌ ERROR in event creation:', error);
    console.error('❌ Error details:', error.message);
    console.log('=====================================');
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;