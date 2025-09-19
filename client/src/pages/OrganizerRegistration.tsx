import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { cn } from '../utils/cn'
import toast from 'react-hot-toast'
import { User, Shield, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface OrganizerFormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  organizationName: string
  organizationType: string
  phoneNumber: string
  website?: string
  description: string
  agreeToTerms: boolean
  agreeToMarketing: boolean
}

const organizationTypes = [
  { value: 'corporate', label: 'Corporate/Business' },
  { value: 'nonprofit', label: 'Non-Profit Organization' },
  { value: 'educational', label: 'Educational Institution' },
  { value: 'government', label: 'Government Agency' },
  { value: 'community', label: 'Community Group' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' }
]

export default function OrganizerRegistration() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OrganizerFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: '',
    organizationType: '',
    phoneNumber: '',
    website: '',
    description: '',
    agreeToTerms: false,
    agreeToMarketing: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      // Personal Information
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required'
      } else if (formData.firstName.length < 2) {
        newErrors.firstName = 'First name must be at least 2 characters'
      }

      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required'
      } else if (formData.lastName.length < 2) {
        newErrors.lastName = 'Last name must be at least 2 characters'
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }

      if (!formData.phoneNumber.trim()) {
        newErrors.phoneNumber = 'Phone number is required'
      } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
        newErrors.phoneNumber = 'Please enter a valid phone number'
      }
    }

    if (step === 2) {
      // Organization Information
      if (!formData.organizationName.trim()) {
        newErrors.organizationName = 'Organization name is required'
      } else if (formData.organizationName.length < 2) {
        newErrors.organizationName = 'Organization name must be at least 2 characters'
      }

      if (!formData.organizationType) {
        newErrors.organizationType = 'Please select an organization type'
      }

      if (!formData.description.trim()) {
        newErrors.description = 'Organization description is required'
      } else if (formData.description.length < 20) {
        newErrors.description = 'Description must be at least 20 characters'
      }

      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        newErrors.website = 'Please enter a valid website URL (include http:// or https://)'
      }
    }

    if (step === 3) {
      // Security & Terms
      if (!formData.password) {
        newErrors.password = 'Password is required'
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters'
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password'
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }

      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = 'You must agree to the terms and conditions'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep(3)) {
      return
    }

    try {
      // Register with organizer role
      await register(
        formData.email,
        formData.password,
        `${formData.firstName} ${formData.lastName}`,
        'organizer',
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
          organizationName: formData.organizationName,
          organizationType: formData.organizationType,
          phoneNumber: formData.phoneNumber,
          website: formData.website,
          description: formData.description,
          agreeToMarketing: formData.agreeToMarketing
        }
      )
      
      toast.success('Registration successful! Welcome to Joli!')
      navigate('/organizer/dashboard')
    } catch (error: any) {
      console.error('Registration error:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold",
            step <= currentStep
              ? "bg-primary-600 border-primary-600 text-white"
              : "bg-gray-100 border-gray-300 text-gray-400"
          )}>
            {step < currentStep ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              step
            )}
          </div>
          {step < 3 && (
            <div className={cn(
              "w-16 h-0.5 mx-2",
              step < currentStep ? "bg-primary-600" : "bg-gray-300"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600">Tell us about yourself</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
            First Name *
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={cn(
              "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
              errors.firstName ? "border-red-500" : "border-gray-300"
            )}
            placeholder="Enter your first name"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.firstName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={cn(
              "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
              errors.lastName ? "border-red-500" : "border-gray-300"
            )}
            placeholder="Enter your last name"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.lastName}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={cn(
            "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
            errors.email ? "border-red-500" : "border-gray-300"
          )}
          placeholder="Enter your email address"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          className={cn(
            "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
            errors.phoneNumber ? "border-red-500" : "border-gray-300"
          )}
          placeholder="Enter your phone number"
        />
        {errors.phoneNumber && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.phoneNumber}
          </p>
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Details</h2>
        <p className="text-gray-600">Tell us about your organization</p>
      </div>

      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">
          Organization Name *
        </label>
        <input
          type="text"
          id="organizationName"
          name="organizationName"
          value={formData.organizationName}
          onChange={handleInputChange}
          className={cn(
            "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
            errors.organizationName ? "border-red-500" : "border-gray-300"
          )}
          placeholder="Enter your organization name"
        />
        {errors.organizationName && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.organizationName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="organizationType" className="block text-sm font-medium text-gray-700 mb-2">
          Organization Type *
        </label>
        <select
          id="organizationType"
          name="organizationType"
          value={formData.organizationType}
          onChange={handleInputChange}
          className={cn(
            "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
            errors.organizationType ? "border-red-500" : "border-gray-300"
          )}
        >
          <option value="">Select organization type</option>
          {organizationTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {errors.organizationType && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.organizationType}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
          Website (Optional)
        </label>
        <input
          type="url"
          id="website"
          name="website"
          value={formData.website}
          onChange={handleInputChange}
          className={cn(
            "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
            errors.website ? "border-red-500" : "border-gray-300"
          )}
          placeholder="https://www.yourorganization.com"
        />
        {errors.website && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.website}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Organization Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={4}
          className={cn(
            "w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none",
            errors.description ? "border-red-500" : "border-gray-300"
          )}
          placeholder="Describe your organization and the types of activities you plan to organize..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.description}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {formData.description.length}/500 characters
        </p>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Security & Terms</h2>
        <p className="text-gray-600">Set up your account security</p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password *
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={cn(
              "w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
              errors.password ? "border-red-500" : "border-gray-300"
            )}
            placeholder="Create a strong password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.password}
          </p>
        )}
        <div className="mt-2 text-sm text-gray-600">
          <p>Password must contain:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li className={formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}>
              At least 8 characters
            </li>
            <li className={/(?=.*[a-z])/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}>
              One lowercase letter
            </li>
            <li className={/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}>
              One uppercase letter
            </li>
            <li className={/(?=.*\d)/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}>
              One number
            </li>
          </ul>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
          Confirm Password *
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={cn(
              "w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors",
              errors.confirmPassword ? "border-red-500" : "border-gray-300"
            )}
            placeholder="Confirm your password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.confirmPassword}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="agreeToTerms"
            name="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={handleInputChange}
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="agreeToTerms" className="ml-3 text-sm text-gray-700">
            I agree to the{' '}
            <Link to="/terms" className="text-primary-600 hover:text-primary-500 underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary-600 hover:text-primary-500 underline">
              Privacy Policy
            </Link>
            *
          </label>
        </div>
        {errors.agreeToTerms && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            {errors.agreeToTerms}
          </p>
        )}

        <div className="flex items-start">
          <input
            type="checkbox"
            id="agreeToMarketing"
            name="agreeToMarketing"
            checked={formData.agreeToMarketing}
            onChange={handleInputChange}
            className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="agreeToMarketing" className="ml-3 text-sm text-gray-700">
            I would like to receive marketing communications and updates about new features
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary-600 p-3 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become an Organizer</h1>
          <p className="text-gray-600">
            Join Joli as an organizer and create amazing interactive experiences
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderStepIndicator()}
          
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={cn(
                  "px-6 py-3 rounded-lg font-medium transition-colors",
                  currentStep === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                )}
              >
                Previous
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner className="w-4 h-4 mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}