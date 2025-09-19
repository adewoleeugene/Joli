import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaveButton } from '../components/ui/SaveButton';
import { toast } from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  }
}));

describe('SaveButton Component', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('renders with default props', () => {
      render(<SaveButton onSave={mockOnSave} />);
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('calls onSave when clicked', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<SaveButton onSave={mockOnSave} />);
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
    });

    it('shows loading state during save operation', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnSave.mockReturnValue(promise);

      render(<SaveButton onSave={mockOnSave} loadingText="Saving..." />);
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeDisabled();
      
      resolvePromise!();
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('prevents save when validation fails', async () => {
      const validateBeforeSave = jest.fn().mockReturnValue('Validation error');
      
      render(
        <SaveButton 
          onSave={mockOnSave} 
          validateBeforeSave={validateBeforeSave}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      expect(validateBeforeSave).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith('Validation error');
    });

    it('allows save when validation passes', async () => {
      const validateBeforeSave = jest.fn().mockReturnValue(true);
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <SaveButton 
          onSave={mockOnSave} 
          validateBeforeSave={validateBeforeSave}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(validateBeforeSave).toHaveBeenCalled();
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Confirmation Dialog', () => {
    it('shows confirmation dialog when required', () => {
      render(
        <SaveButton 
          onSave={mockOnSave} 
          requireConfirmation={true}
          confirmationMessage="Are you sure?"
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('cancels save operation when confirmation is cancelled', () => {
      render(
        <SaveButton 
          onSave={mockOnSave} 
          requireConfirmation={true}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      
      expect(mockOnSave).not.toHaveBeenCalled();
      expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument();
    });

    it('proceeds with save when confirmation is confirmed', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <SaveButton 
          onSave={mockOnSave} 
          requireConfirmation={true}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles save operation errors', async () => {
      const error = new Error('Save failed');
      mockOnSave.mockRejectedValue(error);
      
      render(<SaveButton onSave={mockOnSave} />);
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Save failed');
      });
    });

    it('shows custom error message for network errors', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      mockOnSave.mockRejectedValue(networkError);
      
      render(<SaveButton onSave={mockOnSave} />);
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error. Please check your connection and try again.');
      });
    });
  });

  describe('Success States', () => {
    it('shows success state after successful save', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <SaveButton 
          onSave={mockOnSave} 
          successMessage="Saved successfully!"
          showSuccessState={true}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Saved successfully!');
      });
    });

    it('auto-resets success state after specified duration', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <SaveButton 
          onSave={mockOnSave} 
          successDuration={100}
          autoResetSuccess={true}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Save')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Edge Cases', () => {
    it('handles disabled state correctly', () => {
      render(<SaveButton onSave={mockOnSave} disabled={true} />);
      
      const button = screen.getByRole('button', { name: /save/i });
      expect(button).toBeDisabled();
      
      fireEvent.click(button);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('prevents multiple simultaneous save operations', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnSave.mockReturnValue(promise);

      render(<SaveButton onSave={mockOnSave} />);
      
      const button = screen.getByRole('button', { name: /save/i });
      
      // Click multiple times rapidly
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      // Should only call onSave once
      expect(mockOnSave).toHaveBeenCalledTimes(1);
      
      resolvePromise!();
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('handles empty validation function', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <SaveButton 
          onSave={mockOnSave} 
          validateBeforeSave={() => true}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('handles undefined validation result', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(
        <SaveButton 
          onSave={mockOnSave} 
          validateBeforeSave={() => undefined as any}
        />
      );
      
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<SaveButton onSave={mockOnSave} />);
      
      const button = screen.getByRole('button', { name: /save/i });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('supports keyboard navigation', async () => {
      mockOnSave.mockResolvedValue(undefined);
      
      render(<SaveButton onSave={mockOnSave} />);
      
      const button = screen.getByRole('button', { name: /save/i });
      button.focus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });
});