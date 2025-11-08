const express = require('express');
const router = express.Router();
const { query, getClientWithContext } = require('../config/db');
const { requireUser, requireStaff, requireCitizen } = require('../middleware/auth');
const { logAction } = require('../utils/auditLog');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/v1/cases
 * Create a new case (citizen only)
 */
router.post('/', requireCitizen, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      caseType,
      description,
      urgency = 'Normal',
      metadata = {}
    } = req.body;

    // Validation
    if (!caseType || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['caseType', 'description']
      });
    }

    // Get user's nationality to determine primary embassy
    const userResult = await query(
      'SELECT nationality FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const nationality = userResult.rows[0].nationality;

    // Find embassy for user's nationality
    const embassyResult = await query(
      'SELECT id FROM embassies WHERE country = $1 LIMIT 1',
      [nationality]
    );

    if (embassyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'No embassy found for your nationality',
        nationality
      });
    }

    const primaryEmbassyId = embassyResult.rows[0].id;
    const caseId = uuidv4();

    // Calculate SLA deadline based on urgency
    let slaDays = 5; // Normal
    if (urgency === 'High') slaDays = 2;
    if (urgency === 'Critical') slaDays = 1;
    if (urgency === 'Low') slaDays = 10;

    // Insert case
    const result = await query(
      `INSERT INTO cases
       (id, user_id, primary_embassy_id, case_type, description, status, urgency, metadata, sla_deadline)
       VALUES ($1, $2, $3, $4, $5, 'Submitted', $6, $7, NOW() + INTERVAL '${slaDays} days')
       RETURNING *`,
      [caseId, userId, primaryEmbassyId, caseType, description, urgency, JSON.stringify(metadata)]
    );

    const newCase = result.rows[0];

    // Create initial case update
    await query(
      `INSERT INTO case_updates
       (case_id, author_id, message, status_change, is_public)
       VALUES ($1, $2, $3, $4, true)`,
      [caseId, userId, 'Case submitted successfully. Our team will review and respond shortly.', 'Created -> Submitted']
    );

    // Log action
    await logAction({
      userId,
      embassyId: primaryEmbassyId,
      action: 'CASE_CREATED',
      entityType: 'CASE',
      entityId: caseId,
      details: { caseType, urgency },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      case: {
        id: newCase.id,
        caseNumber: newCase.case_number,
        status: newCase.status,
        urgency: newCase.urgency,
        createdAt: newCase.created_at,
        slaDeadline: newCase.sla_deadline
      }
    });

  } catch (error) {
    console.error('Error creating case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/cases
 * List cases (filtered by role)
 */
router.get('/', requireUser, async (req, res) => {
  try {
    const { status, urgency, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    // Role-based filtering
    if (req.user.role === 'citizen') {
      conditions.push(`user_id = $${params.length + 1}`);
      params.push(req.user.id);
    } else if (req.user.role === 'staff') {
      conditions.push(`(primary_embassy_id = $${params.length + 1} OR assisting_embassy_id = $${params.length + 1})`);
      params.push(req.user.embassyId);
    }
    // Admin sees all cases

    // Additional filters
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (urgency) {
      conditions.push(`urgency = $${params.length + 1}`);
      params.push(urgency);
    }

    if (type) {
      conditions.push(`case_type = $${params.length + 1}`);
      params.push(type);
    }

    let queryText = `
      SELECT
        c.*,
        u.name as citizen_name,
        u.email as citizen_email,
        pe.name as primary_embassy_name,
        ae.name as assisting_embassy_name
      FROM cases c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN embassies pe ON c.primary_embassy_id = pe.id
      LEFT JOIN embassies ae ON c.assisting_embassy_id = ae.id
    `;

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY
      CASE
        WHEN c.urgency = 'Critical' THEN 1
        WHEN c.urgency = 'High' THEN 2
        WHEN c.urgency = 'Normal' THEN 3
        WHEN c.urgency = 'Low' THEN 4
      END,
      c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    params.push(limit, offset);

    const result = await query(queryText, params, req.user);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM cases';
    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }
    const countResult = await query(countQuery, params.slice(0, -2), req.user);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      cases: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/cases/:caseId
 * Get case details
 */
router.get('/:caseId', requireUser, async (req, res) => {
  try {
    const { caseId } = req.params;

    const result = await query(
      `SELECT
        c.*,
        u.name as citizen_name,
        u.email as citizen_email,
        u.phone as citizen_phone,
        pe.name as primary_embassy_name,
        ae.name as assisting_embassy_name
      FROM cases c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN embassies pe ON c.primary_embassy_id = pe.id
      LEFT JOIN embassies ae ON c.assisting_embassy_id = ae.id
      WHERE c.id = $1`,
      [caseId],
      req.user
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found or access denied' });
    }

    const caseData = result.rows[0];

    // Get case updates
    const updatesResult = await query(
      `SELECT
        cu.*,
        u.name as author_name
      FROM case_updates cu
      LEFT JOIN users u ON cu.author_id = u.id
      WHERE cu.case_id = $1
      ${req.user.role === 'citizen' ? 'AND cu.is_public = true' : ''}
      ORDER BY cu.created_at DESC`,
      [caseId],
      req.user
    );

    res.json({
      success: true,
      case: caseData,
      updates: updatesResult.rows
    });

  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/cases/:caseId
 * Update case (staff only)
 */
router.put('/:caseId', requireStaff, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { status, resolutionNotes, metadata } = req.body;

    // Verify case belongs to this embassy
    const caseCheck = await query(
      'SELECT * FROM cases WHERE id = $1',
      [caseId],
      req.user
    );

    if (caseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found or access denied' });
    }

    const currentCase = caseCheck.rows[0];
    const updates = [];
    const params = [caseId];
    let paramIndex = 2;

    if (status) {
      updates.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (resolutionNotes) {
      updates.push(`resolution_notes = $${paramIndex}`);
      params.push(resolutionNotes);
      paramIndex++;
    }

    if (metadata) {
      updates.push(`metadata = $${paramIndex}`);
      params.push(JSON.stringify(metadata));
      paramIndex++;
    }

    if (status === 'Resolved') {
      updates.push('resolved_at = NOW()');
    }

    updates.push('updated_at = NOW()');

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await query(
      `UPDATE cases SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      params,
      req.user
    );

    const updatedCase = result.rows[0];

    // Create case update entry
    if (status && status !== currentCase.status) {
      await query(
        `INSERT INTO case_updates
         (case_id, author_id, message, status_change, is_public)
         VALUES ($1, $2, $3, $4, true)`,
        [
          caseId,
          req.user.id,
          `Case status updated to ${status}${resolutionNotes ? '. ' + resolutionNotes : ''}`,
          `${currentCase.status} -> ${status}`
        ]
      );
    }

    // Log action
    await logAction({
      userId: req.user.id,
      embassyId: req.user.embassyId,
      action: 'CASE_UPDATED',
      entityType: 'CASE',
      entityId: caseId,
      details: { status, previousStatus: currentCase.status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      case: updatedCase
    });

  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/cases/:caseId/notes
 * Add a note/update to a case
 */
router.post('/:caseId/notes', requireStaff, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { message, isPublic = false } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify access to case
    const caseCheck = await query(
      'SELECT id FROM cases WHERE id = $1',
      [caseId],
      req.user
    );

    if (caseCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found or access denied' });
    }

    const result = await query(
      `INSERT INTO case_updates
       (case_id, author_id, message, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [caseId, req.user.id, message, isPublic]
    );

    // Update case updated_at
    await query(
      'UPDATE cases SET updated_at = NOW() WHERE id = $1',
      [caseId]
    );

    // Log action
    await logAction({
      userId: req.user.id,
      embassyId: req.user.embassyId,
      action: 'NOTE_ADDED',
      entityType: 'CASE',
      entityId: caseId,
      details: { isPublic },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      update: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/cases/:caseId/request-assistance
 * Request assistance from another embassy
 */
router.post('/:caseId/request-assistance', requireStaff, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { toEmbassyId, note } = req.body;

    if (!toEmbassyId) {
      return res.status(400).json({ error: 'toEmbassyId is required' });
    }

    // Verify this case belongs to the user's embassy
    const caseResult = await query(
      'SELECT * FROM cases WHERE id = $1 AND primary_embassy_id = $2',
      [caseId, req.user.embassyId],
      req.user
    );

    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found or not owned by your embassy' });
    }

    // Create assistance request
    const reqId = uuidv4();
    const result = await query(
      `INSERT INTO assistance_requests
       (id, case_id, from_embassy, to_embassy, status, note)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [reqId, caseId, req.user.embassyId, toEmbassyId, note || '']
    );

    // Log action
    await logAction({
      userId: req.user.id,
      embassyId: req.user.embassyId,
      action: 'ASSISTANCE_REQUESTED',
      entityType: 'ASSISTANCE_REQUEST',
      entityId: reqId,
      details: { caseId, toEmbassyId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Error requesting assistance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
