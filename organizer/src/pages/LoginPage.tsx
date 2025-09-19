import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import authService from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
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
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await authService.signIn(data.email, data.password);
      
      // Redirect to dashboard after successful login
      navigate('/organizer/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      setError('root', {
        message: error.message || 'Failed to sign in. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--background), var(--muted))` }}>
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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom right, var(--background), var(--muted))` }}>
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full" style={{ backgroundColor: 'var(--primary)' }}>
              <LogIn className="h-8 w-8" style={{ color: 'var(--primary-foreground)' }} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Welcome Back
          </h1>
          <p style={{ color: 'var(--muted-foreground)' }}>
            Sign in to your organizer account
          </p>
        </div>

        {/* Login Form */}
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
                  onFocus={(e) => e.target.style.borderColor = 'var(--ring)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm" style={{ color: 'var(--destructive)' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--card-foreground)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5" style={{ color: 'var(--muted-foreground)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className="w-full pl-10 pr-12 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{ 
                    backgroundColor: 'var(--input)', 
                    border: `1px solid var(--border)`, 
                    color: 'var(--foreground)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--ring)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 transition-colors"
                  style={{ color: 'var(--muted-foreground)' }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.color = 'var(--foreground)'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.color = 'var(--muted-foreground)'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm" style={{ color: 'var(--destructive)' }}>{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link 
                to="/forgot-password" 
                className="text-sm transition-colors"
                style={{ color: 'var(--primary)' }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.color = 'var(--primary)'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.color = 'var(--primary)'}
              >
                Forgot your password?
              </Link>
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
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p style={{ color: 'var(--muted-foreground)' }}>
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="font-semibold transition-colors"
                style={{ color: 'var(--primary)' }}
                onMouseEnter={(e) => (e.target as HTMLElement).style.opacity = '0.8'}
                onMouseLeave={(e) => (e.target as HTMLElement).style.opacity = '1'}
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}