const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User'); // Added User model for stats
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

// GET statistics (superadmin/admin only)
router.get('/stats', async (req, res) => {
  console.log('GET /api/events/stats - Hit!');
  try {
    const totalEvents = await Event.countDocuments();
    const upcomingEvents = await Event.countDocuments({ status: 'upcoming' });
    const totalAdmins = await User.countDocuments({ role: 'college-admin' });
    const totalStudents = await User.countDocuments({ role: 'student' });

    console.log('Stats calculated:', { totalEvents, totalAdmins });

    res.json({
      totalEvents,
      upcomingEvents,
      totalAdmins,
      totalStudents
    });
  } catch (error) {
    console.error('GET /api/events/stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET all events (with optional filtering)
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, type, organizer } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (organizer) {
      query.organizer = { $regex: organizer, $options: 'i' };
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const events = await Event.find(query).sort({ startDate: 1 });
    console.log('GET /api/events - Found', events.length, 'events matching query:', query);
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

// POST register for an event (students)
router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.registeredUsers.map(String).includes(String(req.userId))) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }
    if (event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ message: 'Event is full' });
    }
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    event.registeredUsers.push(req.userId);
    event.currentParticipants += 1;
    await event.save();

    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { registeredEvents: event._id.toString() }
    });

    console.log(`User ${req.userId} registered for "${event.title}"`);
    res.json({ message: `Registered for "${event.title}" successfully`, event });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE unregister from an event
router.delete('/:id/unregister', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const idx = event.registeredUsers.map(String).indexOf(String(req.userId));
    if (idx === -1) {
      return res.status(400).json({ message: 'You are not registered for this event' });
    }

    event.registeredUsers.splice(idx, 1);
    event.currentParticipants = Math.max(0, event.currentParticipants - 1);
    await event.save();

    await User.findByIdAndUpdate(req.userId, {
      $pull: { registeredEvents: event._id.toString() }
    });

    console.log(`User ${req.userId} unregistered from "${event.title}"`);
    res.json({ message: `Unregistered from "${event.title}" successfully` });
  } catch (error) {
    console.error('Unregister error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST feedback for an event (students)
router.post('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Check if event is completed (optional, strict rule)
    if (event.status !== 'completed') {
      return res.status(400).json({ message: 'Feedback can only be submitted for completed events' });
    }

    // Check if user actually registered for the event
    if (!event.registeredUsers.map(String).includes(String(req.userId))) {
      return res.status(403).json({ message: 'You can only review events you registered for' });
    }

    // Check if user already submitted feedback
    const existingFeedback = event.feedback.find(f => String(f.userId) === String(req.userId));
    if (existingFeedback) {
      return res.status(400).json({ message: 'You have already submitted feedback for this event' });
    }

    event.feedback.push({
      userId: req.userId,
      rating,
      comment
    });

    await event.save();
    console.log(`User ${req.userId} submitted feedback for "${event.title}"`);
    res.json({ message: 'Feedback submitted successfully', feedback: event.feedback });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
