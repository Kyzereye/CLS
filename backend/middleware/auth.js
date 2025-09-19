const jwt = require('jsonwebtoken');
const pool = require('../utils/db');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required',
        code: 'MISSING_TOKEN'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Optional: Verify user still exists in database
    let connection;
    try {
      connection = await pool.getConnection();
      const [users] = await connection.execute(
        'SELECT id, email FROM surveyors WHERE id = ?',
        [decoded.userId]
      );

      if (users.length === 0) {
        return res.status(401).json({ 
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Add user info to request object
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };
      
      next();
    } finally {
      if (connection) connection.release();
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ 
      message: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Middleware to optionally authenticate (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user exists
      let connection;
      try {
        connection = await pool.getConnection();
        const [users] = await connection.execute(
          'SELECT id, email FROM surveyors WHERE id = ?',
          [decoded.userId]
        );

        if (users.length > 0) {
          req.user = {
            id: decoded.userId,
            email: decoded.email
          };
        }
      } finally {
        if (connection) connection.release();
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
};

/**
 * Generate JWT token for user
 */
const generateToken = (userId, email) => {
  const payload = {
    userId: userId,
    email: email
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: process.env.JWT_ISSUER || 'cls-app',
    audience: process.env.JWT_AUDIENCE || 'cls-users'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Middleware to check if user owns the resource (for user-specific endpoints)
 */
const checkResourceOwnership = (req, res, next) => {
  const userIdFromToken = req.user?.id;
  const userIdFromParams = parseInt(req.params.id);

  if (userIdFromToken !== userIdFromParams) {
    return res.status(403).json({ 
      message: 'Access denied: You can only access your own resources',
      code: 'ACCESS_DENIED'
    });
  }

  next();
};

/**
 * Middleware to check if user is authenticated and owns the resource
 */
const authenticateAndOwnResource = [authenticateToken, checkResourceOwnership];

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  checkResourceOwnership,
  authenticateAndOwnResource
};

