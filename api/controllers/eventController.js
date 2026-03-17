const Event = require('../models/event');
//const AdminLog = require('../models/adminLog');

// Create Event
exports.createEvent = async (req, res) => {
    try {

        /*if (!req.body || Object.keys(req.body).length === 0){
            return res.status(400).json({ message: "Request body is empty" });
        }*/
       console.log("Incoming Data:", req.body);

        const {
            title,
            description,
            startDate,
            endDate,
            category,
            location,
            college,
            maxParticipants,
            imageUrl,
        
        } = req.body;

        const newEvent = new Event({
            title,
            description,
            startDate,
            endDate,
            category,
            location,
            college,
            maxParticipants,
            imageUrl,
            
        });

        const savedEvent = await newEvent.save();

        

        const log = new AdminLog({
            action: 'Created event: ${savedEvent.title}',
            user_id: req.body.college_id,
            timestamp: new Date()
        });
        await log.save();
        res.status(201).json(savedEvent);

    }catch (error) {
        console.error("Create Event Error:", error);
        res.status(500).json({ message: error.message });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find();
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const id = req.params.id;
        const deletedEvent = await Event.findByIdAndDelete(id);

        if (!deletedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {

        res.status(500).json({ message: error.message });
    }
};