const express = require('express');
const { body, validationResult, query } = require('express-validator');
const multer = require('multer');
const Submission = require('../models/Submission');
const Game = require('../models/Game');

const User = require('../models/User');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');
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
  query('status').optional().isIn(['submitted', 'approved', 'rejected', 'flagged']),
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
    const offset = (page - 1) * limit;

    const filters = {};
    let accessibleGameIds = null; // null means no restriction by game IDs yet

    // Build filters based on user role and query parameters
    if (req.user.role === 'participant') {
      // Participants can only see their own submissions
      filters.userId = req.user.uid;

      // If a specific game is requested, constrain by it
      if (req.query.game) {
        accessibleGameIds = [req.query.game];
      }

      // Event filtering is no longer supported
    } else if (req.user.role === 'organizer') {
      // Organizers can see submissions from games they own
      const games = await Game.findAll({ organizerId: req.user.uid });
      accessibleGameIds = games.map(g => g.id);

      if (accessibleGameIds.length === 0) {
        return res.json({
          success: true,
          data: { submissions: [], pagination: { currentPage: 1, totalPages: 0, totalSubmissions: 0, hasNextPage: false, hasPrevPage: false } }
        });
      }

      // If specific game requested, ensure it is within accessible games
      if (req.query.game) {
        if (!accessibleGameIds.includes(req.query.game)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this game\'s submissions'
          });
        }
        accessibleGameIds = [req.query.game];
      }

      // Allow filtering by participant when organizer
      if (req.query.participant) {
        filters.userId = req.query.participant;
      }
    } else {
      // Other roles are not allowed here
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Apply additional filters
    if (req.query.status) filters.status = req.query.status;

    // Apply game filter if determined
    if (accessibleGameIds && accessibleGameIds.length > 0) {
      filters.gameIds = accessibleGameIds;
    } else if (req.query.game) {
      filters.gameId = req.query.game;
    }

    // Fetch all matching submissions (simple pagination via slicing)
    const allSubmissions = await Submission.findAll(filters);
    const total = allSubmissions.length;
    const paginated = allSubmissions.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        submissions: paginated,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalSubmissions: total,
          hasNextPage: offset + limit < total,
          hasPrevPage: page > 1
        }
      }
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
    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check access permissions
    let hasAccess = submission.userId === req.user.uid;

    if (!hasAccess && req.user.role === 'organizer') {
      const game = await Game.findById(submission.gameId);
      if (game && game.organizerId === req.user.uid) {
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
    const game = await Game.findById(gameId);
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

    // Game exists and is active, proceed with submission

    // Validate submission based on game type
    const validation = validateSubmission(gameType, req.body, {});
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission',
        errors: validation.errors
      });
    }

    // Handle file uploads
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;

    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(file => 
          uploadToCloudinary(file.buffer, {
            folder: `submissions/${gameId}`,
            resource_type: 'auto'
          })
        );
        const uploadResults = await Promise.all(uploadPromises);
        // Save only the first file info in submission record (model supports single file)
        const first = uploadResults[0];
        fileUrl = first.secure_url;
        fileName = req.files[0].originalname;
        fileSize = req.files[0].size;
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload media files'
        });
      }
    }

    const submission = await Submission.create({
      gameId: game.id,
      userId: req.user.uid,
      content: content || answer || null,
      fileUrl,
      fileName,
      fileSize,
      status: 'submitted'
    });

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
// @desc    Approve submission (organizer only)
// @access  Private
router.put('/:id/approve', [
  authenticateSupabaseToken,
  body('points').optional().isInt({ min: 0 }).withMessage('Points must be a non-negative integer'),
  body('feedback').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Organizer access required' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const game = await Game.findById(submission.gameId);
    if (!game || game.organizerId !== req.user.uid) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const points = req.body.points !== undefined ? parseInt(req.body.points) : submission.score;

    const updatedSubmission = await Submission.update(req.params.id, {
      status: 'approved',
      score: points,
      feedback: req.body.feedback,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.uid
    });

    res.json({
      success: true,
      message: 'Submission approved successfully',
      data: { submission: updatedSubmission }
    });
  } catch (error) {
    console.error('Approve submission error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/submissions/:id/reject
// @desc    Reject submission (organizer only)
// @access  Private
router.put('/:id/reject', [
  authenticateSupabaseToken,
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Rejection reason is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Organizer access required' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const game = await Game.findById(submission.gameId);
    if (!game || game.organizerId !== req.user.uid) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedSubmission = await Submission.update(req.params.id, {
      status: 'rejected',
      feedback: req.body.reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.uid
    });

    res.json({
      success: true,
      message: 'Submission rejected successfully',
      data: { submission: updatedSubmission }
    });
  } catch (error) {
    console.error('Reject submission error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/submissions/:id/flag
// @desc    Flag submission (organizer only)
// @access  Private
router.put('/:id/flag', [
  authenticateSupabaseToken,
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Flag reason is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Organizer access required' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const game = await Game.findById(submission.gameId);
    if (!game || game.organizerId !== req.user.uid) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updatedSubmission = await Submission.update(req.params.id, {
      status: 'flagged',
      feedback: req.body.reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.uid
    });

    res.json({
      success: true,
      message: 'Submission flagged successfully',
      data: { submission: updatedSubmission }
    });
  } catch (error) {
    console.error('Flag submission error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/submissions/:id/bonus
// @desc    Award bonus points (organizer only)
// @access  Private
router.put('/:id/bonus', [
  authenticateSupabaseToken,
  body('points').isInt({ min: 1 }).withMessage('Bonus points must be a positive integer'),
  body('reason').trim().isLength({ min: 1, max: 200 }).withMessage('Bonus reason is required')
], async (req, res) => {
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ success: false, message: 'Organizer access required' });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const game = await Game.findById(submission.gameId);
    if (!game || game.organizerId !== req.user.uid) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const points = parseInt(req.body.points);
    const newScore = (submission.score || 0) + points;

    const updatedSubmission = await Submission.update(req.params.id, {
      score: newScore,
      feedback: req.body.reason,
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.user.uid
    });

    res.json({
      success: true,
      message: 'Bonus points awarded successfully',
      data: { submission: updatedSubmission }
    });
  } catch (error) {
    console.error('Award bonus points error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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