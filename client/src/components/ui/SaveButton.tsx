import React, { useState, useEffect } from 'react';
import { Check, Save, AlertCircle, Loader2, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

export interface SaveButtonProps {
  onSave: () => Promise<void>;
  disabled?: boolean;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showSuccessState?: boolean;
  successMessage?: string;
  loadingText?: string;
  children?: React.ReactNode;
  requireConfirmation?: boolean;
  confirmationMessage?: string;
  validateBeforeSave?: () => boolean | string;
  autoResetSuccess?: boolean;
  successDuration?: number;
}

export type SaveState = 'idle' | 'loading' | 'success' | 'error';

export const SaveButton: React.FC<SaveButtonProps> = ({
  onSave,
  disabled = false,
  className = '',
  variant = 'primary',
  size = 'md',
  showSuccessState = true,
  successMessage = 'Saved successfully!',
  loadingText = 'Saving...',
  children = 'Save',
  requireConfirmation = false,
  confirmationMessage = 'Are you sure you want to save these changes?',
  validateBeforeSave,
  autoResetSuccess = true,
  successDuration = 2000
}) => {
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Auto-reset success state
  useEffect(() => {
    if (saveState === 'success' && autoResetSuccess) {
      const timer = setTimeout(() => {
        setSaveState('idle');
      }, successDuration);
      return () => clearTimeout(timer);
    }
  }, [saveState, autoResetSuccess, successDuration]);

  const handleSave = async () => {
    try {
      // Validation check
      if (validateBeforeSave) {
        const validationResult = validateBeforeSave();
        if (validationResult !== true) {
          const errorMsg = typeof validationResult === 'string' ? validationResult : 'Please fix validation errors before saving.';
          setErrorMessage(errorMsg);
          setSaveState('error');
          toast.error(errorMsg, {
            duration: 4000,
            icon: '❌',
          });
          return;
        }
      }

      // Confirmation check
      if (requireConfirmation && !showConfirmation) {
        setShowConfirmation(true);
        return;
      }

      setShowConfirmation(false);
      setSaveState('loading');
      setErrorMessage('');

      // Show loading toast
      const loadingToastId = toast.loading(loadingText, {
        icon: '⏳',
      });

      try {
        await onSave();
        
        // Dismiss loading toast
        toast.dismiss(loadingToastId);
        
        if (showSuccessState) {
          setSaveState('success');
        } else {
          setSaveState('idle');
        }
        
        // Show success toast
        toast.success(successMessage, {
          duration: 3000,
          icon: '✅',
        });
      } catch (error: any) {
        // Dismiss loading toast
        toast.dismiss(loadingToastId);
        
        console.error('Save operation failed:', error);
        const errorMsg = error.message || 'Failed to save. Please try again.';
        setErrorMessage(errorMsg);
        setSaveState('error');
        
        // Show error toast
        toast.error(errorMsg, {
          duration: 4000,
          icon: '❌',
        });
      }
    } catch (error: any) {
      console.error('Save operation failed:', error);
      const errorMsg = error.message || 'Failed to save. Please try again.';
      setErrorMessage(errorMsg);
      setSaveState('error');
      
      // Show error toast
      toast.error(errorMsg, {
        duration: 4000,
        icon: '❌',
      });
    }
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    handleSave();
  };

  const handleCancel = () => {
    setShowConfirmation(false);
  };

  const getVariantClasses = () => {
    const baseClasses = 'font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary`;
      case 'secondary':
        return `${baseClasses} bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary`;
      case 'success':
        return `${baseClasses} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`;
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
      default:
        return `${baseClasses} bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary`;
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm rounded-md';
      case 'md':
        return 'px-4 py-2 text-sm rounded-md';
      case 'lg':
        return 'px-6 py-3 text-base rounded-lg';
      default:
        return 'px-4 py-2 text-sm rounded-md';
    }
  };

  const getStateClasses = () => {
    switch (saveState) {
      case 'loading':
        return 'opacity-90 cursor-not-allowed';
      case 'success':
        return 'bg-green-600 hover:bg-green-600 text-white';
      case 'error':
        return 'bg-red-600 hover:bg-red-600 text-white';
      default:
        return '';
    }
  };

  const renderIcon = () => {
    switch (saveState) {
      case 'loading':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <Check className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Save className="w-4 h-4" />;
    }
  };

  const renderButtonText = () => {
    switch (saveState) {
      case 'loading':
        return loadingText;
      case 'success':
        return successMessage;
      case 'error':
        return 'Try Again';
      default:
        return children;
    }
  };

  const isDisabled = disabled || saveState === 'loading';

  return (
    <div className="relative">
      {/* Main Save Button */}
      <button
        onClick={handleSave}
        disabled={isDisabled}
        className={cn(
          getVariantClasses(),
          getSizeClasses(),
          getStateClasses(),
          'flex items-center gap-2 relative overflow-hidden',
          isDisabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        aria-label={`Save button - ${saveState}`}
      >
        {renderIcon()}
        <span>{renderButtonText()}</span>
        
        {/* Security indicator for sensitive operations */}
        {requireConfirmation && (
          <Shield className="w-3 h-3 opacity-60" />
        )}
      </button>

      {/* Error Message */}
      {saveState === 'error' && errorMessage && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-50 border border-red-200 rounded-md shadow-sm z-10 min-w-full">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Save</h3>
            </div>
            <p className="text-gray-600 mb-6">{confirmationMessage}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaveButton;