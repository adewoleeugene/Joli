const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');
const { User } = require('../models/User');
const rateLimit = require('express-rate-limit');

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
    firstName: user.firstName || user.first_name,
    lastName: user.lastName || user.last_name,
    role: user.role || 'participant',
    avatar: user.avatar,
    createdAt: user.createdAt || user.created_at,
    lastLogin: user.lastLogin || user.last_login
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
    const { id, email } = req.user;

    // Check if user profile already exists
    const existingUser = await User.findById(id);
    if (existingUser && (existingUser.firstName || existingUser.first_name)) {
      return res.status(400).json({
        success: false,
        message: 'User profile already completed'
      });
    }

    // Create or update user profile in Supabase
    const userData = {
      id,
      email,
      first_name: firstName,
      last_name: lastName,
      role: role || 'participant',
      is_active: true,
      last_login: new Date().toISOString()
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
    const { id } = req.user;

    // Get user data from Supabase
    let user = await User.findById(id);
    
    // If user doesn't exist in Supabase, create basic profile
    if (!user) {
      const basicUserData = {
        id,
        email: req.user.email,
        role: 'participant',
        is_active: true,
        last_login: new Date().toISOString()
      };
      user = await User.create(basicUserData);
    } else {
      // Update last login
      user = await User.updateById(id, {
        last_login: new Date().toISOString()
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
    const { id } = req.user;
    const user = await User.findById(id);

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
// @desc    Update user profile with comprehensive validation and security
// @access  Private
router.put('/profile', [
  authenticateSupabaseToken,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  body('avatar')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Avatar must be a valid URL')
    .isLength({ max: 500 })
    .withMessage('Avatar URL cannot exceed 500 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Phone number must be a valid format'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 13 || age > 120) {
        throw new Error('Age must be between 13 and 120 years');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value
        }))
      });
    }

    const { firstName, lastName, avatar, bio, phone, dateOfBirth } = req.body;
    const { id } = req.user;

    // Check if user exists and is active
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Prepare update data with sanitization
    const updateData = {};
    
    if (firstName !== undefined) {
      updateData.first_name = firstName.trim();
    }
    
    if (lastName !== undefined) {
      updateData.last_name = lastName.trim();
    }
    
    if (avatar !== undefined) {
      updateData.avatar = avatar.trim() || null;
    }
    
    if (bio !== undefined) {
      updateData.bio = bio.trim() || null;
    }
    
    if (phone !== undefined) {
      updateData.phone = phone.trim() || null;
    }
    
    if (dateOfBirth !== undefined) {
      updateData.date_of_birth = dateOfBirth;
    }

    // Add update timestamp
    updateData.updated_at = new Date().toISOString();

    // Perform the update
    const updatedUser = await User.updateById(id, updateData);

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }

    // Log the update for security audit
    console.log(`Profile updated for user ${id} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { 
        user: formatUserData(updatedUser),
        updatedFields: Object.keys(updateData).filter(key => key !== 'updated_at')
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        message: 'Profile data conflicts with existing records'
      });
    }
    
    if (error.code === '23503') { // Foreign key constraint violation
      return res.status(400).json({
        success: false,
        message: 'Invalid reference data provided'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});





// @route   POST /api/auth/logout
// @desc    Logout user and invalidate Supabase session
// @access  Private
router.post('/logout', authenticateSupabaseToken, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Sign out from Supabase
    const { supabaseAdmin } = require('../config/supabase');
    const { error } = await supabaseAdmin.auth.admin.signOut(token);

    if (error) {
      console.error('Logout error:', error);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
});

module.exports = router;