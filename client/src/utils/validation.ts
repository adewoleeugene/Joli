export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationRule[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  firstError?: ValidationError;
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  name: /^[a-zA-Z\s\-'\.]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_\.]+$/
};

// Common validation messages
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Cannot exceed ${max} characters`,
  pattern: 'Invalid format',
  email: 'Please enter a valid email address',
  url: 'Please enter a valid URL',
  name: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
  phone: 'Please enter a valid phone number',
  age: 'Age must be between 13 and 120 years'
};

// Sanitization functions
export const sanitize = {
  text: (value: string): string => {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/\s+/g, ' ');
  },
  
  name: (value: string): string => {
    if (typeof value !== 'string') return '';
    return value.trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-'\.]/g, '');
  },
  
  url: (value: string): string => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
  },
  
  phone: (value: string): string => {
    if (typeof value !== 'string') return '';
    return value.replace(/[^\d\+]/g, '');
  }
};

// Validation functions
export const validate = {
  required: (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },

  minLength: (value: string, min: number): boolean => {
    if (typeof value !== 'string') return false;
    return value.trim().length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    if (typeof value !== 'string') return true;
    return value.trim().length <= max;
  },

  pattern: (value: string, pattern: RegExp): boolean => {
    if (typeof value !== 'string') return false;
    return pattern.test(value.trim());
  },

  email: (value: string): boolean => {
    return validate.pattern(value, VALIDATION_PATTERNS.email);
  },

  url: (value: string): boolean => {
    return validate.pattern(value, VALIDATION_PATTERNS.url);
  },

  name: (value: string): boolean => {
    return validate.pattern(value, VALIDATION_PATTERNS.name);
  },

  phone: (value: string): boolean => {
    return validate.pattern(value, VALIDATION_PATTERNS.phone);
  },

  age: (dateOfBirth: string): boolean => {
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return age - 1 >= 13 && age - 1 <= 120;
      }
      
      return age >= 13 && age <= 120;
    } catch {
      return false;
    }
  }
};

// Main validation function
export const validateField = (
  value: any, 
  rules: ValidationRule | ValidationRule[], 
  fieldName: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const ruleArray = Array.isArray(rules) ? rules : [rules];

  for (const rule of ruleArray) {
    // Required validation
    if (rule.required && !validate.required(value)) {
      errors.push({
        field: fieldName,
        message: rule.message || VALIDATION_MESSAGES.required,
        value
      });
      continue; // Skip other validations if required fails
    }

    // Skip other validations if value is empty and not required
    if (!validate.required(value) && !rule.required) {
      continue;
    }

    // Min length validation
    if (rule.minLength && !validate.minLength(value, rule.minLength)) {
      errors.push({
        field: fieldName,
        message: rule.message || VALIDATION_MESSAGES.minLength(rule.minLength),
        value
      });
    }

    // Max length validation
    if (rule.maxLength && !validate.maxLength(value, rule.maxLength)) {
      errors.push({
        field: fieldName,
        message: rule.message || VALIDATION_MESSAGES.maxLength(rule.maxLength),
        value
      });
    }

    // Pattern validation
    if (rule.pattern && !validate.pattern(value, rule.pattern)) {
      errors.push({
        field: fieldName,
        message: rule.message || VALIDATION_MESSAGES.pattern,
        value
      });
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push({
          field: fieldName,
          message: typeof customResult === 'string' ? customResult : (rule.message || 'Validation failed'),
          value
        });
      }
    }
  }

  return errors;
};

// Validate entire form
export const validateForm = (
  data: Record<string, any>, 
  schema: ValidationSchema
): ValidationResult => {
  const allErrors: ValidationError[] = [];

  for (const [fieldName, rules] of Object.entries(schema)) {
    const fieldValue = data[fieldName];
    const fieldErrors = validateField(fieldValue, rules, fieldName);
    allErrors.push(...fieldErrors);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    firstError: allErrors[0] || undefined
  };
};

// Profile validation schema
export const PROFILE_VALIDATION_SCHEMA: ValidationSchema = {
  firstName: [
    { required: true, message: 'First name is required' },
    { minLength: 1, maxLength: 50 },
    { pattern: VALIDATION_PATTERNS.name, message: VALIDATION_MESSAGES.name }
  ],
  lastName: [
    { required: true, message: 'Last name is required' },
    { minLength: 1, maxLength: 50 },
    { pattern: VALIDATION_PATTERNS.name, message: VALIDATION_MESSAGES.name }
  ],
  email: [
    { required: true, message: 'Email is required' },
    { pattern: VALIDATION_PATTERNS.email, message: VALIDATION_MESSAGES.email }
  ],
  avatar: [
    { maxLength: 500, message: 'Avatar URL cannot exceed 500 characters' },
    { pattern: VALIDATION_PATTERNS.url, message: VALIDATION_MESSAGES.url }
  ],
  bio: [
    { maxLength: 500, message: 'Bio cannot exceed 500 characters' }
  ],
  phone: [
    { pattern: VALIDATION_PATTERNS.phone, message: VALIDATION_MESSAGES.phone }
  ],
  dateOfBirth: [
    { custom: validate.age, message: VALIDATION_MESSAGES.age }
  ]
};

// Security validation helpers
export const securityValidation = {
  // Check for potential XSS patterns
  containsXSS: (value: string): boolean => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(value));
  },

  // Check for SQL injection patterns
  containsSQLInjection: (value: string): boolean => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /('|(\\')|(;)|(--)|(\|)|(\*)|(%)|(\+))/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(value));
  },

  // Validate input is safe
  isSafeInput: (value: string): boolean => {
    return !securityValidation.containsXSS(value) && 
           !securityValidation.containsSQLInjection(value);
  }
};

export default {
  validate,
  validateField,
  validateForm,
  sanitize,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  PROFILE_VALIDATION_SCHEMA,
  securityValidation
};