const pool = require('../utils/db');
const bcrypt = require('bcryptjs');

/**
 * Handles fetching a single user's profile details by ID.
 * This includes their basic information, associated services, and counties.
 * @param {object} req - The Express request object (expects req.params.id).
 * @param {object} res - The Express response object.
 */
exports.getUserProfile = async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    connection = await pool.getConnection();

    // Fetch basic surveyor info
    const [surveyorRows] = await connection.execute(
      `SELECT id, first_name, last_name, company_name, email, phone, address, town, state, zip_code
       FROM surveyors
       WHERE id = ?`,
      [userId]
    );

    if (surveyorRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const surveyor = surveyorRows[0];

    // --- FETCH SUBCATEGORIES (SERVICES PROVIDED) ---
    // This query gets both the subcategory name and its main category name.
    // We'll process this to get `services_provided` (main categories) and `subservices_provided`.
    const [subserviceRecords] = await connection.execute(
      `SELECT
          ssc.name AS subservice_name,
          sc.name AS main_service_category_name
       FROM
          surveyors_services ss
       JOIN
          service_subcategories ssc ON ss.subcategory_id = ssc.id
       JOIN
          service_categories sc ON ssc.category_id = sc.id
       WHERE
          ss.surveyor_id = ?
       ORDER BY
          sc.name, ssc.name`,
      [userId]
    );

    // Process the fetched subservice records into two arrays for the frontend:
    // 1. `services_provided`: Distinct main category names
    // 2. `subservices_provided`: All selected subservice names
    const servicesProvided = new Set(); // Use a Set to store unique main categories
    const subservicesProvided = [];

    subserviceRecords.forEach(row => {
      servicesProvided.add(row.main_service_category_name);
      subservicesProvided.push(row.subservice_name);
    });


    // --- FETCH COUNTIES PROVIDED ---
    const [countiesRows] = await connection.execute(
      `SELECT c.name AS county_name
       FROM counties c
       JOIN surveyors_counties sc ON c.id = sc.county_id
       WHERE sc.surveyor_id = ?
       ORDER BY c.name`,
      [userId]
    );
    const countiesProvided = countiesRows.map(row => row.county_name); // Map to just names


    // --- CONSTRUCT THE FINAL RESPONSE ---
    res.status(200).json({
      id: surveyor.id,
      first_name: surveyor.first_name,
      last_name: surveyor.last_name,
      company_name: surveyor.company_name,
      email: surveyor.email,
      phone: surveyor.phone,
      address: surveyor.address,
      town: surveyor.town,
      state: surveyor.state,
      zip_code: surveyor.zip_code,
      services_provided: Array.from(servicesProvided), // Convert Set to Array for response
      subservices_provided: subservicesProvided,
      counties_provided: countiesProvided
    });

  } catch (error) {
    console.error('Get User Profile error:', error);
    res.status(500).json({ message: 'Server error fetching user profile.', error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Updates basic user information in the 'surveyors' table.
 * Expects a JSON body with firstName, lastName, companyName, email, phone, address, city, state, zipCode.
 * @param {object} req - The Express request object (expects req.params.id and req.body).
 * @param {object} res - The Express response object.
 */
exports.updateUserInfo = async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    const { firstName, lastName, companyName, email, phone, address, city, state, zipCode } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `UPDATE surveyors
       SET first_name = ?, last_name = ?, company_name = ?, email = ?,
           phone = ?, address = ?, town = ?, state = ?, zip_code = ?
       WHERE id = ?`,
      [firstName, lastName, companyName || null, email, phone || null, address, city, state, zipCode, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found or no changes made.' });
    }

    await connection.commit();
    res.status(200).json({ message: 'User information updated successfully.' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update User Info error:', error);
    res.status(500).json({ message: 'Server error updating user information.', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Handles changing a user's password.
 * Expects currentPassword and newPassword in the request body.
 * @param {object} req - The Express request object (expects req.params.id and req.body).
 * @param {object} res - The Express response object.
 */
exports.changeUserPassword = async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'User ID, current password, and new password are required.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Fetch current hashed password from DB
    const [userRows] = await connection.execute(
      'SELECT password FROM surveyors WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found.' });
    }

    const hashedPassword = userRows[0].password;

    // 2. Compare currentPassword with stored hashed password
    const isMatch = await bcrypt.compare(currentPassword, hashedPassword);
    if (!isMatch) {
      await connection.rollback();
      return res.status(401).json({ message: 'Incorrect current password.' });
    }

    // 3. Hash the new password
    const newHashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));

    // 4. Update the password in the database
    const [result] = await connection.execute(
      'UPDATE surveyors SET password = ? WHERE id = ?',
      [newHashedPassword, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(500).json({ message: 'Password update failed. No rows affected.' });
    }

    await connection.commit();
    res.status(200).json({ message: 'Password updated successfully.' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Change Password error:', error);
    res.status(500).json({ message: 'Server error changing password.', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Updates the services and subservices provided by a user.
 * Expects mainServices (array of names) and subservices (array of names) in the request body.
 * This function will clear existing services/subservices for the user and re-insert them.
 * @param {object} req - The Express request object (expects req.params.id and req.body).
 * @param {object} res - The Express response object.
 */
exports.updateUserServices = async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    const { mainServices, subservices } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute('DELETE FROM surveyors_services WHERE surveyor_id = ?', [userId]);

    let subcategoryIds = [];
    if (subservices && subservices.length > 0) {
      const placeholders = subservices.map(() => '?').join(',');
      const [rows] = await connection.execute(
        `SELECT id FROM service_subcategories WHERE name IN (${placeholders})`,
        subservices
      );
      subcategoryIds = rows.map(row => row.id);
    }

    if (subcategoryIds.length > 0) {
      const subcategoryInserts = subcategoryIds.map(subcategoryId => [userId, subcategoryId]);
      await connection.query(
        `INSERT INTO surveyors_services (surveyor_id, subcategory_id) VALUES ?`,
        [subcategoryInserts]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'User services updated successfully.' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update User Services error:', error);
    res.status(500).json({ message: 'Server error updating user services.', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Updates the service areas (counties) for a user.
 * Expects counties (array of names) in the request body.
 * This function will clear existing counties for the user and re-insert them.
 * @param {object} req - The Express request object (expects req.params.id and req.body).
 * @param {object} res - The Express response object.
 */
exports.updateUserServiceAreas = async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;
    const { counties } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute('DELETE FROM surveyors_counties WHERE surveyor_id = ?', [userId]);

    let countyIds = [];
    if (counties && counties.length > 0) {
      const placeholders = counties.map(() => '?').join(',');
      const [rows] = await connection.execute(
        `SELECT id FROM counties WHERE name IN (${placeholders})`,
        counties
      );
      countyIds = rows.map(row => row.id);
    }

    if (countyIds.length > 0) {
      const countyInserts = countyIds.map(countyId => [userId, countyId]);
      await connection.query(
        `INSERT INTO surveyors_counties (surveyor_id, county_id) VALUES ?`,
        [countyInserts]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'User service areas updated successfully.' });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Update User Service Areas error:', error);
    res.status(500).json({ message: 'Server error updating user service areas.', error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// This is the function you provided that needed to be exported
exports.deleteUser = async (req, res) => {
  let connection;
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute('DELETE FROM surveyors_services WHERE surveyor_id = ?', [userId]);
    await connection.execute('DELETE FROM surveyors_counties WHERE surveyor_id = ?', [userId]);

    const [result] = await connection.execute(
      'DELETE FROM surveyors WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'User not found or already deleted.' });
    }

    await connection.commit();
    res.status(200).json({ message: 'User account deleted successfully.' });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Delete User error:', error);
    res.status(500).json({ message: 'Server error deleting user account.', error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};