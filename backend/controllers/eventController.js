const Event = require("../models/Event");

// Create Event (College Admin only)
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      start_date,
      end_date
    } = req.body;

    const event = new Event({
      college_id: req.user.id,  // taken from authMiddleware
      title,
      description,
      category,
      location,
      start_date,
      end_date
    });

    const savedEvent = await event.save();

    res.status(201).json({
      message: "Event created successfully",
      event: savedEvent
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Get Events (with filters)
exports.getEvents = async (req, res) => {
  try {
    const { category, college, start_date } = req.query;

    let filter = {};

    if (category) filter.category = category;
    if (college) filter.college_id = college;
    if (start_date)
      filter.start_date = { $gte: new Date(start_date) };

    const events = await Event.find(filter)
      .populate("college_id", "name college");

    res.json(events);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};