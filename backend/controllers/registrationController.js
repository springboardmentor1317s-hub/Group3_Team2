const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const emailService = require('../services/emailService');

exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { selectedSlot } = req.body;
    const userId = req.userId;

    console.log(`📝 Registration request: Event=${id}, User=${userId}, Slot=${selectedSlot}`);

    // 1. Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      console.warn(`❌ Registration failed: Event ${id} not found`);
      return res.status(404).json({ message: 'Event not found' });
    }

    // 2. Check if already registered
    const existing = await Registration.findOne({ event: id, user: userId });
    if (existing) {
      console.warn(`⚠️ User ${userId} already registered via Registration model for Event ${id}`);
      return res.status(400).json({ message: 'You are already registered for this event' });
    }

    // EXTRA CHECK: Check if already in event.registeredUsers (fallback for old data)
    if (event.registeredUsers.map(String).includes(String(userId))) {
      console.warn(`⚠️ User ${userId} already in event.registeredUsers array for Event ${id}`);
      // If they are in the array but no Registration doc exists, we could create one or just error out.
      // Let's create one for consistency if it's missing.
      const newReg = new Registration({ event: id, user: userId, selectedSlot, approvalStatus: 'pending' });
      await newReg.save();
      return res.status(200).json({ message: 'Registration synchronized', registration: newReg });
    }

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
    if (user && user.email) {
      emailService.sendRegistrationConfirmation(
        user.email,
        user.fullName,
        event.title,
        selectedSlot,
        registration._id
      ).catch(err => {
        console.error('📧 Email failed:', err.message);
      });
    }

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
    
    // 1. Get current registrations
    let registrations = await Registration.find({ user: userId })
      .populate('event')
      .sort({ registeredAt: -1 });

    // 2. Sync Fix: Check User model for registeredEvents that might be missing Registration docs
    const user = await User.findById(userId);
    if (user && user.registeredEvents && user.registeredEvents.length > 0) {
      const existingEventIds = new Set(registrations.map(r => r.event ? r.event._id.toString() : null).filter(id => id !== null));
      const missingIds = user.registeredEvents.filter(id => !existingEventIds.has(id));

      if (missingIds.length > 0) {
        console.log(`🔄 Syncing ${missingIds.length} missing registrations for user ${userId}`);
        for (const eventId of missingIds) {
          try {
            const newReg = new Registration({
              event: eventId,
              user: userId,
              approvalStatus: 'approved' // Assume old registrations are approved
            });
            await newReg.save();
            const populated = await Registration.findById(newReg._id).populate('event');
            if (populated.event) registrations.push(populated);
          } catch (e) {
            console.error(`❌ Sync failed for Event ${eventId}:`, e.message);
          }
        }
      }
    }

    console.log(`🔍 Found ${registrations.length} total registrations for user ${userId}`);

    const formatted = registrations.map(r => {
      if (!r.event) return null;
      const evObj = r.event.toObject();
      return {
        ...evObj,
        _id: evObj._id.toString(), // Ensure _id is a string
        id: evObj._id.toString(),  // Also provide 'id' for compatibility
        registrationId: r._id,
        selectedSlot: r.selectedSlot,
        approvalStatus: r.approvalStatus
      };
    }).filter(x => x !== null);

    res.json(formatted);
  } catch (err) {
    console.error('❌ getMyRegistrations error:', err.message);
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

    // Optional: send email notification for status change
    // This could be added here later if needed

    res.json({ success: true, message: `Successfully updated ${ids.length} registrations to ${status}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.unregisterFromEvent = async (req, res) => {
  try {
    const { id } = req.params; // registrationId or eventId? Let's check the service usage.
    // In event.service.ts, unregisterFromEvent(id) sends id of the event.
    // But registrationRoutes.js is :id/register. 
    // Let's make it flexible or specific. 
    // The current service call is: this.http.delete(`${this.apiUrl}/${id}/unregister`); 
    // where apiUrl is /api/events.
    
    // I will implement it to handle eventId as that's what the frontend currently passes.
    const userId = req.userId;

    const registration = await Registration.findOneAndDelete({ event: id, user: userId });
    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    // Update Event
    await Event.findByIdAndUpdate(id, {
      $inc: { currentParticipants: -1 },
      $pull: { registeredUsers: userId }
    });

    // Update User
    await User.findByIdAndUpdate(userId, {
      $pull: { registeredEvents: id }
    });

    res.json({ message: 'Registration cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
