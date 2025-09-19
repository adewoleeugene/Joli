const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const socketHandler = require('./socket/socketHandler');

const app = express();
const httpServer = createServer(app);

// Socket.io setup with multi-origin support
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.USER_URL, process.env.ORGANIZER_URL]
      : ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.USER_URL, process.env.ORGANIZER_URL]
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting for shared services
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Higher limit for shared services
  message: 'Too many requests from this IP for shared services'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Database connection removed - using Supabase for data storage

// Socket.io setup
socketHandler(io);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`Shared Services: ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Shared authentication routes
app.use('/api/auth', authRoutes);

// WebSocket status endpoint
app.get('/api/socket/status', (req, res) => {
  const connectedClients = io.engine.clientsCount;
  res.json({ 
    status: 'OK', 
    service: 'shared-websocket', 
    connectedClients,
    port: process.env.PORT 
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'shared-services', 
    port: process.env.PORT,
    websocket: 'enabled',
    connectedClients: io.engine.clientsCount
  });
});

// Service discovery endpoint
app.get('/api/services', (req, res) => {
  res.json({
    services: {
      user: process.env.USER_API_URL || 'http://localhost:5010',
      organizer: process.env.ORGANIZER_API_URL || 'http://localhost:5002',
      shared: `http://localhost:${process.env.PORT || 5003}`
    },
    frontends: {
      user: process.env.USER_URL || 'http://localhost:3000',
      organizer: process.env.ORGANIZER_URL || 'http://localhost:3001'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Shared Services Error:', err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Shared Services: Route not found' });
});

const PORT = process.env.PORT || 5003;
httpServer.listen(PORT, () => {
  console.log(`Shared Services Server running on port ${PORT}`);
  console.log('WebSocket server enabled for multi-client support');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shared Services: Received SIGTERM, shutting down gracefully');
  httpServer.close(() => {
    console.log('Shared Services: Server closed');
    process.exit(0);
  });
});

module.exports = { app, io };