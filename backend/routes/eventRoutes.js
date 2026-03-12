const express  = require('express');
const router   = express.Router();
const Event    = require('../models/Event');
const User     = require('../models/User');
const Registration = require('../models/Registration');
const jwt      = require('jsonwebtoken');
const upload   = require('../middleware/upload');
const { sendRegistrationConfirmation } = require('../services/emailService');

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80';

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123');
    req.userId   = decoded.id;
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

// ─── TEST ─────────────────────────────────────────────────────────────────────
router.get('/test', (_req, res) => res.json({ message: 'Events API working!' }));

// ─── STATS ────────────────────────────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [totalEvents, upcomingEvents, totalAdmins, totalStudents] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ status: 'upcoming' }),
      User.countDocuments({ role: 'college-admin' }),
      User.countDocuments({ role: 'student' })
    ]);
    res.json({ totalEvents, upcomingEvents, totalAdmins, totalStudents });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET ALL EVENTS ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, type, category, organizer } = req.query;
    let query = {};
    if (status   && status   !== 'all') query.status   = status;
    if (type     && type     !== 'all') query.type     = { $regex: '^' + type     + '$', $options: 'i' };
    if (category && category !== 'all') query.category = { $regex: '^' + category + '$', $options: 'i' };
    if (organizer) query.organizer = { $regex: organizer, $options: 'i' };
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      // endDate: go to end of that day (23:59:59)
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.startDate.$lte = end;
      }
    }
    const events = await Event.find(query).sort({ startDate: 1 });
    res.json(events);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET MY REGISTRATIONS ─────────────────────────────────────────────────────
router.get('/my/registrations', authMiddleware, async (req, res) => {
  try {
    // Fetch registrations for this user and heavily populate the event details
    const registrations = await Registration.find({ user_id: req.userId })
                                            .populate('event_id');
    
    // Map them into the format the frontend expects, merging event data with registration data
    const eventsWithSlots = registrations
      .filter(reg => reg.event_id) // Avoid null events if an event was deleted
      .map(reg => {
        const eventObj = reg.event_id.toObject();
        eventObj.bookedSlot = reg.slot; // Inject the user's specific booked slot
        eventObj.registrationStatus = reg.status; // Inject admin approval status
        return eventObj;
      });
      
    res.json(eventsWithSlots);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET SINGLE EVENT ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── CREATE EVENT (with optional image upload) ────────────────────────────────
router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  upload.single('image'),          // field name must be "image" in FormData
  async (req, res) => {
    try {
      const required = [
        'title', 'description', 'type', 'category', 'venue',
        'startDate', 'endDate', 'registrationDeadline',
        'maxParticipants', 'organizer', 'contactEmail'
      ];
      for (const f of required) {
        if (!req.body[f]) return res.status(400).json({ message: `Missing field: ${f}` });
      }

      // Resolve image URL: uploaded file → existing URL → default
      let imageUrl = DEFAULT_IMAGE;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
        imageUrl = req.body.imageUrl.trim();
      }

      // Parse available slots from strings
      let parsedSlots = [];
      if (req.body.availableSlots) {
        if (Array.isArray(req.body.availableSlots)) {
            parsedSlots = req.body.availableSlots;
        } else if (typeof req.body.availableSlots === 'string') {
            parsedSlots = req.body.availableSlots.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      }

      const event = new Event({
        ...req.body,
        availableSlots: parsedSlots,
        imageUrl,
        createdBy:          req.userId,
        isPaid:             Number(req.body.registrationFee) > 0,
        currentParticipants: 0,
        status:             'upcoming'
      });
      const saved = await event.save();
      res.status(201).json({ message: 'Event created successfully', event: saved });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ─── UPDATE EVENT (with optional image upload) ────────────────────────────────
router.put(
  '/:id',
  authMiddleware,
  adminMiddleware,
  upload.single('image'),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) return res.status(404).json({ message: 'Event not found' });

      if (String(event.createdBy) !== String(req.userId)) {
        return res.status(403).json({ message: 'You can only edit your own events' });
      }

      const allowed = [
        'title', 'description', 'type', 'category', 'venue', 'startDate', 'endDate',
        'registrationDeadline', 'maxParticipants', 'registrationFee',
        'organizer', 'contactEmail', 'status'
      ];
      const updates = {};
      allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
      if (updates.registrationFee !== undefined) updates.isPaid = Number(updates.registrationFee) > 0;
      
      if (req.body.availableSlots !== undefined) {
        if (Array.isArray(req.body.availableSlots)) {
            updates.availableSlots = req.body.availableSlots;
        } else if (typeof req.body.availableSlots === 'string') {
            updates.availableSlots = req.body.availableSlots.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
      }

      // Resolve image: new upload > sent URL > keep existing
      if (req.file) {
        updates.imageUrl = `/uploads/${req.file.filename}`;
      } else if (req.body.imageUrl && req.body.imageUrl.trim()) {
        updates.imageUrl = req.body.imageUrl.trim();
      }

      const updated = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });
      res.json({ message: 'Event updated successfully', event: updated });
    } catch (err) { res.status(500).json({ message: err.message }); }
  }
);

// ─── DELETE EVENT ─────────────────────────────────────────────────────────────
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (String(event.createdBy) !== String(req.userId)) {
      return res.status(403).json({ message: 'You can only delete your own events' });
    }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── REGISTER FOR EVENT ───────────────────────────────────────────────────────
router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.registeredUsers.map(String).includes(String(req.userId)))
      return res.status(400).json({ message: 'Already registered' });
    if (event.currentParticipants >= event.maxParticipants)
      return res.status(400).json({ message: 'Event is full' });
    if (new Date() > new Date(event.registrationDeadline))
      return res.status(400).json({ message: 'Registration deadline passed' });
    const { slot } = req.body;
    
    // Validate slot if the event forces it
    if (event.availableSlots && event.availableSlots.length > 0) {
       if (!slot) return res.status(400).json({ message: 'Must select an available time slot' });
       if (!event.availableSlots.includes(slot)) return res.status(400).json({ message: 'Invalid slot selected' });
    }

    event.registeredUsers.push(req.userId);
    event.currentParticipants += 1;
    await event.save();
    
    // Fetch the user to get their email address
    const user = await User.findById(req.userId);
    if (user) {
       await User.findByIdAndUpdate(req.userId, { $addToSet: { registeredEvents: event._id.toString() } });
    }
    
    await Registration.create({
      event_id: event._id,
      user_id: req.userId,
      slot: slot || null,
      status: 'pending'
    });

    // Send confirmation email asynchronously (do not block the response)
    if (user && user.email) {
       sendRegistrationConfirmation(user.email, event, slot).catch(err => console.error(err));
    }

    res.json({ message: `Registered for "${event.title}" successfully`, event });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── UNREGISTER FROM EVENT ────────────────────────────────────────────────────
router.delete('/:id/unregister', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const idx = event.registeredUsers.map(String).indexOf(String(req.userId));
    if (idx === -1) return res.status(400).json({ message: 'Not registered' });
    event.registeredUsers.splice(idx, 1);
    event.currentParticipants = Math.max(0, event.currentParticipants - 1);
    await event.save();
    await User.findByIdAndUpdate(req.userId, { $pull: { registeredEvents: event._id.toString() } });
    
    await Registration.findOneAndDelete({ event_id: event._id, user_id: req.userId });

    res.json({ message: `Unregistered from "${event.title}" successfully` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── BULK REGISTRATION STATUS UPDATE ──────────────────────────────────────────
router.put('/registrations/bulk-status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { registrationIds, status } = req.body;
    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
      return res.status(400).json({ message: 'Must provide an array of registrationIds' });
    }
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided' });
    }

    // Verify admin has access to the events these registrations belong to.
    // If superadmin, skip event ownership check. If college-admin, verify.
    if (req.userRole !== 'superadmin') {
      const registrations = await Registration.find({ _id: { $in: registrationIds } });
      const eventIds = [...new Set(registrations.map(r => String(r.event_id)))];
      const adminEvents = await Event.find({ _id: { $in: eventIds }, createdBy: req.userId });
      if (adminEvents.length !== eventIds.length) {
        return res.status(403).json({ message: 'Not authorized for some of these registrations' });
      }
    }

    const result = await Registration.updateMany(
      { _id: { $in: registrationIds } },
      { $set: { status } }
    );

    res.json({ message: `Successfully updated ${result.modifiedCount} registrations to ${status}`, updatedCount: result.modifiedCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── GET REGISTRATIONS FOR AN EVENT ──────────────────────────────────────────
router.get('/:id/registrations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (req.userRole !== 'superadmin' && String(event.createdBy) !== String(req.userId))
      return res.status(403).json({ message: 'Not authorized' });

    const registrations = await Registration.find({ event_id: event._id }).populate('user_id', 'fullName email college');
    
    const formattedRegistrations = registrations.map(reg => {
      if (reg.user_id) {
        return {
          _id: reg._id,
          user_id: reg.user_id._id,
          fullName: reg.user_id.fullName,
          email: reg.user_id.email,
          college: reg.user_id.college,
          status: reg.status,
          slot: reg.slot,
          timestamp: reg.timestamp
        };
      }
      return null;
    }).filter(r => r !== null);

    res.json({
      event:         { title: event.title, status: event.status },
      registrations: formattedRegistrations,
      total:         event.currentParticipants
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── SUBMIT FEEDBACK ──────────────────────────────────────────────────────────
router.post('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'Rating must be 1–5' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status !== 'completed')
      return res.status(400).json({ message: 'Feedback only for completed events' });
    if (!event.registeredUsers.map(String).includes(String(req.userId)))
      return res.status(403).json({ message: 'Only registered users can submit feedback' });
    if (event.feedback.find(f => String(f.userId) === String(req.userId)))
      return res.status(400).json({ message: 'Feedback already submitted' });
    event.feedback.push({ userId: req.userId, rating, comment });
    await event.save();
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;