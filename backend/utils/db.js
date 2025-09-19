const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file

// Create a connection pool for efficient database connections
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'CSL', // Your database name
  waitForConnections: true,
  connectionLimit: 10, // Adjust as needed
  queueLimit: 0
});

// Test the connection when the pool is created
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to MySQL database!');
    connection.release(); // Release the connection immediately after testing
  })
  .catch(err => {
    console.error('Error connecting to MySQL database:', err.message);
    process.exit(1); // Exit the process if unable to connect
  });

module.exports = pool;
