import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import authService from '../services/authService';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authService.resetPassword(data.email);
      setSentEmail(data.email);
      setEmailSent(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError('root', {
        message: error.message || 'Failed to send reset email. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom right, var(--background), var(--muted))` }}>
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Link 
                to="/login" 
                className="absolute left-4 top-4 p-2 transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.color = 'var(--foreground)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.color = 'var(--muted-foreground)'}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--accent)' }}>
                <CheckCircle className="h-8 w-8" style={{ color: 'var(--accent-foreground)' }} />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Check Your Email
            </h1>
            <p style={{ color: 'var(--muted-foreground)' }}>
              We've sent a password reset link to
            </p>
            <p className="font-semibold" style={{ color: 'var(--primary)' }}>
              {sentEmail}
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--shadow-xl)' }}>
            <div className="space-y-4 text-center">
              <p style={{ color: 'var(--card-foreground)' }}>
                Click the link in the email to reset your password. If you don't see the email, check your spam folder.
              </p>
              
              <div className="pt-4">
                <Link 
                  to="/login"
                  className="inline-flex items-center font-semibold transition-colors"
                  style={{ color: 'var(--primary)' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.opacity = '0.8'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.opacity = '1'}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Link>
              </div>
              
              <div className="pt-2">
                <button
                  onClick={() => {
                    setEmailSent(false);
                    setSentEmail('');
                  }}
                  className="text-sm transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = 'var(--foreground)'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = 'var(--muted-foreground)'}
                >
                  Try a different email address
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom right, var(--background), var(--muted))` }}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Link 
              to="/login" 
              className="absolute left-4 top-4 p-2 transition-colors"
              style={{ color: 'var(--muted-foreground)' }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.color = 'var(--foreground)'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.color = 'var(--muted-foreground)'}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--primary)' }}>
              <Mail className="h-8 w-8" style={{ color: 'var(--primary-foreground)' }} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Reset Password
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        {/* Reset Form */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--card)', boxShadow: 'var(--shadow-xl)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Message */}
            {errors.root && (
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--destructive)', border: `1px solid var(--destructive)` }}>
                <p className="text-sm" style={{ color: 'var(--destructive-foreground)' }}>{errors.root.message}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--card-foreground)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="email"
                  {...register('email')}
                  className="w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    backgroundColor: 'var(--input)', 
                    border: `1px solid var(--border)`, 
                    color: 'var(--foreground)'
                  }}
                  onFocus={(e) => (e.target as HTMLInputElement).style.borderColor = 'var(--ring)'}
                  onBlur={(e) => (e.target as HTMLInputElement).style.borderColor = 'var(--border)'}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm" style={{ color: 'var(--destructive)' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg font-semibold focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ 
                backgroundColor: 'var(--primary)', 
                color: 'var(--primary-foreground)',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => !isLoading && ((e.target as HTMLElement).style.opacity = '0.9')}
              onMouseLeave={(e) => !isLoading && ((e.target as HTMLElement).style.opacity = '1')}
              onFocus={(e) => (e.target as HTMLElement).style.boxShadow = `0 0 0 2px var(--ring)`}
              onBlur={(e) => (e.target as HTMLElement).style.boxShadow = 'var(--shadow-sm)'}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center font-semibold transition-colors"
              style={{ color: 'var(--primary)' }}
              onMouseEnter={(e) => (e.target as HTMLElement).style.opacity = '0.8'}
              onMouseLeave={(e) => (e.target as HTMLElement).style.opacity = '1'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}