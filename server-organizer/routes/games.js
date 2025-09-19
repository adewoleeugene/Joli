const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Game = require('../models/Game');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');
const JoinCodeGenerator = require('../utils/joinCodeGenerator');

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

    // Organizer-only access for listing games on organizer server
    if (req.user.role !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can access games list'
      });
    }

    // Get games for this organizer
    const organizerId = req.user.id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const games = await Game.findAll({
      organizerId,
      type: req.query.type,
      status: req.query.status,
      page,
      limit
    });

    const mapped = games.map(mapGameToResponse);

    res.json({
      success: true,
      data: { games: mapped, pagination: { current: page, pages: null, total: mapped.length } }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/:id
// @desc    Get single game
// @access  Private (Game owner/Event participants)
router.get('/:id', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    // Check access permissions (organizer who owns the game)
  if (game.organizerId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

    res.json({ success: true, data: { game: mapGameToResponse(game) } });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/games
// @desc    Create new game
// @access  Private (Event organizer)
router.post('/', [
  authenticateSupabaseToken,
  body('title').trim().isLength({ min: 1, max: 100 }).withMessage('Title is required and must be less than 100 characters'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('image').optional().custom((value) => {
    if (!value) return true; // Allow empty/null values
    // Allow regular URLs or data URLs
    const urlPattern = /^https?:\/\/.+/;
    const dataUrlPattern = /^data:image\/.+;base64,.+/;
    if (urlPattern.test(value) || dataUrlPattern.test(value)) {
      return true;
    }
    throw new Error('Image must be a valid URL or data URL');
  }),
  body('type').isIn(['scavenger_hunt', 'dj_song_voting', 'guess_the_song', 'trivia', 'hangman', 'word_scramble', 'creative_challenge', 'truth_or_dare']).withMessage('Invalid game type'),

], async (req, res) => {
  try {
    console.log('=== CREATE GAME REQUEST ===');
    console.log('Request body:', req.body);
    console.log('User:', req.user);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    if (req.user.role !== 'organizer') {
      console.log('User role check failed. Role:', req.user.role);
      return res.status(403).json({ success: false, message: 'Only organizers can create games' });
    }

    const { title, description, image, type } = req.body;
    console.log('Extracted data:', { title, description, image, type });

    console.log('Creating game with data:', {
      name: title,
      description: description || '',
      image: image || null,
      type,
      organizerId: req.user.id,
      status: 'draft'
    });

    const game = await Game.create({
      name: title,
      description: description || '',
      image: image || null,
      type,
      organizerId: req.user.id,
      status: 'draft'
    });

    console.log('Game created successfully:', game);

    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: { game: mapGameToResponse(game) }
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/games/:id
// @desc    Update game
// @access  Private (Game creator)
router.put('/:id', [
  authenticateSupabaseToken,
  body('title').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('image').optional().custom((value) => {
    if (!value) return true; // Allow empty/null values
    // Allow regular URLs or data URLs
    const urlPattern = /^https?:\/\/.+/;
    const dataUrlPattern = /^data:image\/.+;base64,.+/;
    if (urlPattern.test(value) || dataUrlPattern.test(value)) {
      return true;
    }
    throw new Error('Image must be a valid URL or data URL');
  }),
  body('config').optional().isObject(),
  body('settings').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updateData = {};
    if (req.body.title !== undefined) updateData.name = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.image !== undefined) updateData.image = req.body.image;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.status !== undefined) updateData.status = req.body.status;

    const updatedGame = await Game.update(req.params.id, updateData);

    res.json({ success: true, message: 'Game updated successfully', data: { game: mapGameToResponse(updatedGame) } });
  } catch (error) {
    console.error('Update game error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// @route   DELETE /api/games/:id
// @desc    Delete game
// @access  Private (Game creator)
router.delete('/:id', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await Game.delete(req.params.id);

    res.json({ success: true, message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/games/:id/start
// @desc    Start game
// @access  Private (Game creator)
router.post('/:id/start', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }
    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!['draft', 'paused'].includes(game.status)) {
      return res.status(400).json({ success: false, message: 'Game cannot be started from current status' });
    }

    const updatedGame = await Game.update(req.params.id, { status: 'active' });

    res.json({ success: true, message: 'Game started successfully', data: { game: mapGameToResponse(updatedGame) } });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/games/:id/pause
// @desc    Pause game
// @access  Private (Game creator)
router.post('/:id/pause', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }
    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (game.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Only active games can be paused' });
    }

    const updatedGame = await Game.update(req.params.id, { status: 'paused' });

    res.json({ success: true, message: 'Game paused successfully', data: { game: mapGameToResponse(updatedGame) } });
  } catch (error) {
    console.error('Pause game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/games/:id/resume
// @desc    Resume game
// @access  Private (Game creator)
router.post('/:id/resume', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }
    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (game.status !== 'paused') {
      return res.status(400).json({ success: false, message: 'Only paused games can be resumed' });
    }

    const updatedGame = await Game.update(req.params.id, { status: 'active' });

    res.json({ success: true, message: 'Game resumed successfully', data: { game: mapGameToResponse(updatedGame) } });
  } catch (error) {
    console.error('Resume game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/games/:id/complete
// @desc    Complete game
// @access  Private (Game creator)
router.post('/:id/complete', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }
    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (game.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Game is already completed' });
    }

    const updatedGame = await Game.update(req.params.id, { status: 'completed' });

    res.json({ success: true, message: 'Game completed successfully', data: { game: mapGameToResponse(updatedGame) } });
  } catch (error) {
    console.error('Complete game error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/:id/analytics
// @desc    Get game analytics
// @access  Private (Game creator)
router.get('/:id/analytics', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submissions = await Submission.findByGame(req.params.id, { limit: 10000 });
    const totalSubmissions = submissions.length;
    const byUser = new Map();
    let scoreSum = 0;
    let scoredCount = 0;
    for (const s of submissions) {
      if (!byUser.has(s.userId)) byUser.set(s.userId, true);
      if (typeof s.score === 'number') { scoreSum += s.score; scoredCount += 1; }
    }

    const analytics = {
      totalParticipants: byUser.size,
      totalSubmissions,
      averageScore: scoredCount ? scoreSum / scoredCount : 0,
      completionRate: 0
    };

    res.json({ success: true, data: { analytics } });
  } catch (error) {
    console.error('Get game analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/:id/leaderboard
// @desc    Get game leaderboard
// @access  Private (Game participants/creator)
router.get('/:id/leaderboard', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const submissions = await Submission.findByGame(req.params.id, { limit: 10000 });
    const scores = new Map();
    for (const s of submissions) {
      const score = typeof s.score === 'number' ? s.score : 0;
      scores.set(s.userId, (scores.get(s.userId) || 0) + score);
    }
    const leaderboard = Array.from(scores.entries())
      .map(([userId, score]) => ({ userId, score }))
      .sort((a, b) => b.score - a.score);

    res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    console.error('Get game leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
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

// @route   GET /api/games/:id/questions
// @desc    Get questions for a game
// @access  Private (Game creator)
router.get('/:id/questions', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const questions = await Question.findByGameId(req.params.id, game.missionOrder || 'point_value');

    const mappedQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      type: q.type,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: q.points,
      timeLimit: q.timeLimit,
      createdAt: q.createdAt
    }));

    res.json({ 
       success: true, 
       data: { 
         questions: mappedQuestions,
         missionOrder: game.missionOrder || 'point_value'
       }
     });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/games/:id/questions
// @desc    Create a new question for a game
// @access  Private (Game creator)
router.post('/:id/questions', [
  authenticateSupabaseToken,
  body('question').trim().isLength({ min: 1, max: 500 }).withMessage('Question is required and must be less than 500 characters'),
  body('type').isIn(['multiple_choice', 'true_false', 'short_answer']).withMessage('Invalid question type'),
  body('options').optional().isArray().withMessage('Options must be an array'),
  body('correctAnswer').trim().isLength({ min: 1 }).withMessage('Correct answer is required'),
  body('points').optional().isInt({ min: 0 }).withMessage('Points must be a positive integer'),
  body('timeLimit').optional().isInt({ min: 1 }).withMessage('Time limit must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const questionData = {
      gameId: req.params.id,
      question: req.body.question,
      type: req.body.type,
      options: req.body.options || null,
      correctAnswer: req.body.correctAnswer,
      points: req.body.points || 10,
      timeLimit: req.body.timeLimit || null
    };

    const question = await Question.create(questionData);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: { question: {
        id: question.id,
        question: question.question,
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        points: question.points,
        timeLimit: question.timeLimit,
        createdAt: question.createdAt
      }}
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/games/:id/questions/:questionId
// @desc    Update a question for a game
// @access  Private (Game creator)
router.put('/:id/questions/:questionId', [
  authenticateSupabaseToken,
  body('question').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Question must be less than 500 characters'),
  body('type').optional().isIn(['multiple_choice', 'true_false', 'short_answer']).withMessage('Invalid question type'),
  body('options').optional().isArray().withMessage('Options must be an array'),
  body('correctAnswer').optional().trim().isLength({ min: 1 }).withMessage('Correct answer is required'),
  body('points').optional().isInt({ min: 0 }).withMessage('Points must be a positive integer'),
  body('timeLimit').optional().isInt({ min: 1 }).withMessage('Time limit must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id: gameId, questionId } = req.params;
    const organizerId = req.user.id;

    // Check if game exists and belongs to organizer
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== organizerId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if question exists and belongs to this game
    const existingQuestion = await Question.findById(questionId);
    if (!existingQuestion) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (existingQuestion.gameId !== gameId) {
      return res.status(403).json({ success: false, message: 'Question does not belong to this game' });
    }

    // Update the question
    const updatedQuestion = await Question.update(questionId, req.body);

    res.json({ 
      success: true, 
      message: 'Question updated successfully',
      data: { 
        question: {
          id: updatedQuestion.id,
          question: updatedQuestion.question,
          type: updatedQuestion.type,
          options: updatedQuestion.options,
          correctAnswer: updatedQuestion.correctAnswer,
          points: updatedQuestion.points,
          timeLimit: updatedQuestion.timeLimit,
          createdAt: updatedQuestion.createdAt,
          updatedAt: updatedQuestion.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/games/:id/questions/:questionId
router.delete('/:id/questions/:questionId', [authenticateSupabaseToken], async (req, res) => {
  try {
    const { id: gameId, questionId } = req.params;
    const organizerId = req.user.id;

    // Check if game exists and belongs to organizer
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== organizerId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if question exists and belongs to this game
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (question.gameId !== gameId) {
      return res.status(403).json({ success: false, message: 'Question does not belong to this game' });
    }

    // Delete the question
    await Question.delete(questionId);

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/games/:id/join-code/generate
// @desc    Generate a new join code for a private game
// @access  Private (Game creator)
router.post('/:id/join-code/generate', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Allow join codes for draft and published games
    // Note: Join codes can be generated for draft games but only work when published

    const joinCode = await JoinCodeGenerator.assignJoinCodeToGame(req.params.id);

    res.json({ 
      success: true, 
      message: 'Join code generated successfully',
      data: { joinCode } 
    });
  } catch (error) {
    console.error('Generate join code error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/games/:id/join-code
// @desc    Remove join code from a game (disable access)
// @access  Private (Game creator)
router.delete('/:id/join-code', [authenticateSupabaseToken], async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found' });
    }

    if (game.organizerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await JoinCodeGenerator.removeJoinCodeFromGame(req.params.id);

    res.json({ 
      success: true, 
      message: 'Join code removed successfully' 
    });
  } catch (error) {
    console.error('Remove join code error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/games/join/:code
// @desc    Find and access game by join code
// @access  Public (for participants)
router.get('/join/:code', async (req, res) => {
  try {
    const { code } = req.params;

    if (!JoinCodeGenerator.isValidFormat(code)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid join code format' 
      });
    }

    const game = await JoinCodeGenerator.findGameByJoinCode(code);

    if (!game) {
      return res.status(404).json({ 
        success: false, 
        message: 'Game not found or join code is invalid' 
      });
    }

    // Return limited game information for participants
    const gameInfo = {
      id: game.id,
      title: game.title,
      description: game.description,
      image: game.image,
      type: game.type,
      status: game.status,
      startTime: game.start_time,
      endTime: game.end_time,
      maxParticipants: game.max_participants
    };

    res.json({ 
      success: true, 
      data: { game: gameInfo } 
    });
  } catch (error) {
    console.error('Join game by code error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/games/join/:code
// @desc    Join a game using join code
// @access  Private (authenticated participants)
router.post('/join/:code', [authenticateSupabaseToken], async (req, res) => {
  try {
    const { code } = req.params;

    if (!JoinCodeGenerator.isValidFormat(code)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid join code format' 
      });
    }

    const game = await JoinCodeGenerator.findGameByJoinCode(code);

    if (!game) {
      return res.status(404).json({ 
        success: false, 
        message: 'Game not found or join code is invalid' 
      });
    }

    // Check if game is in a joinable state
    if (game.status !== 'active') {
      return res.status(400).json({ 
        success: false, 
        message: 'This game is not currently accepting participants' 
      });
    }

    // TODO: Add participant to game (this would require a participants table)
    // For now, just return success with game info

    const gameInfo = {
      id: game.id,
      title: game.title,
      description: game.description,
      image: game.image,
      type: game.type,
      status: game.status,
      startTime: game.start_time,
      endTime: game.end_time,
      maxParticipants: game.max_participants
    };

    res.json({ 
      success: true, 
      message: 'Successfully joined the game',
      data: { game: gameInfo } 
    });
  } catch (error) {
    console.error('Join game by code error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

function mapGameToResponse(g) {
  return {
    id: g.id,
    title: g.name || g.title,
    description: g.description,
    image: g.image,
    type: g.type,
    status: g.status,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
    eventId: g.eventId,
    isPublic: g.isActive,
    joinCode: g.joinCode || g.join_code
  };
}