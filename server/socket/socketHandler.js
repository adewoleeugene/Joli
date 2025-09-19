const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

// Main socket handler
const socketHandler = (io) => {
  // Authentication middleware for all socket connections
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.firstName} ${socket.user.lastName} connected`);

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Handle joining event rooms
    socket.on('join_event', (eventId) => {
      socket.join(`event_${eventId}`);
      console.log(`User ${socket.userId} joined event ${eventId}`);
    });

    // Handle leaving event rooms
    socket.on('leave_event', (eventId) => {
      socket.leave(`event_${eventId}`);
      console.log(`User ${socket.userId} left event ${eventId}`);
    });

    // Handle joining game rooms
    socket.on('join_game', (gameId) => {
      socket.join(`game_${gameId}`);
      console.log(`User ${socket.userId} joined game ${gameId}`);
    });

    // Handle leaving game rooms
    socket.on('leave_game', (gameId) => {
      socket.leave(`game_${gameId}`);
      console.log(`User ${socket.userId} left game ${gameId}`);
    });

    // Handle game submissions
    socket.on('game_submission', (data) => {
      const { gameId, submission } = data;
      // Broadcast to all users in the game room
      socket.to(`game_${gameId}`).emit('new_submission', {
        userId: socket.userId,
        user: {
          firstName: socket.user.firstName,
          lastName: socket.user.lastName
        },
        submission,
        timestamp: new Date()
      });
    });

    // Handle leaderboard updates
    socket.on('request_leaderboard', (eventId) => {
      // This would typically fetch and send leaderboard data
      // For now, we'll just acknowledge the request
      socket.emit('leaderboard_update', {
        eventId,
        message: 'Leaderboard data requested'
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.firstName} ${socket.user.lastName} disconnected`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Helper functions for emitting events from other parts of the application
  const emitToEvent = (eventId, event, data) => {
    io.to(`event_${eventId}`).emit(event, data);
  };

  const emitToGame = (gameId, event, data) => {
    io.to(`game_${gameId}`).emit(event, data);
  };

  const emitToUser = (userId, event, data) => {
    io.to(`user_${userId}`).emit(event, data);
  };

  // Attach helper functions to io object for use in other modules
  io.emitToEvent = emitToEvent;
  io.emitToGame = emitToGame;
  io.emitToUser = emitToUser;
};

module.exports = socketHandler;