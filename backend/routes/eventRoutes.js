const express = require("express");
const router = express.Router();

const { createEvent, getEvents } = require("../controllers/eventController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");

router.post(
  "/create-event",
  authMiddleware,
  roleMiddleware(["college-admin"]),
  // createEventController,
  createEvent
);

router.get(
  "/",
  authMiddleware,
  getEvents
);

module.exports = router;