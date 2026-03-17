const express = require('express');
const router = express.Router();
const Event = require('../models/event');
//const eventController = require('../controllers/eventController');
//const AdminLog = require('../models/AdminLog');
//const auth = require('../middleware/authMiddleware');

//router.post('/create', eventController.createEvent);
//router.get('/', eventController.getAllEvents);
//router.delete('/:id', eventController.deleteEvent);


/*router.post("/", auth, async (req, res) => {
    try {
        const event = new Event({
            ...req.body,
            created_by: req.user.id
        });

        await event.save();

        await AdminLog.create({
            action: "Created Event",
            created_by: req.user.id,
            event_id: event._id
        });

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/", async (req, res) => {
    const events = await Event.find().populate("created_by", "name email role");
    res.json(events);
});*/

// create event (requires login)
/*router.post('/', auth, async (req, res) => {
    try {
        const data = { ...req.body, created_by: req.user._id };
        const ev = new Event(data);
        await ev.save();
        res.json(ev);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
});

//list events (public)
router.get('/', async (req, res) => {
    const events = (await Event.find()).sort({ start_date: 1 });
    res.json(events);
});

//get single
router.get('/:id', async (req, res) => {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Not found" });
    res.json(ev);
});

//update (only creator or admin in extended impl)
router.put('/:id', auth, async (req, res) => {
    const ev = await Event.findById(req.params.id);
    if (!ev) return res.status(404).json({ message: "Not found" });
    //simple ownership check
    if (ev.created_by && ev.created_by.toString() !== req.user._id.toString() && req.user.role !== "super_admin") {
        return res.status(403).json({ message: "Not allowed" });
    }
    Object.assign(ev, req.body);
    await ev.save();
    res.json(ev);
});*/

router.post('/create', async(req, res) => {
    const event = new Event(req.body);
    const result = await event.save();
    res.send(result);
});

router.get('/list', async(req, res) => {
    const events = await Event.find();
    res.send(events);
});

module.exports = router;