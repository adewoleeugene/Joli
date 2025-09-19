import toast from 'react-hot-toast';

export interface ApiError {
  success: boolean;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  error?: string;
  code?: string | number;
  status?: number;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
  onError?: (error: ProcessedError) => void;
  retryable?: boolean;
}

export interface ProcessedError {
  message: string;
  type: ErrorType;
  code?: string | number;
  status?: number;
  details?: any;
  retryable: boolean;
  timestamp: Date;
}

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  CLIENT = 'client',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

// Error message mappings
const ERROR_MESSAGES = {
  [ErrorType.NETWORK]: 'Network connection failed. Please check your internet connection.',
  [ErrorType.VALIDATION]: 'Please check your input and try again.',
  [ErrorType.AUTHENTICATION]: 'Please log in to continue.',
  [ErrorType.AUTHORIZATION]: 'You do not have permission to perform this action.',
  [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorType.SERVER]: 'Server error occurred. Please try again later.',
  [ErrorType.CLIENT]: 'Invalid request. Please check your input.',
  [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.'
};

// Determine error type based on status code and error details
const determineErrorType = (status?: number, error?: any): ErrorType => {
  if (!status) {
    if (error?.name === 'AbortError' || error?.code === 'ECONNABORTED') {
      return ErrorType.TIMEOUT;
    }
    if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
      return ErrorType.NETWORK;
    }
    return ErrorType.UNKNOWN;
  }

  switch (Math.floor(status / 100)) {
    case 4:
      switch (status) {
        case 400:
          return ErrorType.VALIDATION;
        case 401:
          return ErrorType.AUTHENTICATION;
        case 403:
          return ErrorType.AUTHORIZATION;
        case 404:
          return ErrorType.NOT_FOUND;
        case 408:
          return ErrorType.TIMEOUT;
        default:
          return ErrorType.CLIENT;
      }
    case 5:
      return ErrorType.SERVER;
    default:
      return ErrorType.UNKNOWN;
  }
};

// Check if error is retryable
const isRetryable = (errorType: ErrorType, status?: number): boolean => {
  switch (errorType) {
    case ErrorType.NETWORK:
    case ErrorType.TIMEOUT:
    case ErrorType.SERVER:
      return true;
    case ErrorType.CLIENT:
      // Some 4xx errors might be retryable (like 429 - Too Many Requests)
      return status === 429;
    default:
      return false;
  }
};

// Process different types of errors
export const processError = (error: any): ProcessedError => {
  let message = ERROR_MESSAGES[ErrorType.UNKNOWN];
  let type = ErrorType.UNKNOWN;
  let code: string | number | undefined;
  let status: number | undefined;
  let details: any;

  try {
    // Handle fetch/axios errors
    if (error?.response) {
      // Axios error with response
      status = error.response.status;
      const data = error.response.data as ApiError;
      
      if (data?.message) {
        message = data.message;
      }
      
      if (data?.errors && data.errors.length > 0) {
        message = data.errors.map(e => e.message).join(', ');
        type = ErrorType.VALIDATION;
      } else {
        type = determineErrorType(status);
      }
      
      code = data?.code || status;
      details = data;
    } else if (error?.request) {
      // Network error
      type = ErrorType.NETWORK;
      message = ERROR_MESSAGES[ErrorType.NETWORK];
    } else if (error instanceof Response) {
      // Fetch API error
      status = error.status;
      type = determineErrorType(status);
      
      try {
        // Try to parse JSON error response
        error.json().then((data: ApiError) => {
          if (data?.message) {
            message = data.message;
          }
          details = data;
        }).catch(() => {
          message = `HTTP ${status}: ${error.statusText}`;
        });
      } catch {
        message = `HTTP ${status}: ${error.statusText}`;
      }
    } else if (error instanceof Error) {
      // Standard JavaScript Error
      message = error.message;
      
      if (error.name === 'AbortError') {
        type = ErrorType.TIMEOUT;
        message = ERROR_MESSAGES[ErrorType.TIMEOUT];
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        type = ErrorType.NETWORK;
        message = ERROR_MESSAGES[ErrorType.NETWORK];
      }
    } else if (typeof error === 'string') {
      message = error;
    } else if (error?.message) {
      message = error.message;
    }

    // Override with specific error messages if available
    if (!type || type === ErrorType.UNKNOWN) {
      type = determineErrorType(status, error);
    }

    if (!message || message === ERROR_MESSAGES[ErrorType.UNKNOWN]) {
      message = ERROR_MESSAGES[type];
    }

  } catch (processingError) {
    console.error('Error processing error:', processingError);
    message = ERROR_MESSAGES[ErrorType.UNKNOWN];
    type = ErrorType.UNKNOWN;
  }

  return {
    message,
    type,
    code,
    status,
    details,
    retryable: isRetryable(type, status),
    timestamp: new Date()
  };
};

// Main error handler
export const handleError = (
  error: any, 
  options: ErrorHandlerOptions = {}
): ProcessedError => {
  const {
    showToast = true,
    logError = true,
    fallbackMessage,
    onError,
    retryable
  } = options;

  const processedError = processError(error);

  // Override retryable if specified
  if (retryable !== undefined) {
    processedError.retryable = retryable;
  }

  // Use fallback message if provided
  if (fallbackMessage) {
    processedError.message = fallbackMessage;
  }

  // Log error for debugging
  if (logError) {
    console.error('Error handled:', {
      original: error,
      processed: processedError
    });
  }

  // Show toast notification
  if (showToast) {
    const toastMessage = processedError.message;
    
    switch (processedError.type) {
      case ErrorType.VALIDATION:
        toast.error(toastMessage, { duration: 4000 });
        break;
      case ErrorType.AUTHENTICATION:
        toast.error(toastMessage, { 
          duration: 6000,
          icon: '🔒'
        });
        break;
      case ErrorType.NETWORK:
        toast.error(toastMessage, { 
          duration: 5000,
          icon: '📡'
        });
        break;
      case ErrorType.SERVER:
        toast.error(toastMessage, { 
          duration: 5000,
          icon: '⚠️'
        });
        break;
      default:
        toast.error(toastMessage);
    }
  }

  // Call custom error handler
  if (onError) {
    try {
      onError(processedError);
    } catch (handlerError) {
      console.error('Error in custom error handler:', handlerError);
    }
  }

  return processedError;
};

// Specific error handlers for common scenarios
export const errorHandlers = {
  // Handle save operation errors
  save: (error: any, options: Omit<ErrorHandlerOptions, 'fallbackMessage'> = {}) => {
    return handleError(error, {
      ...options,
      fallbackMessage: 'Failed to save. Please try again.'
    });
  },

  // Handle authentication errors
  auth: (error: any, options: Omit<ErrorHandlerOptions, 'fallbackMessage'> = {}) => {
    return handleError(error, {
      ...options,
      fallbackMessage: 'Authentication failed. Please log in again.'
    });
  },

  // Handle network errors
  network: (error: any, options: Omit<ErrorHandlerOptions, 'fallbackMessage'> = {}) => {
    return handleError(error, {
      ...options,
      fallbackMessage: 'Network error. Please check your connection and try again.',
      retryable: true
    });
  },

  // Handle validation errors
  validation: (error: any, options: Omit<ErrorHandlerOptions, 'fallbackMessage'> = {}) => {
    return handleError(error, {
      ...options,
      fallbackMessage: 'Please check your input and try again.',
      retryable: false
    });
  }
};

// Error boundary helper
export const createErrorBoundaryHandler = (
  componentName: string,
  onError?: (error: ProcessedError) => void
) => {
  return (error: any, errorInfo?: any) => {
    const processedError = processError(error);
    
    console.error(`Error in ${componentName}:`, {
      error,
      errorInfo,
      processed: processedError
    });

    if (onError) {
      onError(processedError);
    }

    // You might want to send this to an error reporting service
    // reportError(processedError, componentName, errorInfo);
  };
};

// Retry helper
export const createRetryHandler = (
  operation: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
) => {
  return async (): Promise<any> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const processedError = processError(error);
        
        if (!processedError.retryable || attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const retryDelay = delay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw lastError;
  };
};

export default {
  handleError,
  processError,
  errorHandlers,
  createErrorBoundaryHandler,
  createRetryHandler,
  ErrorType
};