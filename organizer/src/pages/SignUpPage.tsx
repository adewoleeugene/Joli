import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  organizationDescription: z.string().min(10, 'Organization description must be at least 10 characters'),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions'
  })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/organizer/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema)
  });

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      await authService.signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        organizationName: data.organizationName,
        organizationDescription: data.organizationDescription
      });
      
      // Redirect to dashboard after successful sign-up
      navigate('/organizer/dashboard');
    } catch (error: any) {
      console.error('Sign-up error:', error);
      setError('root', {
        message: error.message || 'Failed to create account. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--background)] to-[var(--muted)]">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 mx-auto mb-4"
            style={{
              border: '3px solid var(--muted)',
              borderTop: '3px solid var(--primary)'
            }}
          ></div>
          <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] to-[var(--muted)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Link 
              to="/login" 
              className="absolute left-4 top-4 p-2 transition-colors"
              style={{
                color: 'var(--muted-foreground)'
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = 'var(--foreground)';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                e.currentTarget.style.color = 'var(--muted-foreground)';
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="bg-[var(--primary)] p-3 rounded-full">
              <User className="h-8 w-8" style={{ color: 'var(--primary-foreground)' }} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
            Create Account
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Join our platform to start organizing activities
          </p>
        </div>

        {/* Sign Up Form */}
        <div className="bg-[var(--card)] rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Message */}
            {errors.root && (
              <div className="bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-lg p-4">
                <p className="text-[var(--destructive)] text-sm">{errors.root.message}</p>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  {...register('firstName')}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent bg-[var(--input)] text-[var(--foreground)]"
                  placeholder="First name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-[var(--destructive)]">{errors.firstName.message}</p>
                )}
              </div>
              
              <div>
                <label 
                  className="block text-sm font-medium mb-2"
                  style={{
                    color: 'var(--foreground)',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  {...register('lastName')}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--input)',
                    color: 'var(--foreground)',
                    borderRadius: 'var(--radius)'
                  }}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = '2px solid var(--ring)';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                  placeholder="Last name"
                />
                {errors.lastName && (
                  <p 
                    className="mt-1 text-sm"
                    style={{
                      color: 'var(--destructive)',
                      fontFamily: 'var(--font-body)'
                    }}
                  >{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)'
                }}
              >
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="email"
                  {...register('email')}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--input)',
                    color: 'var(--foreground)',
                    borderRadius: 'var(--radius)'
                  }}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = '2px solid var(--ring)';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p 
                  className="mt-1 text-sm"
                  style={{
                    color: 'var(--destructive)',
                    fontFamily: 'var(--font-body)'
                  }}
                >{errors.email.message}</p>
              )}
            </div>

            {/* Organization Name Field */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)'
                }}
              >
                Organization Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type="text"
                  {...register('organizationName')}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--input)',
                    color: 'var(--foreground)',
                    borderRadius: 'var(--radius)'
                  }}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = '2px solid var(--ring)';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                  placeholder="Enter your organization name"
                />
              </div>
              {errors.organizationName && (
                <p 
                  className="mt-1 text-sm"
                  style={{
                    color: 'var(--destructive)',
                    fontFamily: 'var(--font-body)'
                  }}
                >{errors.organizationName.message}</p>
              )}
            </div>

            {/* Organization Description Field */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)'
                }}
              >
                Organization Description *
              </label>
              <textarea
                {...register('organizationDescription')}
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent resize-none"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--input)',
                  color: 'var(--foreground)',
                  borderRadius: 'var(--radius)'
                }}
                onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                  e.currentTarget.style.outline = '2px solid var(--ring)';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                  e.currentTarget.style.outline = 'none';
                }}
                placeholder="Provide a detailed description of your organization, its mission, and the types of activities you plan to organize..."
              />
              {errors.organizationDescription && (
                <p 
                  className="mt-1 text-sm"
                  style={{
                    color: 'var(--destructive)',
                    fontFamily: 'var(--font-body)'
                  }}
                >{errors.organizationDescription.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)'
                }}
              >
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--input)',
                    color: 'var(--foreground)',
                    borderRadius: 'var(--radius)'
                  }}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = '2px solid var(--ring)';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5"
                  style={{
                    color: 'var(--muted-foreground)'
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.color = 'var(--foreground)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.color = 'var(--muted-foreground)';
                  }}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p 
                  className="mt-1 text-sm"
                  style={{
                    color: 'var(--destructive)',
                    fontFamily: 'var(--font-body)'
                  }}
                >{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-body)'
                }}
              >
                Confirm Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className="w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:border-transparent"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--input)',
                    color: 'var(--foreground)',
                    borderRadius: 'var(--radius)'
                  }}
                  onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = '2px solid var(--ring)';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                    e.currentTarget.style.outline = 'none';
                  }}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5"
                  style={{
                    color: 'var(--muted-foreground)'
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.color = 'var(--foreground)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.currentTarget.style.color = 'var(--muted-foreground)';
                  }}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p 
                  className="mt-1 text-sm"
                  style={{
                    color: 'var(--destructive)',
                    fontFamily: 'var(--font-body)'
                  }}
                >{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start">
              <input
                type="checkbox"
                {...register('agreeToTerms')}
                className="mt-1 h-4 w-4 text-[var(--primary)] border-[var(--border)] rounded focus:ring-[var(--ring)]"
              />
              <label className="ml-3 text-sm text-[var(--foreground)]">
                I agree to the{' '}
                <Link to="/terms" className="text-[var(--primary)] hover:text-[var(--primary)]/80 underline">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-[var(--primary)] hover:text-[var(--primary)]/80 underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-[var(--destructive)]">{errors.agreeToTerms.message}</p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--primary)] text-[var(--primary-foreground)] py-3 px-4 rounded-lg font-medium hover:bg-[var(--primary)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-[var(--muted-foreground)]">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--primary)] hover:text-[var(--primary)]/80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}