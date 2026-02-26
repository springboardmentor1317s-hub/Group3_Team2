const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const auth = require("../middleware/authMiddleware");
const role = require("../middleware/roleMiddleware");

// Public
router.get("/", eventController.getAllEvents);
router.get("/:id", eventController.getEventById);

// Admin / SuperAdmin
router.post(
    "/create",
    auth,
    role(["admin", "superadmin"]),
    eventController.createEvent
);

router.put(
    "/:id",
    auth,
    role(["admin", "superadmin"]),
    eventController.updateEvent
);

router.delete(
    "/:id",
    auth,
    role(["admin", "superadmin"]),
    eventController.deleteEvent
);

// Student Registration
router.post(
    "/register/:id",
    auth,
    role(["student"]),
    eventController.registerEvent
);

module.exports = router;