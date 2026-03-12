const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('../services/emailService');

exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedSlot } = req.body;
    const userId = req.userId;

    // 1. Check if event exists
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // 2. Check if already registered
    const existing = await Registration.findOne({ event: id, user: userId });
    if (existing) return res.status(400).json({ message: 'You are already registered for this event' });

    // 3. Check capacity
    if (event.currentParticipants >= event.maxParticipants) {
      return res.status(400).json({ message: 'Event is full' });
    }

    // 4. Check deadline
    if (new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ message: 'Registration deadline has passed' });
    }

    // 5. Create registration
    const registration = new Registration({
      event: id,
      user: userId,
      selectedSlot: selectedSlot || null,
      approvalStatus: 'pending'
    });

    await registration.save();

    // 6. Update event participant count and registeredUsers array
    event.currentParticipants += 1;
    event.registeredUsers.push(userId);
    await event.save();

    // 7. Update user's registeredEvents array
    await User.findByIdAndUpdate(userId, { $addToSet: { registeredEvents: id } });

    // 8. Send confirmation email (Async)
    const user = await User.findById(userId);
    emailService.sendRegistrationConfirmation(user, event, selectedSlot).catch(err => {
      console.error('📧 Email failed:', err.message);
    });

    res.status(201).json({
      message: `Successfully registered for ${event.title}`,
      registration
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params;
    const registrations = await Registration.find({ event: id })
      .populate('user', 'fullName email college')
      .sort({ registeredAt: -1 });

    const formatted = registrations.map(r => ({
      registrationId: r._id,
      fullName: r.user.fullName,
      email: r.user.email,
      college: r.user.college,
      selectedSlot: r.selectedSlot,
      approvalStatus: r.approvalStatus,
      registeredAt: r.registeredAt
    }));

    res.json({ registrations: formatted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyRegistrations = async (req, res) => {
  try {
    const userId = req.userId;
    const registrations = await Registration.find({ user: userId })
      .populate('event')
      .sort({ registeredAt: -1 });

    const formatted = registrations.map(r => {
      if (!r.event) return null;
      return {
        ...r.event.toObject(),
        registrationId: r._id,
        selectedSlot: r.selectedSlot,
        approvalStatus: r.approvalStatus
      };
    }).filter(x => x !== null);

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ message: 'Invalid IDs' });
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await Registration.updateMany(
      { _id: { $in: ids } },
      { $set: { approvalStatus: status } }
    );

    res.json({ message: `Successfully updated ${ids.length} registrations to ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
