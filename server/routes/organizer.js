const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Game = require('../models/Game');
const Submission = require('../models/Submission');
const { authenticateSupabaseToken, requireOrganizer } = require('../middleware/supabaseAuth');

const router = express.Router();

// @route   GET /api/organizer/dashboard
// @desc    Get organizer dashboard data
// @access  Private (Organizer only)
router.get('/dashboard', [authenticateSupabaseToken, requireOrganizer], async (req, res) => {
  try {
    const organizerId = req.user.id;
    
    // Get organizer's games
    const allGames = await Game.findAll();
    const organizerGames = allGames.filter(game => game.organizerId === organizerId);
    const totalGames = organizerGames.length;
    const activeGames = organizerGames.filter(game => game.status === 'active').length;
    
    // Get recent submissions for activity
    const allSubmissions = await Submission.findAll();
    const organizerGameIds = organizerGames.map(game => game.id);
    const recentSubmissions = allSubmissions
      .filter(submission => organizerGameIds.includes(submission.gameId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(submission => ({
        id: submission._id,
        type: 'submission',
        description: `New submission for ${submission.gameType}`,
        timestamp: submission.createdAt,
        gameId: submission.gameId
      }));

    const stats = {
      totalGames,
      activeGames
    };

    res.json({
      success: true,
      data: {
        stats,
        recentActivity: recentSubmissions
      }
    });
  } catch (error) {
    console.error('Error fetching organizer dashboard:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard data' 
    });
  }
});

// @route   GET /api/organizer/games
// @desc    Get organizer's games
// @access  Private (Organizer only)
router.get('/games', [
  authenticateSupabaseToken,
  requireOrganizer,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['active', 'upcoming', 'completed', 'cancelled']),
  query('search').optional().trim()
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

    const organizerId = req.user.id;
    const { page = 1, limit = 10, status, search } = req.query;

    // Get organizer's games
    let games = await Game.findAll();
    games = games.filter(game => game.organizerId === organizerId);
    
    // Apply filters
    if (status) {
      games = games.filter(game => game.status === status);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      games = games.filter(game => 
        game.title.toLowerCase().includes(searchLower) ||
        game.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedGames = games.slice(startIndex, endIndex);
    const totalGames = games.length;
    const totalPages = Math.ceil(totalGames / limitNum);

    res.json({
      success: true,
      data: {
        games: paginatedGames,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalGames,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    console.error('Get organizer games error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});



module.exports = router;