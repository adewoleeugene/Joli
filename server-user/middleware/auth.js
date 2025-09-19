const { authenticateSupabaseToken, optionalSupabaseAuth } = require('./supabaseAuth');

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

// Organizer-only middleware
const organizerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'organizer') {
    return res.status(403).json({
      success: false,
      message: 'Organizer access required'
    });
  }

  next();
};

// Use Supabase optional auth middleware
const optionalAuth = optionalSupabaseAuth;

// Event ownership middleware
const eventOwnership = async (req, res, next) => {
  try {
    const Event = require('../models/Event');
    const eventId = req.params.eventId || req.params.id;
    
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer
    if (event.organizer.toString() !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not the organizer of this event.'
      });
    }

    req.event = event;
    next();
  } catch (error) {
    console.error('Event ownership middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking event ownership'
    });
  }
};

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

    const game = await Game.findById(gameId).populate('event');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check if user is the creator or event organizer
    const isCreator = game.creator.toString() === req.user.uid;
    const isEventOrganizer = game.event.organizer.toString() === req.user.uid;
    
    if (!isCreator && !isEventOrganizer) {
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
    
    const userId = req.user.uid;
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
  organizerOnly,
  optionalAuth,
  eventOwnership,
  gameOwnership,
  userRateLimit
};