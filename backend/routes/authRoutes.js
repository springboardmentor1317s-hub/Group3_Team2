const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const {
  registerValidation,
  loginValidation
} = require("../middleware/validation");

router.post("/register", registerValidation, authController.registerUser);
router.post("/login", loginValidation, authController.loginUser);

module.exports = router;
