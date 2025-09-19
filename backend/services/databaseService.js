const pool = require('../utils/db');

/**
 * Database service class to handle all database operations
 * Provides a clean interface and reduces code duplication
 */
class DatabaseService {
  /**
   * Execute a query with parameters
   * @param {string} query - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  static async executeQuery(query, params = []) {
    let connection;
    try {
      connection = await pool.getConnection();
      const [results] = await connection.execute(query, params);
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Execute a query within a transaction
   * @param {Function} callback - Function that receives a connection and should return a result
   * @returns {Promise<any>} Result from the callback function
   */
  static async executeTransaction(callback) {
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Transaction error:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * Get a single record by ID from a table
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @param {Array} columns - Columns to select (optional, defaults to *)
   * @returns {Promise<Object|null>} Record or null if not found
   */
  static async findById(table, id, columns = ['*']) {
    const columnStr = columns.join(', ');
    const query = `SELECT ${columnStr} FROM ${table} WHERE id = ?`;
    const results = await this.executeQuery(query, [id]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get records by a specific field value
   * @param {string} table - Table name
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @param {Array} columns - Columns to select (optional, defaults to *)
   * @returns {Promise<Array>} Matching records
   */
  static async findByField(table, field, value, columns = ['*']) {
    const columnStr = columns.join(', ');
    const query = `SELECT ${columnStr} FROM ${table} WHERE ${field} = ?`;
    return await this.executeQuery(query, [value]);
  }

  /**
   * Insert a new record
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Insert result with insertId
   */
  static async insert(table, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
    const [result] = await this.executeQuery(query, values);
    return result;
  }

  /**
   * Update a record by ID
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Update result with affectedRows
   */
  static async updateById(table, id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const [result] = await this.executeQuery(query, [...values, id]);
    return result;
  }

  /**
   * Delete a record by ID
   * @param {string} table - Table name
   * @param {number} id - Record ID
   * @returns {Promise<Object>} Delete result with affectedRows
   */
  static async deleteById(table, id) {
    const query = `DELETE FROM ${table} WHERE id = ?`;
    const [result] = await this.executeQuery(query, [id]);
    return result;
  }

  /**
   * Check if a record exists by field value
   * @param {string} table - Table name
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @returns {Promise<boolean>} True if record exists
   */
  static async existsByField(table, field, value) {
    const query = `SELECT 1 FROM ${table} WHERE ${field} = ? LIMIT 1`;
    const results = await this.executeQuery(query, [value]);
    return results.length > 0;
  }

  /**
   * Get paginated results
   * @param {string} table - Table name
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Records per page
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Paginated results with metadata
   */
  static async paginate(table, page = 1, limit = 10, options = {}) {
    const { where, orderBy, columns = ['*'] } = options;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (where) {
      const conditions = Object.keys(where).map(field => `${field} = ?`);
      whereClause = `WHERE ${conditions.join(' AND ')}`;
      params = Object.values(where);
    }
    
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    const columnStr = columns.join(', ');
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`;
    const countResult = await this.executeQuery(countQuery, params);
    const total = countResult[0].total;
    
    // Get paginated data
    const dataQuery = `SELECT ${columnStr} FROM ${table} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const data = await this.executeQuery(dataQuery, [...params, limit, offset]);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Batch insert multiple records
   * @param {string} table - Table name
   * @param {Array} records - Array of record objects
   * @returns {Promise<Object>} Insert result
   */
  static async batchInsert(table, records) {
    if (!records || records.length === 0) {
      return { affectedRows: 0, insertId: null };
    }

    const fields = Object.keys(records[0]);
    const values = records.map(record => Object.values(record));
    const placeholders = fields.map(() => '?').join(', ');
    
    const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES ?`;
    const [result] = await this.executeQuery(query, [values]);
    return result;
  }
}

module.exports = DatabaseService;

