const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../config/supabase');
const User = require('../models/User');
const { authenticateSupabaseToken, optionalSupabaseAuth } = require('../middleware/supabaseAuth');
const rateLimit = require('express-rate-limit');

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

// Register a new user
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'participant' } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, and last name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate role
    if (!['organizer', 'participant'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be organizer or participant'
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role: role
      },
      email_confirm: false // Set to true if you want to require email confirmation
    });

    if (authError) {
      console.error('Supabase auth error:', authError);
      return res.status(400).json({
        success: false,
        message: authError.message || 'Failed to create user account'
      });
    }

    // Create user in our database
    const userData = {
      id: authData.user.id,
      email: authData.user.email,
      firstName,
      lastName,
      role,
      isActive: true,
      emailVerified: authData.user.email_confirmed_at ? true : false,
      supabaseUserId: authData.user.id
    };

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    });
  }
});

// Login user
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        message: authError.message || 'Invalid credentials'
      });
    }

    // Get user from our database
    const user = await User.findById(authData.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login time
    await user.update({ lastLoginAt: new Date() });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
});

// Logout user
router.post('/logout', authenticateSupabaseToken, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Sign out from Supabase
    const { error } = await supabase.auth.admin.signOut(token);

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

// Get current user profile
router.get('/me', authenticateSupabaseToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          avatar: user.profileImage || null
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user profile
router.put('/profile', authenticateSupabaseToken, async (req, res) => {
  try {
    const { firstName, lastName, avatar } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (typeof avatar === 'string') updateData.profileImage = avatar;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update(updateData);

    // Update Supabase user metadata
    if (firstName || lastName) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(req.user.supabaseUserId, {
        user_metadata: {
          first_name: firstName || user.firstName,
          last_name: lastName || user.lastName
        }
      });

      if (error) {
        console.error('Error updating Supabase user metadata:', error);
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          avatar: user.profileImage || null
        }
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password
router.put('/change-password', authenticateSupabaseToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Verify current password by attempting to sign in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: currentPassword
    });

    if (verifyError) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password in Supabase
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.user.supabaseUserId, {
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: updateError.message || 'Failed to update password'
      });
    }

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Send password reset email via Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`
    });

    if (error) {
      console.error('Password reset error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to send password reset email'
      });
    }

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Verify token and update password
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery'
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid or expired token'
      });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: updateError.message || 'Failed to update password'
      });
    }

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Refresh the session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid refresh token'
      });
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Token and email are required'
      });
    }

    // Verify email with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Invalid verification token'
      });
    }

    // Update user in our database
    const user = await User.findById(data.user.id);
    if (user) {
      await user.update({ emailVerified: true });
    }

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Resend verification email
router.post('/resend-verification', optionalSupabaseAuth, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to resend verification email'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;