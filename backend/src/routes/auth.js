const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { generateToken, generateRefreshToken, verifyToken } = require('../middleware/auth');
const { logAction } = require('../utils/auditLog');
const jwt = require('jsonwebtoken');

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['email', 'password']
      });
    }

    // Find user by email
    const result = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if user exists or not
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Log failed login attempt
      await logAction({
        userId: user.id,
        embassyId: user.embassy_id,
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        details: { email, reason: 'invalid_password' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Log successful login
    await logAction({
      userId: user.id,
      embassyId: user.embassy_id,
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      details: { email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Return user info and tokens
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        embassyId: user.embassy_id,
        preferredLanguage: user.preferred_language
      },
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET
      );
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get user from database
    const result = await query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [payload.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = result.rows[0];

    // Generate new access token
    const newToken = generateToken(user);

    res.json({
      success: true,
      token: newToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error during token refresh' });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (client should delete tokens)
 */
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // Log logout
    await logAction({
      userId: req.user.id,
      embassyId: req.user.embassyId,
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: req.user.id,
      details: {},
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error during logout' });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user information
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT
        u.id, u.name, u.email, u.role, u.embassy_id,
        u.preferred_language, u.nationality, u.phone,
        e.name as embassy_name, e.country as embassy_country
      FROM users u
      LEFT JOIN embassies e ON u.embassy_id = e.id
      WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        nationality: user.nationality,
        preferredLanguage: user.preferred_language,
        embassy: user.embassy_id ? {
          id: user.embassy_id,
          name: user.embassy_name,
          country: user.embassy_country
        } : null
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/auth/register
 * Register a new citizen user
 */
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      nationality,
      passportNumber,
      preferredLanguage = 'en'
    } = req.body;

    // Validation
    if (!name || !email || !password || !nationality) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email', 'password', 'nationality']
      });
    }

    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert new user
    const result = await query(
      `INSERT INTO users
       (role, name, email, phone, password_hash, preferred_language, nationality, passport_number)
       VALUES ('citizen', $1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role, preferred_language`,
      [name, email.toLowerCase(), phone, passwordHash, preferredLanguage, nationality, passportNumber]
    );

    const newUser = result.rows[0];

    // Log registration
    await logAction({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: newUser.id,
      details: { email: newUser.email, nationality },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate tokens
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      embassy_id: null
    });

    const refreshToken = generateRefreshToken({
      id: newUser.id
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        preferredLanguage: newUser.preferred_language
      },
      token,
      refreshToken
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

module.exports = router;
