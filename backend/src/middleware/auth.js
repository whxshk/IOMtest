const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token and extract user information
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid Authorization header format. Use: Bearer <token>' });
    }

    const token = parts[1];

    try {
      const payload = jwt.verify(token, JWT_SECRET);

      // Attach user info to request
      req.user = {
        id: payload.userId,
        role: payload.role,
        embassyId: payload.embassyId,
        email: payload.email
      };

      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
      }
      throw err;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Require any authenticated user
 */
const requireUser = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) return;
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  });
};

/**
 * Require embassy staff role
 */
const requireStaff = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) return;
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Staff access required',
        requiredRole: 'staff',
        currentRole: req.user.role
      });
    }
    next();
  });
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) return;
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Admin access required',
        requiredRole: 'admin',
        currentRole: req.user.role
      });
    }
    next();
  });
};

/**
 * Require citizen role
 */
const requireCitizen = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) return;
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'citizen' && req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: Citizen access required',
        requiredRole: 'citizen',
        currentRole: req.user.role
      });
    }
    next();
  });
};

/**
 * Optional authentication - adds user to request if token present but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: payload.userId,
      role: payload.role,
      embassyId: payload.embassyId,
      email: payload.email
    };
  } catch (err) {
    // Invalid token - just continue without user
  }

  next();
};

/**
 * Generate JWT token for user
 */
const generateToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    embassyId: user.embassy_id
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });

  return token;
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    userId: user.id,
    type: 'refresh'
  };

  const refreshToken = jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET || JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );

  return refreshToken;
};

module.exports = {
  requireUser,
  requireStaff,
  requireAdmin,
  requireCitizen,
  optionalAuth,
  verifyToken,
  generateToken,
  generateRefreshToken
};
