const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');

const Game = require('../models/Game');
const Submission = require('../models/Submission');
const { authenticateSupabaseToken, requireOrganizer } = require('../middleware/supabaseAuth');
const { supabase } = require('../config/supabase');

const router = express.Router();

// @route   GET /api/organizer/dashboard
// @desc    Get organizer dashboard data
// @access  Private (Organizer only)
router.get('/dashboard', [authenticateSupabaseToken, requireOrganizer], async (req, res) => {
  try {
    const organizerId = req.user.id;
    
    // Get dashboard stats directly from models
    const [totalGames, totalSubmissions] = await Promise.all([
      Game.findAll({ organizerId }),
      Submission.findAll({ organizerId })
    ]);

    const stats = {
      totalGames: totalGames.length,
      totalSubmissions: totalSubmissions.length
    };

    // Get recent activity (empty for now)
    const recentActivity = [];

    res.json({
      success: true,
      data: {
        stats,
        recentActivity
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











// @route   GET /api/organizer/analytics
// @desc    Get analytics for organizer's games
// @access  Private (Organizer only)
router.get('/analytics', [
  authenticateSupabaseToken,
  requireOrganizer,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
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
    const { startDate, endDate } = req.query;

    // Get games and submissions for analytics
    const [games, submissions] = await Promise.all([
      Game.findAll({ organizerId }),
      Submission.findAll({ organizerId })
    ]);

    // Filter by date range if provided
    let filteredGames = games;
    if (startDate || endDate) {
      filteredGames = games.filter(game => {
        const gameDate = new Date(game.createdAt);
        if (startDate && gameDate < new Date(startDate)) return false;
        if (endDate && gameDate > new Date(endDate)) return false;
        return true;
      });
    }

    const analytics = {
      totalGames: filteredGames.length,
      totalSubmissions: submissions.length,
      averageSubmissionsPerGame: filteredGames.length > 0 ? submissions.length / filteredGames.length : 0,
      gamesByType: filteredGames.reduce((acc, game) => {
        acc[game.type] = (acc[game.type] || 0) + 1;
        return acc;
      }, {}),
      gamesByStatus: filteredGames.reduce((acc, game) => {
        acc[game.status] = (acc[game.status] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;