import React, { useEffect, useState } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ProgressIndicatorProps {
  isVisible: boolean;
  state: 'loading' | 'success' | 'error' | 'idle';
  progress?: number; // 0-100
  message?: string;
  className?: string;
  showProgress?: boolean;
  autoHide?: boolean;
  autoHideDuration?: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isVisible,
  state,
  progress = 0,
  message,
  className = '',
  showProgress = true,
  autoHide = true,
  autoHideDuration = 3000
}) => {
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    setVisible(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (state === 'success' && autoHide) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [state, autoHide, autoHideDuration]);

  if (!visible) return null;

  const getStateIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getProgressColor = () => {
    switch (state) {
      case 'loading':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg transition-all duration-300 transform',
        getStateColor(),
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {getStateIcon()}
        <div className="flex-1">
          {message && (
            <p className="text-sm font-medium text-gray-900 mb-1">{message}</p>
          )}
          {showProgress && state === 'loading' && (
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300 ease-out',
                  getProgressColor()
                )}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
          {showProgress && state === 'loading' && (
            <p className="text-xs text-gray-600 mt-1">{Math.round(progress)}% complete</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;