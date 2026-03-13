const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my-temporary-secret-key');
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ========== PUBLIC ROUTES ==========

// GET all events (public)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ startDate: 1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// GET single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Error fetching event' });
  }
});

// ========== PROTECTED ROUTES ==========

// POST create event (admin only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (req.userRole !== 'college-admin' && req.userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to create events' });
    }
    
    const eventData = {
      ...req.body,
      createdBy: req.userId,
      isPaid: req.body.registrationFee > 0,
      currentParticipants: 0,
      registeredUsers: []
    };
    
    const event = new Event(eventData);
    await event.save();
    
    res.status(201).json({
      message: 'Event created successfully',
      event
    });
    
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
});

// PUT update event (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user created this event or is superadmin
    if (event.createdBy.toString() !== req.userId && req.userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { ...req.body, isPaid: req.body.registrationFee > 0 },
      { new: true }
    );
    
    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
    
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Error updating event' });
  }
});

// DELETE event (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Only creator or superadmin can delete
    if (event.createdBy.toString() !== req.userId && req.userRole !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }
    
    await Event.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Event deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ message: 'Error deleting event' });
  }
});

// ========== REGISTRATION ROUTES ==========

// POST register for event (students only)
router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    console.log('📝 Register request for event:', req.params.id);
    console.log('User:', req.userId, 'Role:', req.userRole);
    
    if (req.userRole !== 'student') {
      return res.status(403).json({ message: 'Only students can register for events' });
    }
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if already registered
    if (event.registeredUsers.includes(req.userId)) {
      return res.status(400).json({ message: 'Already registered for this event' });
    }
    
    // Check if event is full
    if (event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ message: 'Event is full' });
    }
    
    // Check if registration deadline passed
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }
    
    // Add user to registered users
    event.registeredUsers.push(req.userId);
    event.currentParticipants += 1;
    await event.save();
    
    console.log('✅ Registration successful for event:', event.title);
    
    res.json({ 
      message: 'Successfully registered for event', 
      event: {
        _id: event._id,
        title: event.title,
        currentParticipants: event.currentParticipants
      }
    });
    
  } catch (error) {
    console.error('❌ Error registering for event:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST unregister from event (students only)
router.post('/:id/unregister', authMiddleware, async (req, res) => {
  try {
    console.log('🗑️ Unregister request for event:', req.params.id);
    console.log('User:', req.userId, 'Role:', req.userRole);
    
    if (req.userRole !== 'student') {
      return res.status(403).json({ message: 'Only students can unregister from events' });
    }
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    // Check if user is registered
    if (!event.registeredUsers.includes(req.userId)) {
      return res.status(400).json({ message: 'You are not registered for this event' });
    }
    
    // Check if event has already started
    if (new Date() > new Date(event.startDate)) {
      return res.status(400).json({ message: 'Cannot cancel registration after event has started' });
    }
    
    // Remove user from registered users
    event.registeredUsers = event.registeredUsers.filter(
      id => id.toString() !== req.userId.toString()
    );
    
    // Decrease participant count (ensure it doesn't go below 0)
    event.currentParticipants = Math.max(0, event.currentParticipants - 1);
    
    await event.save();
    
    console.log('✅ Unregistration successful for event:', event.title);
    
    res.json({ 
      message: 'Successfully unregistered from event',
      event: {
        _id: event._id,
        title: event.title,
        currentParticipants: event.currentParticipants
      }
    });
    
  } catch (error) {
    console.error('❌ Error unregistering from event:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET user's registered events (students only)
router.get('/user/registrations', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'student') {
      return res.status(403).json({ message: 'Only students can view their registrations' });
    }
    
    const events = await Event.find({ 
      registeredUsers: req.userId 
    }).sort({ startDate: 1 });
    
    res.json(events);
    
  } catch (error) {
    console.error('Error fetching user registrations:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;