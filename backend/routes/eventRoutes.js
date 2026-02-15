const { authMiddleware } = require("../middleware/authMiddleware");
const { roleMiddleware } = require("../middleware/roleMiddleware");

router.post(
  "/create-event",
  authMiddleware,
  roleMiddleware("college-admin"),
  createEventController
);
