import React from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LoadingOverlayProps {
  isVisible: boolean;
  state?: 'loading' | 'success' | 'error';
  message?: string;
  progress?: number;
  showProgress?: boolean;
  className?: string;
  backdrop?: 'blur' | 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  state = 'loading',
  message = 'Loading...',
  progress = 0,
  showProgress = false,
  className = '',
  backdrop = 'blur',
  size = 'md'
}) => {
  if (!isVisible) return null;

  const getBackdropClasses = () => {
    switch (backdrop) {
      case 'blur':
        return 'backdrop-blur-sm bg-white/30 dark:bg-black/30';
      case 'dark':
        return 'bg-black/50';
      case 'light':
        return 'bg-white/80';
      default:
        return 'backdrop-blur-sm bg-white/30 dark:bg-black/30';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-64 p-6';
      case 'md':
        return 'w-80 p-8';
      case 'lg':
        return 'w-96 p-10';
      default:
        return 'w-80 p-8';
    }
  };

  const getStateIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="w-8 h-8 animate-spin text-primary" />;
      case 'success':
        return <Check className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Loader2 className="w-8 h-8 animate-spin text-primary" />;
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'success':
        return 'border-green-200';
      case 'error':
        return 'border-red-200';
      default:
        return 'border-gray-200';
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-all duration-300',
        getBackdropClasses(),
        className
      )}
    >
      <div
        className={cn(
          'bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 transition-all duration-300 transform',
          getSizeClasses(),
          getStateColor(),
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        )}
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4">
            {getStateIcon()}
          </div>

          {/* Message */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {message}
          </h3>

          {/* Progress Bar */}
          {showProgress && state === 'loading' && (
            <div className="w-full mb-4">
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {/* Loading Animation */}
          {state === 'loading' && (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}

          {/* Success/Error Message */}
          {(state === 'success' || state === 'error') && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {state === 'success' ? 'Operation completed successfully!' : 'Please try again.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;