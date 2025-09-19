const express = require('express');
const { loginUser } = require('../controllers/authController');
const { validateLogin } = require('../middleware/validation');

const router = express.Router();

// Define the POST route for user login with validation
router.post('/login', validateLogin, loginUser);

// The /check-email route has been removed as its functionality is now
// integrated into the /login endpoint.
// router.post('/check-email', checkEmailExists);

module.exports = router;
