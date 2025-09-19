const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * User validation rules
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  handleValidationErrors
];





/**
 * Game validation rules
 */
const validateGameCreation = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Game title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Game description must not exceed 500 characters'),
  body('type')
    .isIn(['scavenger_hunt', 'dj_song_voting', 'guess_the_song', 'trivia', 'hangman', 'word_scramble', 'creative_challenge', 'truth_or_dare'])
    .withMessage('Invalid game type'),

  body('pointsPerCorrect')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points per correct answer must be between 1 and 1000'),
  body('timeLimit')
    .optional()
    .isInt({ min: 10, max: 3600 })
    .withMessage('Time limit must be between 10 seconds and 1 hour'),
  handleValidationErrors
];

const validateGameUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Game title must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Game description must not exceed 500 characters'),
  body('pointsPerCorrect')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Points per correct answer must be between 1 and 1000'),
  body('timeLimit')
    .optional()
    .isInt({ min: 10, max: 3600 })
    .withMessage('Time limit must be between 10 seconds and 1 hour'),
  handleValidationErrors
];

/**
 * Submission validation rules
 */
const validateSubmissionCreation = [
  body('gameId')
    .isUUID()
    .withMessage('Invalid game ID'),

  body('content.text')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Text content must not exceed 1000 characters'),
  body('content.location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('content.location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  handleValidationErrors
];

/**
 * Common parameter validations
 */
const validateUUID = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Custom validation functions
 */
const validateEventCode = (code) => {
  const eventCodeRegex = /^[A-Z0-9]{6}$/;
  return eventCodeRegex.test(code);
};

const validateFileType = (mimetype, allowedTypes = []) => {
  const defaultAllowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/mp3'
  ];
  
  const typesToCheck = allowedTypes.length > 0 ? allowedTypes : defaultAllowedTypes;
  return typesToCheck.includes(mimetype);
};

const validateFileSize = (size, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return size <= maxSizeBytes;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>"'&]/g, (match) => {
      const entities = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return entities[match];
    });
};

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange,
  validateGameCreation,
  validateGameUpdate,
  validateSubmissionCreation,
  validateUUID,
  validatePagination,
  validateDateRange,
  validateEventCode,
  validateFileType,
  validateFileSize,
  sanitizeInput
};