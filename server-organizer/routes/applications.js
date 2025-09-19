const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateSupabaseToken, requireOrganizer } = require('../middleware/supabaseAuth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for application submissions
const applicationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 application submissions per hour
  message: {
    error: 'Too many application submissions, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// In-memory storage for applications (replace with database in production)
let applications = [];
let applicationCounter = 1;

// @route   POST /api/organizer/applications
// @desc    Submit a new organizer application
// @access  Public
router.post('/applications', [
  applicationLimiter,
  body('organizationInfo.name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Organization name is required'),
  body('organizationInfo.type')
    .isIn(['school', 'university', 'company', 'nonprofit', 'government', 'other'])
    .withMessage('Invalid organization type'),
  body('organizationInfo.size')
    .isIn(['1-10', '11-50', '51-200', '201-1000', '1000+'])
    .withMessage('Invalid organization size'),
  body('organizationInfo.website')
    .optional()
    .isURL()
    .withMessage('Please enter a valid website URL'),
  body('organizationInfo.description')
    .trim()
    .isLength({ min: 50 })
    .withMessage('Please provide at least 50 characters describing your organization'),
  body('organizationInfo.expectedEvents')
    .isIn(['1-5', '6-20', '21-50', '50+'])
    .withMessage('Invalid expected events range'),
  body('contactInfo.firstName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Contact person first name must be at least 2 characters'),
  body('contactInfo.lastName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Contact person last name must be at least 2 characters'),
  body('contactInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('contactInfo.phone')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Please enter a valid phone number'),
  body('contactInfo.address')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Please enter a complete address')
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

    const { organizationInfo, contactInfo } = req.body;

    // Check if email already has a pending application
    const existingApplication = applications.find(
      app => app.contactInfo.email === contactInfo.email && 
             ['pending', 'under_review'].includes(app.status)
    );

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message: 'An application with this email is already pending review'
      });
    }

    // Create new application
    const applicationId = `APP-${Date.now()}-${applicationCounter++}`;
    const newApplication = {
      id: applicationId,
      status: 'pending',
      submittedAt: new Date(),
      lastUpdated: new Date(),
      organizationInfo,
      contactInfo
    };

    applications.push(newApplication);

    // Send confirmation email (placeholder)
    console.log(`Sending confirmation email to ${contactInfo.email} for application ${applicationId}`);

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        applicationId,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during application submission'
    });
  }
});

// @route   GET /api/organizer/applications/:id
// @desc    Get application status by ID
// @access  Public
router.get('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const application = applications.find(app => app.id === id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/organizer/applications
// @desc    Get all applications (organizer only)
// @access  Private (Organizer only)
router.get('/applications', [
  authenticateSupabaseToken,
  requireOrganizer,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['pending', 'under_review', 'approved', 'rejected', 'requires_info']),
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

    const { page = 1, limit = 10, status, search } = req.query;
    
    let filteredApplications = applications;
    
    // Filter by status
    if (status) {
      filteredApplications = filteredApplications.filter(app => app.status === status);
    }
    
    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredApplications = filteredApplications.filter(app => 
        app.organizationInfo.name.toLowerCase().includes(searchLower) ||
        app.contactInfo.email.toLowerCase().includes(searchLower) ||
        app.contactInfo.firstName.toLowerCase().includes(searchLower) ||
        app.contactInfo.lastName.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedApplications = filteredApplications.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        applications: paginatedApplications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredApplications.length,
          pages: Math.ceil(filteredApplications.length / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/organizer/applications/:id/status
// @desc    Update application status (organizer only)
// @access  Private (Organizer only)
router.put('/applications/:id/status', [
  authenticateSupabaseToken,
  requireOrganizer,
  body('status')
    .isIn(['pending', 'under_review', 'approved', 'rejected', 'requires_info'])
    .withMessage('Invalid status'),
  body('reviewNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Review notes must be less than 1000 characters')
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

    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    const applicationIndex = applications.findIndex(app => app.id === id);
    
    if (applicationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update application
    applications[applicationIndex] = {
      ...applications[applicationIndex],
      status,
      reviewNotes,
      reviewedBy: req.user.email,
      reviewedAt: new Date(),
      lastUpdated: new Date()
    };

    // Send status update email (placeholder)
    console.log(`Sending status update email for application ${id}: ${status}`);

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: applications[applicationIndex]
    });

  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;