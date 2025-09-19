const pool = require('../utils/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

/**
 * Handles user login.
 * Expects a JSON body with 'email' and 'password'.
 * This function now also performs the email existence check.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
exports.loginUser = async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;

    // Basic validation for presence of email and password
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    connection = await pool.getConnection(); // Get a connection from the pool

    // 1. Find the user by email
    const [users] = await connection.execute(
      'SELECT id, email, password FROM surveyors WHERE email = ?',
      [email]
    );

    const user = users[0]; // Get the first user if found

    // Check if user exists (email existence check)
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials: Email not found.' });
    }

    // 2. Compare the provided password with the hashed password from the DB
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials: Incorrect password.' });
    }

    // 3. If credentials are valid, generate JWT token and return success
    const token = generateToken(user.id, user.email);
    
    res.status(200).json({ 
      message: 'Login successful!', 
      user: { 
        id: user.id, 
        email: user.email 
      },
      token: token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  } finally {
    if (connection) {
      connection.release(); // Always release the connection
    }
  }
};

// getUserProfile function has been removed from this controller
// as it is now managed solely by userProfileController.js
