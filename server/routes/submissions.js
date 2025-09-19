const express = require('express');
const { body, validationResult, query } = require('express-validator');
const multer = require('multer');
const Submission = require('../models/Submission');
const Game = require('../models/Game');

const User = require('../models/User');
const { authenticateSupabaseToken, requireRole } = require('../middleware/supabaseAuth');
const { uploadToCloudinary } = require('../utils/cloudinary');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and audio files
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') || 
        file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, videos, and audio files are allowed.'));
    }
  }
});

// @route   GET /api/submissions
// @desc    Get submissions with filters
// @access  Private
router.get('/', [
  authenticateSupabaseToken,

  query('game').optional().isString(),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'flagged']),
  query('participant').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {};
    
    // Build filters based on user role and query parameters
    if (req.user.role === 'participant') {
      // Participants can only see their own submissions
      filters.participant = req.user.uid;
    } else if (req.user.role === 'organizer') {
      // Organizers can see submissions from their games
      // Get all games organized by this user
      const userGames = await Game.find({ organizerId: req.user.uid }).select('_id').lean();
      const gameIds = userGames.map(g => g._id.toString());
      
      if (gameIds.length === 0) {
        return res.json({
          success: true,
          data: { submissions: [], pagination: { current: 1, pages: 0, total: 0 } }
        });
      }
      
      filters.gameIds = gameIds;
    }
    // Access scope: participants can see their own submissions; organizers can see submissions for their games

    // Apply additional filters
    if (req.query.game) filters.gameId = req.query.game;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.participant && req.user.role !== 'participant') {
      filters.userId = req.query.participant;
    }

    // Build query
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.gameId) query.gameId = filters.gameId;
    if (filters.gameIds) {
      query.gameId = { $in: filters.gameIds };
    }
    if (filters.status) query.status = filters.status;

    const skip = (page - 1) * limit;
    const submissions = await Submission.find(query)
      .populate('userId', 'username email')
      .populate('gameId', 'title type')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Submission.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const result = {
      submissions,
      pagination: {
        current: page,
        pages,
        total
      }
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/submissions/:id
// @desc    Get single submission
// @access  Private
router.get('/:id', [authenticateSupabaseToken], async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('gameId', 'title type eventId')
      .lean();
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check access permissions
    let hasAccess = submission.userId._id.toString() === req.user.uid;

    if (!hasAccess && req.user.role === 'organizer') {
      // Check if user is organizer of the event
      const event = await Event.findById(submission.gameId.eventId).lean();
      if (event && event.organizer === req.user.uid) {
        hasAccess = true;
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { submission }
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/submissions
// @desc    Create new submission
// @access  Private (Participants)
router.post('/', [
  authenticateSupabaseToken,
  upload.array('media', 5), // Allow up to 5 media files
  body('game').isString().withMessage('Valid game ID is required'),
  body('gameType').isIn(['scavenger_hunt', 'dj_song_voting', 'guess_the_song', 'trivia', 'hangman', 'word_scramble', 'creative_challenge', 'truth_or_dare']),
  body('content').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { game: gameId, gameType, content, answer } = req.body;

    // Verify game exists and is active
    const game = await Game.findById(gameId).populate('eventId').lean();
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not currently active'
      });
    }

    // Verify user is participant in the event
    const event = game.eventId;
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Associated event not found'
      });
    }

    const isParticipant = event.participants?.some(p => p.user === req.user.uid);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You must be a participant in this event to submit'
      });
    }

    // Check for existing submission if game doesn't allow multiple submissions
    if (!game.settings?.allowMultipleSubmissions) {
      const existingSubmission = await Submission.findOne({
        gameId: gameId,
        userId: req.user.uid
      }).lean();
      
      if (existingSubmission) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted for this game'
        });
      }
    }

    // Validate submission based on game type
    const validationResult = validateSubmission(gameType, req.body, game.config);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission',
        errors: validationResult.errors
      });
    }

    // Handle file uploads
    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file.buffer, {
            folder: `submissions/${gameId}`,
            resource_type: 'auto'
          })
        );
        
        const uploadResults = await Promise.all(uploadPromises);
        mediaUrls = uploadResults.map(result => ({
          url: result.secure_url,
          publicId: result.public_id,
          type: result.resource_type
        }));
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload media files'
        });
      }
    }

    // Create submission data
    const submissionData = {
      userId: req.user.uid,
      gameId: gameId,
      gameType,
      content: content || '',
      answer: answer || '',
      media: mediaUrls,
      status: 'pending',
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Auto-approve certain game types if configured
    if (game.settings?.autoApprove || ['dj_song_voting'].includes(gameType)) {
      submissionData.status = 'approved';
      submissionData.approvedAt = new Date();
      submissionData.score = game.settings?.defaultPoints || 10;
    }

    const submission = await Submission.create(submissionData);

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: { submission }
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/submissions/:id/approve
// @desc    Approve submission
// @access  Private (Organizer)
router.put('/:id/approve', [
  authenticateSupabaseToken,
  requireRole(['organizer']),
  body('points').optional().isInt({ min: 0 }).withMessage('Points must be a non-negative integer'),
  body('feedback').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const submission = await Submission.findById(req.params.id)
      .populate({
        path: 'gameId',
        populate: { path: 'eventId' }
      })
      .lean();
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions
    if (req.user.role === 'organizer') {
      const event = submission.gameId.eventId;
      if (!event || event.organizer !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    if (submission.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Submission is already approved'
      });
    }

    const { points, feedback } = req.body;
    const game = submission.gameId;
    const defaultPoints = game?.settings?.defaultPoints || 10;

    const updateData = {
      status: 'approved',
      score: points !== undefined ? points : defaultPoints,
      feedback: feedback || '',
      approvedAt: new Date(),
      approvedBy: req.user.uid,
      updatedAt: new Date()
    };

    const updatedSubmission = await Submission.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();

    res.json({
      success: true,
      message: 'Submission approved successfully',
      data: { submission: updatedSubmission }
    });
  } catch (error) {
    console.error('Approve submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/submissions/:id/reject
// @desc    Reject submission
// @access  Private (Organizer)
router.put('/:id/reject', [
  authenticateSupabaseToken,
  requireRole(['organizer']),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Rejection reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const submission = await Submission.findById(req.params.id)
      .populate({
        path: 'gameId',
        populate: { path: 'eventId' }
      })
      .lean();
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions
    if (req.user.role === 'organizer') {
      const event = submission.gameId.eventId;
      if (!event || event.organizer !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const { reason } = req.body;

    const updateData = {
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: new Date(),
      rejectedBy: req.user.uid,
      updatedAt: new Date()
    };

    const updatedSubmission = await Submission.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();

    res.json({
      success: true,
      message: 'Submission rejected successfully',
      data: { submission: updatedSubmission }
    });
  } catch (error) {
    console.error('Reject submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/submissions/:id/flag
// @desc    Flag submission
// @access  Private (Organizer)
router.put('/:id/flag', [
  authenticateSupabaseToken,
  requireRole(['organizer']),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Flag reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const submission = await Submission.findById(req.params.id)
      .populate({
        path: 'gameId',
        populate: { path: 'eventId' }
      })
      .lean();
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions
    if (req.user.role === 'organizer') {
      const event = submission.gameId.eventId;
      if (!event || event.organizer !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const { reason } = req.body;

    const updateData = {
      status: 'flagged',
      flagReason: reason,
      flaggedAt: new Date(),
      flaggedBy: req.user.uid,
      updatedAt: new Date()
    };

    const updatedSubmission = await Submission.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();

    res.json({
      success: true,
      message: 'Submission flagged successfully',
      data: { submission: updatedSubmission }
    });
  } catch (error) {
    console.error('Flag submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/submissions/:id/bonus
// @desc    Award bonus points to submission
// @access  Private (Organizer)
router.put('/:id/bonus', [
  authenticateSupabaseToken,
  requireRole(['organizer']),
  body('points').isInt({ min: 1 }).withMessage('Bonus points must be a positive integer'),
  body('reason').trim().isLength({ min: 1, max: 200 }).withMessage('Bonus reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const submission = await Submission.findById(req.params.id)
      .populate({
        path: 'gameId',
        populate: { path: 'eventId' }
      })
      .lean();
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check permissions
    if (req.user.role === 'organizer') {
      const event = submission.gameId.eventId;
      if (!event || event.organizer !== req.user.uid) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    if (submission.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Can only award bonus points to approved submissions'
      });
    }

    const { points, reason } = req.body;
    const currentPoints = submission.pointsAwarded || 0;
    const bonusPoints = submission.bonusPoints || 0;

    const updateData = {
      bonusPoints: bonusPoints + points,
      bonusReason: reason,
      bonusAwardedAt: new Date(),
      bonusAwardedBy: req.user.uid,
      updatedAt: new Date()
    };

    const updatedSubmission = await Submission.findByIdAndUpdate(req.params.id, updateData, { new: true }).lean();

    res.json({
      success: true,
      message: 'Bonus points awarded successfully',
      data: { submission: updatedSubmission }
    });
  } catch (error) {
    console.error('Award bonus points error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to validate submission based on game type
function validateSubmission(gameType, submissionData, gameConfig) {
  const errors = [];
  
  switch (gameType) {
    case 'scavenger_hunt':
      if (!submissionData.content && (!submissionData.media || submissionData.media.length === 0)) {
        errors.push('Scavenger hunt submissions require either content or media');
      }
      break;
      
    case 'dj_song_voting':
      if (!submissionData.answer) {
        errors.push('Song selection is required for DJ song voting');
      }
      break;
      
    case 'guess_the_song':
      if (!submissionData.answer) {
        errors.push('Song guess is required');
      }
      break;
      
    case 'trivia':
      if (!submissionData.answer) {
        errors.push('Answer is required for trivia questions');
      }
      break;
      
    case 'hangman':
      if (!submissionData.answer) {
        errors.push('Word guess is required for hangman');
      }
      break;
      
    case 'word_scramble':
      if (!submissionData.answer) {
        errors.push('Unscrambled word is required');
      }
      break;
      
    case 'creative_challenge':
      if (!submissionData.content && (!submissionData.media || submissionData.media.length === 0)) {
        errors.push('Creative challenge submissions require either content or media');
      }
      break;
      
    case 'truth_or_dare':
      if (!submissionData.content && (!submissionData.media || submissionData.media.length === 0)) {
        errors.push('Truth or dare submissions require either content or media');
      }
      break;
      
    default:
      errors.push('Invalid game type');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = router;