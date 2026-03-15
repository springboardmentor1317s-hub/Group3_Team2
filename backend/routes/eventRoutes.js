const express      = require('express');
const router       = express.Router();
const Event        = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const User         = require('../models/User');
const jwt          = require('jsonwebtoken');
const upload       = require('../middleware/upload');

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80';
const JWT_SECRET    = process.env.JWT_SECRET || 'supersecretkey123';

// ── Auth middleware ───────────────────────────────────────
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id; req.userRole = decoded.role; next();
  } catch (err) { res.status(401).json({ message: 'Invalid token' }); }
};

const adminMiddleware = (req, res, next) => {
  if (req.userRole !== 'college-admin' && req.userRole !== 'superadmin')
    return res.status(403).json({ message: 'Not authorized' });
  next();
};

// ── Helpers ───────────────────────────────────────────────
function computeStatus(ev) {
  if (ev.status === 'cancelled') return 'cancelled';
  const now = new Date(), s = new Date(ev.startDate), e = new Date(ev.endDate);
  if (now < s) return 'upcoming';
  if (now >= s && now <= e) return 'ongoing';
  return 'completed';
}

async function notifyAll(eventId, type, title, message) {
  try {
    const regs = await Registration.find({ eventId }).select('userId');
    if (regs.length) await Notification.insertMany(regs.map(r => ({ userId: r.userId, type, title, message, eventId })));
  } catch (e) { console.error('notifyAll error:', e.message); }
}

// ── GET /stats (before /:id) ──────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const events = await Event.find(); const now = new Date();
    res.json({
      total:     events.length,
      upcoming:  events.filter(e => new Date(e.startDate) > now).length,
      ongoing:   events.filter(e => new Date(e.startDate) <= now && new Date(e.endDate) >= now).length,
      completed: events.filter(e => new Date(e.endDate) < now && e.status !== 'cancelled').length
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET / ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, status, type, category, organizer } = req.query;
    let query = {};
    if (type     && type     !== 'all') query.type     = { $regex: '^' + type     + '$', $options: 'i' };
    if (category && category !== 'all') query.category = { $regex: '^' + category + '$', $options: 'i' };
    if (organizer) query.organizer = { $regex: organizer, $options: 'i' };
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate)   query.startDate.$lte = new Date(endDate);
    }
    const events = await Event.find(query).sort({ startDate: 1 });
    // Compute live status for each event
    const enriched = [];
    for (const ev of events) {
      const computed = computeStatus(ev);
      if (computed !== ev.status && ev.status !== 'cancelled') { ev.status = computed; await ev.save(); }
      const obj = ev.toObject(); obj.isPaid = (obj.registrationFee || 0) > 0; enriched.push(obj);
    }
    const result = (status && status !== 'all') ? enriched.filter(e => e.status === status) : enriched;
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /:id ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const obj = event.toObject();
    obj.status = computeStatus(obj);
    obj.isPaid  = (obj.registrationFee || 0) > 0;
    res.json(obj);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /:id/registrations (admin - participant details) ──
router.get('/:id/registrations', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const regs = await Registration.find({ eventId: req.params.id })
      .populate('userId', 'fullName email college');

    const registrations = regs.map(r => {
      const rid = r._id.toString();
      return {
        _id:             rid,
        registrationId:  rid,    // always plain string
        userId:          r.userId?._id,
        fullName:        r.userId?.fullName  || 'Unknown',
        email:           r.userId?.email     || '',
        college:         r.userId?.college   || '',
        approvalStatus:  r.approvalStatus,
        rejectionReason: r.rejectionReason   || '',
        selectedSlot:    r.selectedSlot      || '',
        paymentStatus:   r.paymentStatus,
        paymentMethod:   r.paymentMethod     || '—',
        paymentAmount:   r.paymentAmount     || 0,
        registeredAt:    r.registeredAt
      };
    });
    res.json({ registrations });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST / (create event) ─────────────────────────────────
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const required = ['title','description','type','category','venue','startDate','endDate','registrationDeadline','maxParticipants','organizer','contactEmail'];
    for (const f of required) { if (!req.body[f]) return res.status(400).json({ message: `Missing field: ${f}` }); }
    let imageUrl = DEFAULT_IMAGE;
    if (req.file) imageUrl = `/uploads/${req.file.filename}`;
    else if (req.body.imageUrl?.trim()) imageUrl = req.body.imageUrl.trim();
    const event = new Event({ ...req.body, imageUrl, createdBy: req.userId, isPaid: Number(req.body.registrationFee) > 0, currentParticipants: 0, status: 'upcoming' });
    const saved = await event.save();
    res.status(201).json({ message: 'Event created successfully', event: saved });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /:id (update event + notify participants) ─────────
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const prevVenue    = event.venue;
    const prevStart    = event.startDate?.toISOString();
    const wasCancelled = event.status === 'cancelled';

    const allowed = ['title','description','type','category','venue','startDate','endDate','registrationDeadline','maxParticipants','registrationFee','organizer','contactEmail','status'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (updates.registrationFee !== undefined) updates.isPaid = Number(updates.registrationFee) > 0;
    if (req.file) updates.imageUrl = `/uploads/${req.file.filename}`;
    else if (req.body.imageUrl?.trim()) updates.imageUrl = req.body.imageUrl.trim();

    const updated = await Event.findByIdAndUpdate(req.params.id, updates, { new: true });

    // Notify participants about important changes
    if (updates.status === 'cancelled' && !wasCancelled) {
      await notifyAll(event._id, 'event-update', '🚫 Event Cancelled', `"${event.title}" has been cancelled by the organizer.`);
    } else {
      const changes = [];
      if (updates.venue     && updates.venue     !== prevVenue) changes.push(`Venue changed to "${updates.venue}"`);
      if (updates.startDate && new Date(updates.startDate).toISOString() !== prevStart) changes.push(`Date updated`);
      if (changes.length) await notifyAll(event._id, 'event-update', '📢 Event Updated', `"${event.title}": ${changes.join(', ')}.`);
    }

    res.json({ message: 'Event updated successfully', event: updated });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /:id ───────────────────────────────────────────
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await notifyAll(event._id, 'event-update', '🗑️ Event Removed', `"${event.title}" has been removed.`);
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /:id/feedback ────────────────────────────────────
router.post('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5' });
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const reg = await Registration.findOne({ eventId: req.params.id, userId: req.userId });
    if (!reg) return res.status(403).json({ message: 'Only registered participants can give feedback' });
    if (event.feedback?.find(f => String(f.userId) === String(req.userId)))
      return res.status(400).json({ message: 'Already submitted feedback' });
    const user = await User.findById(req.userId).select('fullName college');
    event.feedback.push({ userId: req.userId, rating: Number(rating), comment: comment || '', fullName: user?.fullName || '', college: user?.college || '' });
    reg.hasFeedback = true; await reg.save(); await event.save();
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;