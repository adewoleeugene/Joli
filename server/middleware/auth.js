const { authenticateSupabaseToken, optionalSupabaseAuth, /* requireAdmin removed */ requireOrganizer, requireRole } = require('./supabaseAuth');

// Use Supabase authentication middleware
const auth = authenticateSupabaseToken;

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - insufficient permissions'
      });
    }

    next();
  };
};

// Legacy privileged-only middleware removed
// Organizer-only middleware
const adminOrOrganizer = requireOrganizer;

// Use Supabase optional auth middleware
const optionalAuth = optionalSupabaseAuth;



// Game ownership middleware
const gameOwnership = async (req, res, next) => {
  try {
    const Game = require('../models/Game');
    const gameId = req.params.gameId || req.params.id;
    
    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required'
      });
    }

    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Allow creator or organizer only
    const isCreator = game.creator.toString() === req.user.id;
    const isOrganizer = game.organizerId.toString() === req.user.id;
    
    if (!isCreator && !isOrganizer) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to access this game.'
      });
    }

    req.game = game;
    next();
  } catch (error) {
    console.error('Game ownership middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking game ownership'
    });
  }
};

// Rate limiting by user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }
    
    const userId = req.user.id;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    }
    
    // Check current requests
    const currentRequests = requests.get(userId) || [];
    
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    currentRequests.push(now);
    requests.set(userId, currentRequests);
    
    next();
  };
};

module.exports = {
  auth,
  authorize,
  // adminOnly removed
  adminOrOrganizer,
  optionalAuth,
  gameOwnership,
  userRateLimit
};