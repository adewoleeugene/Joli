const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const mediaRoutes = require('./routes/media');
const organizerRoutes = require('./routes/organizer');
const applicationRoutes = require('./routes/applications');
const gameRoutes = require('./routes/games');

const app = express();

// Enhanced security middleware for organizers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ORGANIZER_URL 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006'],
  credentials: true
};

app.use(cors(corsOptions));

// Enhanced rate limiting for organizer service
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  message: 'Too many requests from this IP for organizer service'
});
app.use('/api/', limiter);

// Stricter rate limiting for sensitive organizer operations
const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per 5 minutes
  message: 'Too many sensitive operations from this IP'
});
app.use('/api/organizer/events', strictLimiter);
app.use('/api/organizer/analytics', strictLimiter);

// Body parsing middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Database connection removed - using Supabase for data storage

// Request logging middleware
app.use((req, res, next) => {
  console.log(`Organizer API: ${req.method} ${req.path} - ${req.ip}`);
  if (req.method === 'POST' && req.path === '/api/games') {
    console.log('POST /api/games request body:', req.body);
    console.log('POST /api/games headers:', req.headers);
  }
  next();
});

// Organizer-specific routes
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes); // Media upload endpoints
app.use('/api/organizer', organizerRoutes); // Full organizer functionality
app.use('/api/organizer', applicationRoutes); // Application management
app.use('/api/games', gameRoutes); // Organizer games endpoints

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'organizer-api', port: process.env.PORT });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Organizer API Error:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Organizer API: Route not found' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Organizer API Server running on port ${PORT}`);
});

module.exports = { app };