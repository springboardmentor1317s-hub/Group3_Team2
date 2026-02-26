const Event = require("../models/Event");
const User = require("../models/User");

// Create Event (Admin / SuperAdmin)
exports.createEvent = async (req, res) => {
    try {
        const event = new Event({
            ...req.body,
            createdBy: req.user.id
        });

        await event.save();
        res.status(201).json(event);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get All Events (Public)
exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().populate("createdBy", "name role");
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get Single Event
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        res.json(event);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update Event (Owner Admin or SuperAdmin)
exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        if (
            req.user.role !== "superadmin" &&
            event.createdBy.toString() !== req.user.id
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        Object.assign(event, req.body);
        await event.save();

        res.json(event);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        if (
            req.user.role !== "superadmin" &&
            event.createdBy.toString() !== req.user.id
        ) {
            return res.status(403).json({ message: "Not authorized" });
        }

        await event.deleteOne();
        res.json({ message: "Event deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Register for Event (Student Only)
exports.registerEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        const user = await User.findById(req.user.id);

        if (!event) return res.status(404).json({ message: "Event not found" });

        if (user.role !== "student")
            return res.status(403).json({ message: "Only students can register" });

        if (event.isPaid) {
            if (user.balance < event.price)
                return res.status(400).json({ message: "Insufficient balance" });

            user.balance -= event.price;
            await user.save();
        }

        event.participants.push(user._id);
        await event.save();

        res.json({ message: "Registered successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};