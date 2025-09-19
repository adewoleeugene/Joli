import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export interface VisualFeedbackState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  progress: number;
  message: string;
  error: string | null;
}

export interface VisualFeedbackOptions {
  showToast?: boolean;
  showProgress?: boolean;
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  autoReset?: boolean;
  resetDelay?: number;
  progressSteps?: string[];
}

export const useVisualFeedback = (options: VisualFeedbackOptions = {}) => {
  const {
    showToast = true,
    showProgress = false,
    successMessage = 'Operation completed successfully!',
    errorMessage = 'Operation failed. Please try again.',
    loadingMessage = 'Processing...',
    autoReset = true,
    resetDelay = 3000,
    progressSteps = []
  } = options;

  const [state, setState] = useState<VisualFeedbackState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    progress: 0,
    message: '',
    error: null
  });

  const toastIdRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      progress: 0,
      message: '',
      error: null
    });
    
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startLoading = useCallback((message?: string) => {
    reset();
    
    const msg = message || loadingMessage;
    setState(prev => ({
      ...prev,
      isLoading: true,
      message: msg,
      progress: 0
    }));

    if (showToast) {
      toastIdRef.current = toast.loading(msg, {
        icon: '⏳',
      });
    }
  }, [loadingMessage, showToast, reset]);

  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      message: message || prev.message
    }));
  }, []);

  const setProgressStep = useCallback((stepIndex: number, customMessage?: string) => {
    if (progressSteps.length > 0 && stepIndex < progressSteps.length) {
      const progress = ((stepIndex + 1) / progressSteps.length) * 100;
      const message = customMessage || progressSteps[stepIndex];
      updateProgress(progress, message);
    }
  }, [progressSteps, updateProgress]);

  const showSuccess = useCallback((message?: string) => {
    const msg = message || successMessage;
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      isSuccess: true,
      isError: false,
      progress: 100,
      message: msg,
      error: null
    }));

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    if (showToast) {
      toast.success(msg, {
        duration: 3000,
        icon: '✅',
      });
    }

    if (autoReset) {
      timeoutRef.current = setTimeout(reset, resetDelay) as unknown as number;
    }
  }, [successMessage, showToast, autoReset, resetDelay, reset]);

  const showError = useCallback((error: string | Error, message?: string) => {
    const errorMsg = error instanceof Error ? error.message : error;
    const msg = message || errorMessage;
    
    setState(prev => ({
      ...prev,
      isLoading: false,
      isSuccess: false,
      isError: true,
      message: msg,
      error: errorMsg
    }));

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    if (showToast) {
      toast.error(errorMsg, {
        duration: 4000,
        icon: '❌',
      });
    }
  }, [errorMessage, showToast]);

  const withFeedback = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
      steps?: string[];
    }
  ): Promise<T> => {
    try {
      startLoading(options?.loadingMessage);
      
      const result = await operation();
      
      showSuccess(options?.successMessage);
      return result;
    } catch (error) {
      showError(error as Error, options?.errorMessage);
      throw error;
    }
  }, [startLoading, showSuccess, showError]);

  return {
    state,
    startLoading,
    updateProgress,
    setProgressStep,
    showSuccess,
    showError,
    reset,
    withFeedback
  };
};

export default useVisualFeedback;