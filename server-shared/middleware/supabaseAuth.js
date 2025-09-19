const User = require('../models/User');
const { supabase, supabaseAdmin } = require('../config/supabase');

// Authenticate Supabase JWT token
const authenticateSupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'No token provided' 
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token' 
      });
    }
    
    // Get user data from our database
    const userData = await User.findById(user.id);
    
    if (!userData) {
      // If user doesn't exist in our database, create them
      const newUserData = {
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || 'User',
        lastName: user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
        role: user.user_metadata?.role || 'participant',
        isActive: true,
        emailVerified: user.email_confirmed_at ? true : false,
        lastLoginAt: new Date(),
        supabaseUserId: user.id
      };
      
      const createdUser = await User.create(newUserData);
      req.user = {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        role: createdUser.role,
        isActive: createdUser.isActive,
        emailVerified: createdUser.emailVerified,
        supabaseUserId: user.id
      };
    } else {
      // Update last login time
      await userData.update({ lastLoginAt: new Date() });
      
      req.user = {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: userData.isActive,
        emailVerified: userData.emailVerified,
        supabaseUserId: user.id
      };
    }
    
    // Check if user is active
    if (!req.user.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Account is deactivated' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Supabase auth middleware error:', error);
    return res.status(401).json({ 
      success: false,
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
          // Get user data from our database
          const userData = await User.findById(user.id);
          
          if (userData && userData.isActive) {
            req.user = {
              id: userData.id,
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role,
              isActive: userData.isActive,
              emailVerified: userData.emailVerified,
              supabaseUserId: user.id
            };
          }
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

// Authorization: organizer role required (legacy privileged role removed)
const requireOrganizer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  if (req.user.role !== 'organizer') {
    return res.status(403).json({
      success: false,
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
        error: 'Authentication required'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
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
      error: 'Authentication required'
    });
  }
  
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
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
    console.error('Service auth middleware error:', error);
    return res.status(401).json({
      success: false,
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