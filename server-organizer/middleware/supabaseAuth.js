const User = require('../models/User');
const { supabase, supabaseAdmin } = require('../config/supabase');

// Authenticate Supabase JWT token
const authenticateSupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error: 'Invalid or expired token'
      });
    }

    // Try to enrich from our DB, but don't fail auth if DB unavailable
    let dbUser = null;
    try {
      dbUser = await User.findById(user.id);
      if (dbUser) {
        await User.update(user.id, { lastLoginAt: new Date().toISOString() });
      }
    } catch (dbErr) {
      console.warn('Auth middleware DB lookup/update failed:', dbErr?.message || dbErr);
    }

    const firstName = dbUser?.firstName || user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || 'User';
    const lastName = dbUser?.lastName || user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || '';
    const role = dbUser?.role || user.user_metadata?.role || 'participant';
    const isActive = dbUser?.isActive !== undefined ? dbUser.isActive : true;

    req.user = {
      id: user.id,
      email: user.email,
      firstName,
      lastName,
      role,
      isActive,
      emailVerified: !!user.email_confirmed_at,
      supabaseUserId: user.id
    };

    // If user exists in DB and is deactivated, block access
    if (dbUser && dbUser.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        error: 'Account is deactivated'
      });
    }

    next();
  } catch (error) {
    console.error('Supabase auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: 'Authentication failed'
    });
  }
};

// Optional middleware for routes that can work with or without authentication
const optionalSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Verify the JWT token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (!error && user) {
          let dbUser = null;
          try {
            dbUser = await User.findById(user.id);
          } catch (dbErr) {
            console.warn('Optional auth DB lookup failed:', dbErr?.message || dbErr);
          }

          req.user = {
            id: user.id,
            email: user.email,
            firstName: dbUser?.firstName || user.user_metadata?.first_name || 'User',
            lastName: dbUser?.lastName || user.user_metadata?.last_name || '',
            role: dbUser?.role || user.user_metadata?.role || 'participant',
            isActive: dbUser?.isActive !== undefined ? dbUser.isActive : true,
            emailVerified: !!user.email_confirmed_at,
            supabaseUserId: user.id
          };
        }
      } catch (authError) {
        // Silently fail for optional auth
        console.log('Optional auth failed:', authError.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional Supabase auth middleware error:', error);
    next(); // Continue without authentication for optional routes
  }
};

// Legacy privileged middleware removed
// Legacy privileged role deprecated
const requireOrganizer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'organizer') {
    return res.status(403).json({
      success: false,
      message: 'Organizer access required',
      error: 'Organizer access required'
    });
  }

  next();
};

// Require specific role(s)
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    next();
  };
};

// Require email verification
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'Authentication required'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      error: 'Email verification required'
    });
  }

  next();
};

// Service role authentication for internal service communication
const requireServiceRole = async (req, res, next) => {
  try {
    const serviceKey = req.headers['x-service-key'];

    if (!serviceKey) {
      return res.status(401).json({
        success: false,
        message: 'Service key required',
        error: 'Service key required'
      });
    }
    
    // Verify service key with Supabase service role
    const { data, error } = await supabaseAdmin.auth.getUser(serviceKey);
    
    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid service key'
      });
    }
    
    req.serviceAuth = true;
    next();
  } catch (error) {
    console.error('Service role auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Service authentication failed',
      error: 'Service authentication failed'
    });
  }
};

module.exports = {
  authenticateSupabaseToken,
  optionalSupabaseAuth,
  requireOrganizer,
  requireRole,
  requireEmailVerification,
  requireServiceRole
};