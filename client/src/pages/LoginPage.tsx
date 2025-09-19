import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { cn } from '../utils/cn'
import toast from 'react-hot-toast'

type AuthMode = 'login' | 'register'

export default function LoginPage() {
  const { login, register, loading } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Registration-specific validation
    if (mode === 'register') {
      if (!formData.name) {
        newErrors.name = 'Name is required'
      } else if (formData.name.length < 2) {
        newErrors.name = 'Name must be at least 2 characters'
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password)
      } else {
        await register(formData.email, formData.password, formData.name)
      }
    } catch (error: any) {
      // Error is already handled in the auth context
      console.error('Auth error:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setErrors({})
    setFormData({
      email: formData.email, // Keep email when switching
      password: '',
      name: '',
      confirmPassword: '',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">J</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Joli</h1>
          <p className="text-gray-600 mt-2">
            Interactive games for everyone
          </p>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-gray-600 text-center mt-2">
              {mode === 'login' 
                ? 'Sign in to continue playing' 
                : 'Join the fun and start playing'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name field (register only) */}
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={cn(
                    'input',
                    errors.name && 'input-error'
                  )}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
                {errors.name && (
                  <p className="text-error-600 text-sm mt-1">{errors.name}</p>
                )}
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={cn(
                  'input',
                  errors.email && 'input-error'
                )}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <p className="text-error-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={cn(
                  'input',
                  errors.password && 'input-error'
                )}
                placeholder="Enter your password"
                disabled={loading}
              />
              {errors.password && (
                <p className="text-error-600 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password field (register only) */}
            {mode === 'register' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={cn(
                    'input',
                    errors.confirmPassword && 'input-error'
                  )}
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                {errors.confirmPassword && (
                  <p className="text-error-600 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <LoadingSpinner size="sm" color="white" />
                  <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                </div>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {/* Switch mode */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </p>
            <button
              onClick={switchMode}
              disabled={loading}
              className="text-primary font-semibold hover:text-primary/80 transition-colors disabled:opacity-50 underline decoration-primary/30 hover:decoration-primary/60"
            >
              {mode === 'login' ? 'Create Account' : 'Sign In'}
            </button>
          </div>

          {/* Organizer registration link */}
          <div className="mt-4 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            <div className="mt-4">
              <Link
                to="/register/organizer"
                className="inline-flex items-center px-4 py-2 border border-primary text-sm font-medium rounded-md text-primary bg-white hover:bg-primary-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Register as Organizer
              </Link>
            </div>
          </div>

          {/* Demo credentials (development only) */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2 font-medium">Demo Credentials:</p>
              <p className="text-xs text-gray-500">Email: demo@joli.com</p>
              <p className="text-xs text-gray-500">Password: demo123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}