const express = require('express');
const { body, validationResult, query } = require('express-validator');
// Remove direct model imports; use services instead
// const { User, Event, Game, Submission } = require('../models');
const { authenticateSupabaseToken, requireOrganizer } = require('../middleware/supabaseAuth');

const router = express.Router();

// @route   GET /api/organizer/dashboard
// @desc    Get organizer dashboard data
// @access  Private (Organizer only)
router.get('/dashboard', [authenticateSupabaseToken, requireOrganizer], async (req, res) => {
  try {
    const organizerId = req.user.uid;

    // Simple dashboard focused on games only
    const stats = {
      totalGames: 0,
      activeGames: 0,
      totalSubmissions: 0,
      pendingSubmissions: 0
    };

    res.json({
      success: true,
      data: {
        stats,
        recentActivity: []
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



module.exports = router;