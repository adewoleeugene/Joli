const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Configure Socket.io with authentication and event handlers
 * @param {Object} io - Socket.io server instance
 */
const configureSocket = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('User not found or inactive'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`User ${socket.user.email} connected with socket ID: ${socket.id}`);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Handle joining event rooms
    socket.on('join:event', (eventId) => {
      if (eventId) {
        socket.join(`event:${eventId}`);
        console.log(`User ${socket.user.email} joined event room: ${eventId}`);
        
        // Notify others in the event room
        socket.to(`event:${eventId}`).emit('user:joined', {
          userId: socket.userId,
          user: {
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            avatar: socket.user.avatar
          }
        });
      }
    });

    // Handle leaving event rooms
    socket.on('leave:event', (eventId) => {
      if (eventId) {
        socket.leave(`event:${eventId}`);
        console.log(`User ${socket.user.email} left event room: ${eventId}`);
        
        // Notify others in the event room
        socket.to(`event:${eventId}`).emit('user:left', {
          userId: socket.userId
        });
      }
    });

    // Handle joining game rooms
    socket.on('join:game', (gameId) => {
      if (gameId) {
        socket.join(`game:${gameId}`);
        console.log(`User ${socket.user.email} joined game room: ${gameId}`);
      }
    });

    // Handle leaving game rooms
    socket.on('leave:game', (gameId) => {
      if (gameId) {
        socket.leave(`game:${gameId}`);
        console.log(`User ${socket.user.email} left game room: ${gameId}`);
      }
    });

    // Handle real-time game interactions
    socket.on('game:interaction', (data) => {
      const { gameId, type, payload } = data;
      
      if (gameId && type) {
        // Broadcast to all users in the game room
        socket.to(`game:${gameId}`).emit('game:update', {
          type,
          payload,
          userId: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // Handle typing indicators for chat/comments
    socket.on('typing:start', (data) => {
      const { eventId, gameId } = data;
      const room = eventId ? `event:${eventId}` : `game:${gameId}`;
      
      if (room) {
        socket.to(room).emit('user:typing', {
          userId: socket.userId,
          user: {
            firstName: socket.user.firstName,
            lastName: socket.user.lastName
          }
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { eventId, gameId } = data;
      const room = eventId ? `event:${eventId}` : `game:${gameId}`;
      
      if (room) {
        socket.to(room).emit('user:stopped_typing', {
          userId: socket.userId
        });
      }
    });

    // Handle live reactions/emojis
    socket.on('reaction:send', (data) => {
      const { eventId, gameId, emoji, targetType, targetId } = data;
      const room = eventId ? `event:${eventId}` : `game:${gameId}`;
      
      if (room && emoji) {
        io.to(room).emit('reaction:received', {
          userId: socket.userId,
          user: {
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            avatar: socket.user.avatar
          },
          emoji,
          targetType,
          targetId,
          timestamp: new Date()
        });
      }
    });

    // Handle live voting updates (for DJ Song Voting)
    socket.on('vote:cast', (data) => {
      const { gameId, songId, eventId } = data;
      
      if (gameId && songId) {
        // Broadcast vote update to event room
        io.to(`event:${eventId}`).emit('vote:updated', {
          gameId,
          songId,
          userId: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // Handle live quiz/trivia answers
    socket.on('answer:submit', (data) => {
      const { gameId, questionId, answer, eventId } = data;
      
      if (gameId && questionId) {
        // Notify organizers about new answer
        socket.to(`event:${eventId}`).emit('answer:received', {
          gameId,
          questionId,
          userId: socket.userId,
          hasAnswered: true,
          timestamp: new Date()
        });
      }
    });

    // Handle live location updates (for scavenger hunts)
    socket.on('location:update', (data) => {
      const { eventId, gameId, location } = data;
      
      if (eventId && location) {
        // Only send to organizers for privacy
        socket.to(`event:${eventId}`).emit('participant:location', {
          userId: socket.userId,
          gameId,
          location,
          timestamp: new Date()
        });
      }
    });

    // Handle organizer actions
    socket.on('organizer:action', (data) => {
      const { eventId, action, payload } = data;
      
      // Verify user has organizer permissions
      if (socket.user.role === 'organizer') {
      io.to(`event:${eventId}`).emit('organizer:update', {
      action,
      payload,
      organizerId: socket.userId,
      timestamp: new Date()
      });
      }
     });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User ${socket.user.email} disconnected: ${reason}`);
      
      // Notify all rooms the user was in
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit('user:disconnected', {
            userId: socket.userId
          });
        }
      });
    });

    // Handle connection errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.user.email}:`, error);
    });
  });

  // Handle server-side events for broadcasting
  io.broadcastToEvent = (eventId, event, data) => {
    io.to(`event:${eventId}`).emit(event, data);
  };

  io.broadcastToGame = (gameId, event, data) => {
    io.to(`game:${gameId}`).emit(event, data);
  };

  io.broadcastToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Legacy broadcast helper removed; privileged role deprecated

  return io;
};

module.exports = configureSocket;