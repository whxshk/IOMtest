const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const { getAuditLogs, verifyAuditChain } = require('../utils/auditLog');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/v1/admin/metrics
 * Get dashboard metrics
 */
router.get('/metrics', requireAdmin, async (req, res) => {
  try {
    // Get overall statistics
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM cases) as total_cases,
        (SELECT COUNT(*) FROM cases WHERE status = 'Submitted') as submitted_cases,
        (SELECT COUNT(*) FROM cases WHERE status = 'In Progress') as in_progress_cases,
        (SELECT COUNT(*) FROM cases WHERE status = 'Resolved') as resolved_cases,
        (SELECT COUNT(*) FROM cases WHERE urgency IN ('High', 'Critical')) as urgent_cases,
        (SELECT COUNT(*) FROM users WHERE role = 'citizen') as total_citizens,
        (SELECT COUNT(*) FROM users WHERE role = 'staff') as total_staff,
        (SELECT COUNT(*) FROM embassies) as total_embassies,
        (SELECT COUNT(*) FROM assistance_requests WHERE status = 'pending') as pending_assistance_requests
    `);

    // Get case distribution by type
    const casesByType = await query(`
      SELECT case_type, COUNT(*) as count
      FROM cases
      GROUP BY case_type
      ORDER BY count DESC
    `);

    // Get embassy statistics
    const embassyStats = await query(`
      SELECT * FROM embassy_case_stats
      ORDER BY total_cases DESC
      LIMIT 10
    `);

    // Get recent activity (last 24 hours)
    const recentActivity = await query(`
      SELECT
        action,
        COUNT(*) as count
      FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY action
      ORDER BY count DESC
    `);

    // Average resolution time
    const resolutionTime = await query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) as avg_hours
      FROM cases
      WHERE resolved_at IS NOT NULL
    `);

    res.json({
      success: true,
      metrics: {
        overview: stats.rows[0],
        casesByType: casesByType.rows,
        topEmbassies: embassyStats.rows,
        recentActivity: recentActivity.rows,
        averageResolutionHours: parseFloat(resolutionTime.rows[0].avg_hours || 0).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/admin/audit-logs
 * Get audit logs with filtering
 */
router.get('/audit-logs', requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      embassyId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;

    const logs = await getAuditLogs({
      userId,
      embassyId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM audit_logs',
      []
    );

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/admin/audit-logs/verify
 * Verify audit log chain integrity
 */
router.get('/audit-logs/verify', requireAdmin, async (req, res) => {
  try {
    const { startId, endId } = req.query;

    const verification = await verifyAuditChain(
      startId ? parseInt(startId) : null,
      endId ? parseInt(endId) : null
    );

    res.json({
      success: true,
      verification
    });

  } catch (error) {
    console.error('Error verifying audit chain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/admin/embassies
 * List all embassies
 */
router.get('/embassies', requireAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        e.*,
        (SELECT COUNT(*) FROM users WHERE embassy_id = e.id AND role = 'staff') as staff_count,
        (SELECT COUNT(*) FROM cases WHERE primary_embassy_id = e.id) as case_count
      FROM embassies e
      ORDER BY e.country, e.name
    `);

    res.json({
      success: true,
      embassies: result.rows
    });

  } catch (error) {
    console.error('Error fetching embassies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/admin/embassies
 * Create new embassy
 */
router.post('/embassies', requireAdmin, async (req, res) => {
  try {
    const {
      country,
      name,
      region,
      contactEmail,
      contactPhone,
      address
    } = req.body;

    if (!country || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['country', 'name']
      });
    }

    const embassyId = uuidv4();

    const result = await query(
      `INSERT INTO embassies
       (id, country, name, region, contact_email, contact_phone, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [embassyId, country, name, region, contactEmail, contactPhone, address]
    );

    res.status(201).json({
      success: true,
      embassy: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating embassy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/admin/staff
 * Create new staff user
 */
router.post('/staff', requireAdmin, async (req, res) => {
  try {
    const {
      embassyId,
      name,
      email,
      password,
      phone,
      preferredLanguage = 'en'
    } = req.body;

    if (!embassyId || !name || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['embassyId', 'name', 'email', 'password']
      });
    }

    // Check if email already exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const userId = uuidv4();

    const result = await query(
      `INSERT INTO users
       (id, embassy_id, role, name, email, phone, password_hash, preferred_language)
       VALUES ($1, $2, 'staff', $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, embassy_id, preferred_language`,
      [userId, embassyId, name, email.toLowerCase(), phone, passwordHash, preferredLanguage]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating staff user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/admin/users
 * List all users
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { role, embassyId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (role) {
      conditions.push(`u.role = $${params.length + 1}`);
      params.push(role);
    }

    if (embassyId) {
      conditions.push(`u.embassy_id = $${params.length + 1}`);
      params.push(embassyId);
    }

    let queryText = `
      SELECT
        u.id, u.name, u.email, u.phone, u.role, u.is_active,
        u.nationality, u.preferred_language, u.last_login, u.created_at,
        e.name as embassy_name, e.country as embassy_country
      FROM users u
      LEFT JOIN embassies e ON u.embassy_id = e.id
    `;

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    res.json({
      success: true,
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/admin/users/:userId
 * Update user (activate/deactivate, etc.)
 */
router.put('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, role, embassyId } = req.body;

    const updates = [];
    const params = [userId];
    let paramIndex = 2;

    if (typeof isActive === 'boolean') {
      updates.push(`is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (role) {
      updates.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (embassyId !== undefined) {
      updates.push(`embassy_id = $${paramIndex}`);
      params.push(embassyId);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
