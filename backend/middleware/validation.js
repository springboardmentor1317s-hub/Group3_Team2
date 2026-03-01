const { body } = require("express-validator");

exports.registerValidation = [
  body("fullName").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email required"),
  body("college").notEmpty().withMessage("College is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .isIn(["student", "college-admin", "super-admin"])
    .withMessage("Invalid role selected")
];

exports.loginValidation = [
  body("email").isEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required")
];
