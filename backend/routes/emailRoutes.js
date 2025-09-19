const express = require('express');
const { sendEmail } = require('../controllers/emailController');
const { validateEmail } = require('../middleware/validation');

const router = express.Router();

router.post('/send-email', validateEmail, sendEmail);

module.exports = router;