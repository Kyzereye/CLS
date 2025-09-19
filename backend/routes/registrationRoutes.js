const express = require('express');
const { registerUser } = require('../controllers/registrationController');
const { validateRegistration } = require('../middleware/validation');

const router = express.Router();

// Define the POST route for user registration with validation
router.post('/register-user', validateRegistration, registerUser);

module.exports = router;

