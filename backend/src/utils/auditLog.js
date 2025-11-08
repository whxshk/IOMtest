const { pool } = require('../config/db');

/**
 * Log an action to the audit trail
 * Creates a tamper-evident log entry with hash chaining
 *
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.embassyId - Embassy ID (if applicable)
 * @param {string} params.action - Action being performed
 * @param {string} params.entityType - Type of entity being acted upon
 * @param {string} params.entityId - ID of entity
 * @param {Object} params.details - Additional details (will be stored as JSONB)
 * @param {string} params.ipAddress - IP address of requester
 * @param {string} params.userAgent - User agent string
 */
async function logAction({
  userId = null,
  embassyId = null,
  action,
  entityType = null,
  entityId = null,
  details = {},
  ipAddress = null,
  userAgent = null
}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert audit log entry
    // The trigger function will automatically calculate prev_hash and hash
    const result = await client.query(
      `INSERT INTO audit_logs
       (user_id, embassy_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, timestamp, hash`,
      [
        userId,
        embassyId,
        action,
        entityType,
        entityId,
        JSON.stringify(details),
        ipAddress,
        userAgent
      ]
    );

    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error logging audit entry:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify the integrity of the audit log hash chain
 * Checks that all hashes are correctly chained
 *
 * @param {number} startId - Starting audit log ID (optional)
 * @param {number} endId - Ending audit log ID (optional)
 * @returns {Object} Verification result
 */
async function verifyAuditChain(startId = null, endId = null) {
  const client = await pool.connect();

  try {
    let query = `
      SELECT id, timestamp, user_id, action, details, prev_hash, hash
      FROM audit_logs
    `;

    const conditions = [];
    const params = [];

    if (startId) {
      conditions.push(`id >= $${params.length + 1}`);
      params.push(startId);
    }

    if (endId) {
      conditions.push(`id <= $${params.length + 1}`);
      params.push(endId);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY id ASC';

    const result = await client.query(query, params);
    const logs = result.rows;

    if (logs.length === 0) {
      return { valid: true, message: 'No logs to verify', errors: [] };
    }

    const errors = [];
    const crypto = require('crypto');

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const prevLog = i > 0 ? logs[i - 1] : null;

      // Check prev_hash matches previous entry's hash
      if (i === 0) {
        if (log.prev_hash !== 'GENESIS' && startId === null) {
          // First log should have GENESIS as prev_hash (unless we're starting mid-chain)
          const actualPrev = await client.query(
            'SELECT hash FROM audit_logs WHERE id < $1 ORDER BY id DESC LIMIT 1',
            [log.id]
          );

          if (actualPrev.rows.length > 0 && log.prev_hash !== actualPrev.rows[0].hash) {
            errors.push({
              logId: log.id,
              error: 'prev_hash mismatch',
              expected: actualPrev.rows[0].hash,
              actual: log.prev_hash
            });
          }
        }
      } else {
        if (log.prev_hash !== prevLog.hash) {
          errors.push({
            logId: log.id,
            error: 'prev_hash mismatch with previous log',
            expected: prevLog.hash,
            actual: log.prev_hash
          });
        }
      }

      // Verify hash calculation
      const content = `${log.id}${log.timestamp}${log.user_id || ''}${log.action}${JSON.stringify(log.details) || ''}${log.prev_hash}`;
      const calculatedHash = crypto.createHash('sha256').update(content).digest('hex');

      if (calculatedHash !== log.hash) {
        errors.push({
          logId: log.id,
          error: 'hash calculation mismatch',
          expected: calculatedHash,
          actual: log.hash
        });
      }
    }

    return {
      valid: errors.length === 0,
      totalLogs: logs.length,
      errors: errors,
      message: errors.length === 0
        ? `Successfully verified ${logs.length} audit log entries`
        : `Found ${errors.length} integrity errors in ${logs.length} entries`
    };
  } catch (error) {
    console.error('Error verifying audit chain:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get audit logs with filtering
 *
 * @param {Object} filters - Filter parameters
 * @returns {Array} Audit log entries
 */
async function getAuditLogs(filters = {}) {
  const {
    userId,
    embassyId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = filters;

  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push(`user_id = $${params.length + 1}`);
    params.push(userId);
  }

  if (embassyId) {
    conditions.push(`embassy_id = $${params.length + 1}`);
    params.push(embassyId);
  }

  if (action) {
    conditions.push(`action = $${params.length + 1}`);
    params.push(action);
  }

  if (entityType) {
    conditions.push(`entity_type = $${params.length + 1}`);
    params.push(entityType);
  }

  if (entityId) {
    conditions.push(`entity_id = $${params.length + 1}`);
    params.push(entityId);
  }

  if (startDate) {
    conditions.push(`timestamp >= $${params.length + 1}`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`timestamp <= $${params.length + 1}`);
    params.push(endDate);
  }

  let query = `
    SELECT
      l.*,
      u.name as user_name,
      u.email as user_email,
      e.name as embassy_name
    FROM audit_logs l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN embassies e ON l.embassy_id = e.id
  `;

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Express middleware to automatically log actions
 */
function auditMiddleware(action, entityType = null) {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = async function (data) {
      // Log the action after successful response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await logAction({
            userId: req.user?.id,
            embassyId: req.user?.embassyId,
            action,
            entityType,
            entityId: req.params.id || req.params.caseId || data?.id,
            details: {
              method: req.method,
              path: req.path,
              params: req.params,
              query: req.query,
              // Don't log sensitive data like passwords
              body: sanitizeBody(req.body)
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent')
          });
        } catch (error) {
          console.error('Failed to create audit log:', error);
          // Don't fail the request if audit logging fails
        }
      }

      return originalJson(data);
    };

    next();
  };
}

/**
 * Remove sensitive fields from request body before logging
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key'];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

module.exports = {
  logAction,
  verifyAuditChain,
  getAuditLogs,
  auditMiddleware
};
