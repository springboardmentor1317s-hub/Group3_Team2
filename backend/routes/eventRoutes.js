const express  = require('express');
const router   = express.Router();
const Event    = require('../models/Event');
const User     = require('../models/User');
const jwt      = require('jsonwebtoken');
const upload   = require('../middleware/upload');

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80';

<<<<<<< Updated upstream
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
=======
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
>>>>>>> Stashed changes

const adminMiddleware = requireRole('college-admin', 'superadmin');
const authMiddleware  = verifyToken;

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

// GET MY REGISTRATIONS moved to registrationRoutes.js

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

      const event = new Event({
        ...req.body,
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

// REGISTER/UNREGISTER moved to registrationRoutes.js

// ─── GET REGISTRATIONS FOR AN EVENT ──────────────────────────────────────────
router.get('/:id/registrations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('registeredUsers', 'fullName email college');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (req.userRole !== 'superadmin' && String(event.createdBy) !== String(req.userId))
      return res.status(403).json({ message: 'Not authorized' });
    res.json({
      event:         { title: event.title, status: event.status },
      registrations: event.registeredUsers,
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