require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { connectDB } = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const caseRoutes = require('./routes/cases');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// =============================================================================
// ROUTES
// =============================================================================

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Global Consular Collaboration Platform API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cases', caseRoutes);
app.use('/api/v1/admin', adminRoutes);

// AI assistance endpoint
const { citizenAssistant, staffAssistant, isAIAvailable } = require('./services/aiService');
const { requireUser, requireStaff } = require('./middleware/auth');

app.post('/api/v1/ai/citizen-assist', requireUser, async (req, res) => {
  try {
    if (!isAIAvailable()) {
      return res.status(503).json({
        error: 'AI service is currently unavailable',
        message: 'Please contact embassy staff for assistance'
      });
    }

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const language = req.user.preferredLanguage || 'en';
    const answer = await citizenAssistant(prompt, language);

    res.json({
      success: true,
      answer
    });

  } catch (error) {
    console.error('AI assist error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

app.post('/api/v1/ai/staff-assist', requireStaff, async (req, res) => {
  try {
    if (!isAIAvailable()) {
      return res.status(503).json({ error: 'AI service is currently unavailable' });
    }

    const { task, content, options = {} } = req.body;

    if (!task || !content) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['task', 'content']
      });
    }

    const result = await staffAssistant(task, content, options);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Staff AI assist error:', error);
    res.status(500).json({ error: 'AI service error' });
  }
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  const errorResponse = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
});

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================

async function startServer() {
  try {
    // Connect to database
    await connectDB();

    // Start listening
    app.listen(PORT, () => {
      console.log('========================================');
      console.log('Global Consular Collaboration Platform');
      console.log('========================================');
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Server running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}`);
      console.log(`AI Service: ${isAIAvailable() ? 'Enabled' : 'Disabled (set ANTHROPIC_API_KEY)'}`);
      console.log('========================================');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
