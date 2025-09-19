const express = require('express');
// Removed mongoose in favor of local JSON database
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');

const authRoutes = require('./routes/auth');

const gameRoutes = require('./routes/games');
const submissionRoutes = require('./routes/submissions');
// Legacy privileged routes removed
const organizerRoutes = require('./routes/organizer');
const socketHandler = require('./socket/socketHandler');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.USER_URL, process.env.ORGANIZER_URL]
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST']
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.USER_URL, process.env.ORGANIZER_URL]
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cloudinary signed upload support
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
    // Sign exactly the params sent by the client/widget
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

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    await connectDB();

    // Socket.io setup
    socketHandler(io);

    // Make io accessible to routes
    app.use((req, res, next) => {
      req.io = io;
      next();
    });

    // API Routes
    app.use('/api/auth', authRoutes);

    app.use('/api/games', gameRoutes);
    app.use('/api/submissions', submissionRoutes);
    // Legacy privileged routes mount removed
    app.use('/api/organizer', organizerRoutes);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ message: 'Route not found' });
    });

    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = { app, io };