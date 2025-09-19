const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const gameRoutes = require('./routes/games');
const submissionRoutes = require('./routes/submissions');
const organizerRoutes = require('./routes/organizer');
const { connectSupabase, checkVisibilitySchema } = require('./config/supabase');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.USER_URL]
    : ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting - more lenient for user service
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200 // limit each IP to 200 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection removed - using Supabase for data storage

// Request logging middleware
app.use((req, res, next) => {
  console.log(`User API: ${req.method} ${req.path}`);
  next();
});

// Cloudinary signed upload support (user API)
const { cloudinary } = require('./utils/cloudinary');

// Public config for client-side widget (safe to expose)
app.get('/api/media/config', (req, res) => {
  try {
    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      folderDefault: 'joli'
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load media config' });
  }
});

// Signature endpoint for signed uploads
app.post('/api/media/sign-upload', (req, res) => {
  try {
    const paramsToSign = req.body || {};
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );
    res.json({ signature });
  } catch (e) {
    console.error('Signature generation error:', e);
    res.status(500).json({ message: 'Failed to generate signature' });
  }
});

// User-specific routes only
app.use('/api/auth', authRoutes);

app.use('/api/games', gameRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/organizer', organizerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'user-api', port: process.env.PORT });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('User API Error:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'User API: Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`User API Server running on port ${PORT}`);
  try {
    await connectSupabase();
    await checkVisibilitySchema();
  } catch (e) {
    console.error('[Startup] Supabase connection or schema check failed:', e.message);
  }
});

module.exports = { app };