const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateSupabaseToken, requireRole } = require('../middleware/supabaseAuth');
const gameService = require('../services/gameService');
const router = express.Router();

// @route   GET /api/games
// @desc    Get all games (with filters)
// @access  Private
router.get('/', [
  authenticateSupabaseToken,
  query('type').optional().isIn(['scavenger_hunt', 'dj_song_voting', 'guess_the_song', 'trivia', 'hangman', 'word_scramble', 'creative_challenge', 'truth_or_dare']),
  query('status').optional().isIn(['draft', 'active', 'paused', 'completed'])
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

    const filters = {
      organizer: req.user.uid // Only show games created by the current user
    };
    
    if (req.query.type) filters.type = req.query.type;
    if (req.query.status) filters.status = req.query.status;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await gameService.getAllGames(filters, { page, limit });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/games/:id
// @desc    Get single game
// @access  Private (Game owner/Event participants)
router.get('/:id', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check access permissions - only game organizer can view
    if (game.organizer !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { game }
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/games
// @desc    Create new game
// @access  Private
router.post('/', [
  authenticateSupabaseToken,
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('type').isIn(['scavenger_hunt', 'dj_song_voting', 'guess_the_song', 'trivia', 'hangman', 'word_scramble', 'creative_challenge', 'truth_or_dare']).withMessage('Invalid game type'),
  body('config').isObject().withMessage('Game configuration is required')
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

    const { title, description, type, config, settings } = req.body;

    // Validate game configuration
    const configValidation = validateGameConfig(type, config);
    if (!configValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid game configuration',
        errors: configValidation.errors
      });
    }

    const gameData = {
      title,
      description: description || '',
      type,
      organizer: req.user.uid,
      config,
      settings: settings || {},
      status: 'draft',
      creator: req.user.uid,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const game = await gameService.createGame(gameData);

    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: { game }
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/games/:id
// @desc    Update game
// @access  Private (Game creator)
router.put('/:id', [
  authenticateSupabaseToken,
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('config').optional().isObject(),
  body('settings').optional().isObject()
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

    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check permissions
    if (game.creator !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Validate config if provided
    if (req.body.config) {
      const configValidation = validateGameConfig(game.type, req.body.config);
      if (!configValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid game configuration',
          errors: configValidation.errors
        });
      }
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    const updatedGame = await gameService.updateGame(req.params.id, updateData);

    res.json({
      success: true,
      message: 'Game updated successfully',
      data: { game: updatedGame }
    });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/games/:id
// @desc    Delete game
// @access  Private (Game creator)
router.delete('/:id', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check permissions
    if (game.creator !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await gameService.deleteGame(req.params.id);

    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/games/:id/start
// @desc    Start game
// @access  Private (Game creator)
router.post('/:id/start', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check permissions
    if (game.creator !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (game.status !== 'draft' && game.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: 'Game cannot be started from current status'
      });
    }

    const updatedGame = await gameService.updateGame(req.params.id, {
      status: 'active',
      startedAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Game started successfully',
      data: { game: updatedGame }
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/games/:id/pause
// @desc    Pause game
// @access  Private (Game creator)
router.post('/:id/pause', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check permissions
    if (game.creator !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active games can be paused'
      });
    }

    const updatedGame = await gameService.updateGame(req.params.id, {
      status: 'paused',
      pausedAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Game paused successfully',
      data: { game: updatedGame }
    });
  } catch (error) {
    console.error('Pause game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/games/:id/resume
// @desc    Resume game
// @access  Private (Game creator)
router.post('/:id/resume', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check permissions
    if (game.creator !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (game.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: 'Only paused games can be resumed'
      });
    }

    const updatedGame = await gameService.updateGame(req.params.id, {
      status: 'active',
      resumedAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Game resumed successfully',
      data: { game: updatedGame }
    });
  } catch (error) {
    console.error('Resume game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/games/:id/complete
// @desc    Complete game
// @access  Private (Game creator)
router.post('/:id/complete', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check permissions
    if (game.creator !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (game.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Game is already completed'
      });
    }

    const updatedGame = await gameService.updateGame(req.params.id, {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Game completed successfully',
      data: { game: updatedGame }
    });
  } catch (error) {
    console.error('Complete game error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/games/:id/analytics
// @desc    Get game analytics
// @access  Private (Game creator)
router.get('/:id/analytics', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check permissions
    if (game.creator !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const analytics = await gameService.getGameAnalytics(req.params.id);

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    console.error('Get game analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/games/:id/leaderboard
// @desc    Get game leaderboard
// @access  Private (Game participants/creator)
router.get('/:id/leaderboard', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await gameService.getGame(req.params.id);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Check access permissions - only game organizer can view leaderboard
    if (game.organizer !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const leaderboard = await gameService.getGameLeaderboard(req.params.id);

    res.json({
      success: true,
      data: { leaderboard }
    });
  } catch (error) {
    console.error('Get game leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to validate game configuration
function validateGameConfig(type, config) {
  const errors = [];
  
  switch (type) {
    case 'scavenger_hunt':
      if (!config.items || !Array.isArray(config.items) || config.items.length === 0) {
        errors.push('Scavenger hunt must have at least one item');
      }
      break;
      
    case 'dj_song_voting':
      if (!config.songs || !Array.isArray(config.songs) || config.songs.length === 0) {
        errors.push('DJ song voting must have at least one song');
      }
      break;
      
    case 'guess_the_song':
      if (!config.songs || !Array.isArray(config.songs) || config.songs.length === 0) {
        errors.push('Guess the song must have at least one song');
      }
      break;
      
    case 'trivia':
      if (!config.questions || !Array.isArray(config.questions) || config.questions.length === 0) {
        errors.push('Trivia must have at least one question');
      }
      break;
      
    case 'hangman':
      if (!config.words || !Array.isArray(config.words) || config.words.length === 0) {
        errors.push('Hangman must have at least one word');
      }
      break;
      
    case 'word_scramble':
      if (!config.words || !Array.isArray(config.words) || config.words.length === 0) {
        errors.push('Word scramble must have at least one word');
      }
      break;
      
    case 'creative_challenge':
      if (!config.prompt || typeof config.prompt !== 'string') {
        errors.push('Creative challenge must have a prompt');
      }
      break;
      
    case 'truth_or_dare':
      if ((!config.truths || !Array.isArray(config.truths)) && 
          (!config.dares || !Array.isArray(config.dares))) {
        errors.push('Truth or dare must have at least truths or dares');
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