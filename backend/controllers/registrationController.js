const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');

// POST /api/events/:eventId/register
exports.registerForEvent = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.userId;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check duplicate in Registration model
        const existingReg = await Registration.findOne({ event_id: eventId, user_id: userId });
        if (existingReg) {
            return res.status(400).json({ message: 'Already registered' });
        }

        if (event.currentParticipants >= event.maxParticipants) {
            return res.status(400).json({ message: 'Event is full' });
        }
        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Registration deadline passed' });
        }

        // Create the registration record
        const registration = new Registration({
            event_id: eventId,
            user_id: userId,
            status: 'pending' // default status
        });
        await registration.save();

        // Update event and user collections to preserve compatibility with existing frontend
        event.registeredUsers.push(userId);
        event.currentParticipants += 1;
        await event.save();
        await User.findByIdAndUpdate(userId, { $addToSet: { registeredEvents: event._id.toString() } });

        res.json({ message: `Registered for "${event.title}" successfully`, registration });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/events/:eventId/unregister
exports.unregisterFromEvent = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.userId;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const registration = await Registration.findOneAndDelete({ event_id: eventId, user_id: userId });
        if (!registration) {
            return res.status(400).json({ message: 'Not registered' });
        }

        // Update event and user collections to preserve compatibility with existing frontend
        const idx = event.registeredUsers.map(String).indexOf(String(userId));
        if (idx !== -1) {
            event.registeredUsers.splice(idx, 1);
            event.currentParticipants = Math.max(0, event.currentParticipants - 1);
            await event.save();
        }
        await User.findByIdAndUpdate(userId, { $pull: { registeredEvents: eventId.toString() } });

        res.json({ message: `Unregistered from "${event.title}" successfully` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/events/my/registrations
exports.getMyRegistrations = async (req, res) => {
    try {
        const userId = req.userId;
        // Find all registrations for this user
        const registrations = await Registration.find({ user_id: userId }).populate('event_id');

        // Extract populated events 
        const events = registrations.map(reg => reg.event_id).filter(e => e != null);
        res.json(events); // Frontend expects an array of Event objects
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
