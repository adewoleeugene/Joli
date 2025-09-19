const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Authentication rate limiter (relaxed in development)
const AUTH_LIMIT_MAX = process.env.NODE_ENV === 'production' ? 5 : 100;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: AUTH_LIMIT_MAX, // higher limit during development to prevent accidental lockouts
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
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
    createdAt: user.createdAt || user.created_at,
    lastLogin: user.lastLoginAt || user.last_login_at || user.lastLogin
  };
};

// @route   POST /api/auth/login
// @desc    Login user with email and password (for organizer portal)
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
// @route   POST /api/auth/register
// @desc    Register new user with Supabase and create profile
// @access  Public
router.post('/register', [
  authLimiter,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
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

    const { email, password, firstName, lastName, role = 'organizer', organizationName, organizationDescription } = req.body;
    const { supabase, supabaseAdmin, isMockSupabase } = require('../config/supabase');

    // Create user in Supabase (service role API)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role,
        organization_name: organizationName,
        organization_description: organizationDescription
      }
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(400).json({
        success: false,
        message: authError.message || 'Failed to create user account'
      });
    }

    const { user: supabaseUser } = authData;

    // Create user profile in our database
    const userData = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      firstName,
      lastName,
      role,
      organizationName: organizationName || '',
      organizationDescription: organizationDescription || '',
      isActive: true,
      emailVerified: true,
      lastLoginAt: new Date()
    };

    const user = await User.create(userData);

    // Sign in the newly created user to obtain an access token
    let accessToken = null;
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        console.warn('Supabase signInWithPassword failed, falling back to magic link:', signInError.message);
      } else {
        accessToken = signInData?.session?.access_token || null;
      }
    } catch (e) {
      console.warn('Supabase sign-in unexpected error:', e?.message || e);
    }

    // In mock mode, synthesize a token if still missing
    if (!accessToken && isMockSupabase) {
      accessToken = `dev|mock-user|${email}`;
    }

    // Fallback: generate a magic link if no token (does not provide token but useful for clients)
    let magicLink = null;
    if (!accessToken) {
      try {
        // Use Supabase service role to generate a magic link
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email
        });
        if (!sessionError) {
          magicLink = sessionData?.action_link || null;
        }
      } catch (e) {
        console.warn('Supabase generateLink failed:', e?.message || e);
      }
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: formatUserData(user),
        token: accessToken,
        magicLink: accessToken ? undefined : magicLink
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

// @route   POST /api/auth/complete-profile
// @desc    Complete user profile after Supabase authentication
// @access  Private
router.post('/complete-profile', [
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
    const existingUser = await User.findById(uid);
    if (existingUser && existingUser.firstName) {
      return res.status(400).json({
        success: false,
        message: 'User profile already completed'
      });
    }

    // Create or update user profile
    const userData = {
      email,
      firstName,
      lastName,
      role: role || 'participant',
      isActive: true,
      isDeleted: false,
      lastLoginAt: new Date()
    };

    const user = await User.create({ id: uid, ...userData });

    res.status(201).json({
      success: true,
      message: 'User profile created successfully',
      data: {
        user: formatUserData(user)
      }
    });
  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile completion'
    });
  }
});

// @route   POST /api/auth/verify
// @desc    Verify Supabase token and get user data
// @access  Public (requires Firebase ID token)
router.post('/verify', [
  authLimiter,
  authenticateSupabaseToken
], async (req, res) => {
  try {
    const { id: uid } = req.user;

    // Get user data from Firestore
    let user = await User.findById(uid);
    
    // If user doesn't exist in Firestore, create basic profile
    if (!user) {
      const basicUserData = {
        email: req.user.email,
        role: 'participant',
        isActive: true,
        isDeleted: false,
        lastLogin: new Date()
      };
      user = await User.create({ id: uid, ...basicUserData });
    } else {
      // Update last login
      user = await User.update(uid, {
        lastLoginAt: new Date().toISOString()
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
    const { id: uid, email, firstName, lastName, role } = req.user;
    let user = await User.findById(uid);

    if (!user) {
      try {
        user = await User.create({
          id: uid,
          email,
          firstName: firstName || 'User',
          lastName: lastName || '',
          role: role || 'organizer',
          organizationName: '',
          organizationDescription: '',
          isActive: true
        });
      } catch (createError) {
        console.error('Error creating user:', createError);
        return res.status(500).json({
          success: false,
          message: 'Error creating user profile'
        });
      }
    }

    res.json({
      success: true,
      data: {
        user: formatUserData(user)
      }
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

    const user = await User.findById(uid);
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

    const updatedUser = await User.update(uid, updateData);

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