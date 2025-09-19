const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

// Note: This route module supports 'organizer' and 'participant' roles; legacy privileged role is no longer used.

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function to format user data
const formatUserData = (user) => {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role || 'participant',
    avatar: user.avatar,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  };
};

// @route   POST /api/auth/login
// @desc    Login user with email and password
// @access  Public
router.post('/login', [
  authLimiter,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    return res.status(501).json({
      success: false,
      message: 'Traditional login is deprecated. Please use Supabase Authentication.'
    });

    // Format user data
    const userData = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/auth/register
// @desc    Complete user registration after Supabase auth
// @access  Public (requires Supabase token)
router.post('/register', [
  authLimiter,
  authenticateSupabaseToken,
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  body('role')
    .optional()
    .isIn(['organizer', 'participant'])
    .withMessage('Invalid role')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, role = 'participant' } = req.body;
    const { id: uid, email } = req.user;

    // Check if user profile already exists
    const existingUser = await User.findBySupabaseId(uid);
    if (existingUser && existingUser.firstName) {
      return res.status(400).json({
        success: false,
        message: 'User profile already completed'
      });
    }

    // Create or update user profile in Supabase
    const userData = {
      supabaseId: uid,
      email,
      firstName,
      lastName,
      role: role || 'participant',
      isActive: true,
      lastLogin: new Date().toISOString()
    };

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'User profile created successfully',
      data: {
        user: formatUserData(user)
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/verify
// @desc    Verify Supabase token and get user data
// @access  Public (requires Supabase token)
router.post('/verify', [
  authLimiter,
  authenticateSupabaseToken
], async (req, res) => {
  try {
    const { id: uid } = req.user;

    // Get user data from Supabase
    let user = await User.findBySupabaseId(uid);
    
    // If user doesn't exist in Supabase, create basic profile
    if (!user) {
      const basicUserData = {
        supabaseId: uid,
        email: req.user.email,
        role: 'participant',
        isActive: true,
        lastLogin: new Date().toISOString()
      };
      user = await User.create(basicUserData);
    } else {
      // Update last login
      await user.update({
        lastLogin: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Token verified successfully',
      data: {
        user: formatUserData(user)
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticateSupabaseToken, async (req, res) => {
  try {
    const { id: uid } = req.user;
    const user = await User.findBySupabaseId(uid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user: formatUserData(user) }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  authenticateSupabaseToken,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name cannot be empty')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, avatar } = req.body;
    const { id: uid } = req.user;

    const user = await User.findBySupabaseId(uid);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (avatar) updateData.avatar = avatar;

    const updatedUser = await user.update(updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: formatUserData(updatedUser) }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateSupabaseToken, (req, res) => {
  // In Supabase auth, logout is handled client-side
  // This endpoint exists for consistency
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;