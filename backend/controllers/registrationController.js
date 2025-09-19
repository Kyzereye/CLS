const bcrypt = require('bcryptjs'); // Ensure this is installed: npm install bcryptjs
const pool = require('../utils/db'); // Import the database connection pool

// Helper function to hash password (uses bcryptjs)
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10); // Generate a salt with 10 rounds
  const hashedPassword = await bcrypt.hash(password, salt); // Hash the password
  return hashedPassword;
};

/**
 * Handles user registration.
 * Expects a JSON body with name, companyName, email, password, confirmPassword,
 * phone, address, city, state, zipCode.
 * ServicesProvided and subservicesProvided are now handled post-registration.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 */
exports.registerUser = async (req, res) => {
  let connection; // Declare connection outside try-catch for finally block
  try {
    const {
      firstName,
      lastName,
      companyName,
      email,
      password,
      confirmPassword,
      phone,
      address,
      city,
      state,
      zipCode,
      // Removed: servicesProvided and subservicesProvided from destructuring
    } = req.body;

    // --- 1. Basic Validation ---
    // Removed validation for servicesProvided and subservicesProvided
    if (!email || !password || !confirmPassword || !firstName || !lastName || !address || !city || !state || !zipCode) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    connection = await pool.getConnection(); // Get a connection from the pool
    await connection.beginTransaction(); // Start a transaction

    // --- 2. Check if user already exists in the database by email ---
    const [existingUsers] = await connection.execute(
      'SELECT id FROM surveyors WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback(); // Rollback if user exists
      return res.status(409).json({ message: 'User with that email already exists.' });
    }

    // --- 3. Hash Password ---
    const hashedPassword = await hashPassword(password);

    // --- 4. Insert New Surveyor into 'surveyors' table ---
    const [surveyorResult] = await connection.execute(
      `INSERT INTO surveyors (first_name, last_name, address, town, state, zip_code, phone, email, password, company_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // Added company_name to insert fields
      [firstName, lastName, address, city, state, zipCode, phone, email, hashedPassword, companyName || null] // Added companyName
    );
    const surveyorId = surveyorResult.insertId; // Get the ID of the newly inserted surveyor

    // Removed: 5. Insert Subservices Provided into 'surveyors_services' table ---
    // if (subservicesProvided && subservicesProvided.length > 0) { ... }

    // --- 6. Insert Default Counties: Boulder, Broomfield, Gilpin into 'surveyors_counties' table ---
    const defaultCountyNames = ['Boulder', 'Broomfield', 'Gilpin'];

    // Fetch the IDs of these default counties from the 'counties' table
    const [defaultCounties] = await connection.execute(
      `SELECT id, name FROM counties WHERE name IN (?, ?, ?)`,
      defaultCountyNames
    );

    // Prepare data for batch insert into 'surveyors_counties'
    const surveyorCountiesInserts = defaultCounties.map(county => [surveyorId, county.id]);

    if (surveyorCountiesInserts.length > 0) {
      await connection.query(
        `INSERT INTO surveyors_counties (surveyor_id, county_id) VALUES ?`,
        [surveyorCountiesInserts]
      );
    } else {
      console.warn('Could not find default counties (Boulder, Broomfield, Gilpin) in the database. No counties assigned.');
    }

    await connection.commit(); // Commit the transaction if all operations succeed

    // --- 7. Send Success Response ---
    res.status(201).json({
      message: 'User registered successfully!',
      user: {
        id: surveyorId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        companyName: companyName
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback(); // Rollback transaction on error
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  } finally {
    if (connection) {
      connection.release(); // Always release the connection
    }
  }
};
