import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export interface SaveOperationConfig {
  onSave: () => Promise<void>;
  onSuccess?: (data?: any) => void;
  onError?: (error: Error) => void;
  validateBeforeSave?: () => boolean | string;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface SaveOperationState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
  attemptCount: number;
  lastSaveTime: Date | null;
}

export interface SaveOperationActions {
  save: () => Promise<void>;
  reset: () => void;
  retry: () => Promise<void>;
}

export const useSaveOperation = (config: SaveOperationConfig): SaveOperationState & SaveOperationActions => {
  const {
    onSave,
    onSuccess,
    onError,
    validateBeforeSave,
    showToast = true,
    successMessage = 'Saved successfully!',
    errorMessage = 'Failed to save. Please try again.',
    retryAttempts = 3,
    retryDelay = 1000,
    timeout = 30000
  } = config;

  const [state, setState] = useState<SaveOperationState>({
    isLoading: false,
    isSuccess: false,
    isError: false,
    error: null,
    attemptCount: 0,
    lastSaveTime: null
  });

  const timeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
      attemptCount: 0,
      lastSaveTime: null
    });

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const performSave = useCallback(async (attemptNumber: number = 1): Promise<void> => {
    try {
      // Validation check
      if (validateBeforeSave) {
        const validationResult = validateBeforeSave();
        if (validationResult !== true) {
          const errorMsg = typeof validationResult === 'string' 
            ? validationResult 
            : 'Please fix validation errors before saving.';
          throw new Error(errorMsg);
        }
      }

      setState(prev => ({
        ...prev,
        isLoading: true,
        isError: false,
        error: null,
        attemptCount: attemptNumber
      }));

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Set up timeout
      timeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, timeout);

      // Perform the save operation
      await onSave();

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        isError: false,
        error: null,
        lastSaveTime: new Date()
      }));

      if (showToast) {
        toast.success(successMessage);
      }

      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const saveError = error instanceof Error ? error : new Error(error?.message || errorMessage);

      // Check if this was an abort (timeout or manual cancellation)
      if (saveError.name === 'AbortError' || error?.name === 'AbortError') {
        saveError.message = 'Save operation timed out. Please try again.';
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: saveError,
        attemptCount: attemptNumber
      }));

      // Retry logic
      if (attemptNumber < retryAttempts && saveError.name !== 'AbortError') {
        setTimeout(() => {
          performSave(attemptNumber + 1);
        }, retryDelay * attemptNumber); // Exponential backoff
        return;
      }

      if (showToast) {
        toast.error(saveError.message);
      }

      if (onError) {
        onError(saveError);
      }

      throw saveError;
    }
  }, [
    onSave,
    onSuccess,
    onError,
    validateBeforeSave,
    showToast,
    successMessage,
    errorMessage,
    retryAttempts,
    retryDelay,
    timeout
  ]);

  const save = useCallback(async (): Promise<void> => {
    // Reset state before starting new save operation
    reset();
    await performSave(1);
  }, [reset, performSave]);

  const retry = useCallback(async (): Promise<void> => {
    if (!state.isError) {
      throw new Error('Cannot retry when not in error state');
    }
    await performSave(state.attemptCount + 1);
  }, [state.isError, state.attemptCount, performSave]);

  return {
    ...state,
    save,
    reset,
    retry
  };
};

export default useSaveOperation;