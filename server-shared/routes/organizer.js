const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { userService, gameService, submissionService, analyticsService } = require('../services/firestoreService');
const { authenticateSupabaseToken, requireOrganizer } = require('../middleware/supabaseAuth');

const router = express.Router();

// Middleware to require organizer role is imported from supabaseAuth

// @route   GET /api/organizer/dashboard
// @desc    Get organizer dashboard data
// @access  Private (Organizer only)
router.get('/dashboard', [authenticateSupabaseToken, requireOrganizer], async (req, res) => {
  try {
    const organizerId = req.user.uid;
    
    const [stats, activity] = await Promise.all([
      analyticsService.getOrganizerDashboardStats(organizerId),
      analyticsService.getOrganizerRecentActivity(organizerId, 5)
    ]);

    res.json({
      success: true,
      data: {
        stats,
        recentActivity: activity
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

// @route   GET /api/organizer/games/active
// @desc    Get organizer's active games
// @access  Private (Organizer only)
router.get('/games/active', [authenticateSupabaseToken, requireOrganizer], async (req, res) => {
  try {
    const organizerId = req.user.uid;
    
    // Get active games for this organizer
    const activeGames = await gameService.getActiveGamesByOrganizer(organizerId);
    
    res.json({
      success: true,
      games: activeGames
    });
  } catch (error) {
    console.error('Error fetching active games:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch active games' 
    });
  }
});



module.exports = router;