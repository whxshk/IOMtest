const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Set session parameters for Row Level Security
 * @param {string} userId - User UUID
 * @param {string} role - User role (citizen, staff, admin)
 * @param {string} embassyId - Embassy UUID (for staff users)
 */
async function setSessionContext(client, userId, role, embassyId = null) {
  try {
    await client.query(`SET LOCAL app.current_user = '${userId}'`);
    await client.query(`SET LOCAL app.current_role = '${role}'`);
    if (embassyId) {
      await client.query(`SET LOCAL app.current_embassy = '${embassyId}'`);
    }
  } catch (error) {
    console.error('Error setting session context:', error);
    throw error;
  }
}

/**
 * Get a database client from the pool with session context set
 * @param {Object} user - User object with id, role, and embassyId
 * @returns {Object} Client object
 */
async function getClientWithContext(user) {
  const client = await pool.connect();
  if (user) {
    await setSessionContext(client, user.id, user.role, user.embassyId);
  }
  return client;
}

/**
 * Execute a query with automatic context setting
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} user - User context
 */
async function query(text, params, user = null) {
  const client = await pool.connect();
  try {
    if (user) {
      await setSessionContext(client, user.id, user.role, user.embassyId);
    }
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Test database connection with retry logic
 */
async function connectDB(retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✓ Database connected successfully at:', result.rows[0].now);
      client.release();
      return true;
    } catch (error) {
      console.error(`✗ Database connection attempt ${i + 1}/${retries} failed:`, error.message);

      if (error.code === 'ECONNREFUSED') {
        console.error('');
        console.error('💡 PostgreSQL is not running. Start it with:');
        console.error('   /etc/init.d/postgresql start');
        console.error('');
      }

      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('');
        console.error('❌ Failed to connect to database after', retries, 'attempts');
        console.error('');
        throw error;
      }
    }
  }
}

/**
 * Close all database connections
 */
async function closeDB() {
  await pool.end();
  console.log('Database connections closed');
}

// Handle process termination
process.on('SIGTERM', closeDB);
process.on('SIGINT', closeDB);

module.exports = {
  pool,
  query,
  connectDB,
  closeDB,
  getClientWithContext,
  setSessionContext
};
