import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { ProgressIndicator } from '../components/ui/ProgressIndicator';
import { cn } from '../utils/cn';
import { Achievement } from '../types/auth';
import { Building2, Globe, Phone, FileText } from 'lucide-react';
import { validateForm, PROFILE_VALIDATION_SCHEMA, sanitize, securityValidation } from '../utils/validation';
import { SaveButton } from '../components/ui/SaveButton';
import { useVisualFeedback } from '../hooks/useVisualFeedback';

const ProfilePage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Enhanced visual feedback
  const feedback = useVisualFeedback({
    showToast: true,
    showProgress: true,
    successMessage: 'Profile updated successfully!',
    errorMessage: 'Failed to update profile. Please try again.',
    loadingMessage: 'Updating profile...',
    progressSteps: [
      'Validating data...',
      'Sanitizing inputs...',
      'Checking security...',
      'Saving to database...',
      'Updating cache...'
    ]
  });
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    // Organizer-specific fields
    organizationName: user?.organizationName || '',
    organizationType: user?.organizationType || '',
    phoneNumber: user?.phoneNumber || '',
    website: user?.website || '',
    description: user?.description || ''
  });

  const [widget, setWidget] = useState<any>(null);
  const [cloudConfig, setCloudConfig] = useState<{ cloudName: string; apiKey: string; folderDefault: string } | null>(null);

  useEffect(() => {
    // Load Cloudinary config from API
    const loadConfig = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/media/config`);
        const data = await res.json();
        setCloudConfig(data);
      } catch (e) {
        console.error('Failed to load media config', e);
      }
    };
    loadConfig();
  }, []);

  const openUploadWidget = async () => {
    if (!cloudConfig) return;

    // Prepare signature endpoint
    const signatureEndpoint = `${import.meta.env.VITE_API_URL || ''}/media/sign-upload`;

    // Ensure Cloudinary widget script is available
    if (!(window as any).cloudinary) {
      // Dynamically load the script if not present
      const script = document.createElement('script');
      script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
      script.async = true;
      script.onload = () => openUploadWidget();
      document.body.appendChild(script);
      return;
    }

    const cl = (window as any).cloudinary;

    const widgetInstance = cl.createUploadWidget(
      {
        cloudName: cloudConfig.cloudName,
        apiKey: cloudConfig.apiKey,
        uploadSignature: async (callback: any, paramsToSign: any) => {
          try {
            const res = await fetch(signatureEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(paramsToSign)
            });
            const data = await res.json();
            callback(data.signature);
          } catch (e) {
            console.error('Signature fetch failed', e);
          }
        },
        uploadPreset: undefined,
        multiple: false,
        folder: cloudConfig.folderDefault,
        sources: ['local', 'camera', 'url'],
        cropping: true,
        croppingAspectRatio: 1,
        maxFileSize: 5 * 1024 * 1024,
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'webp'],
        resourceType: 'image',
      },
      async (error: any, result: any) => {
        if (!error && result && result.event === 'success') {
          const secureUrl = result.info.secure_url as string;
          try {
            await updateProfile({ avatar: secureUrl });
          } catch (err) {
            console.error('Failed to save avatar URL', err);
          }
        }
      }
    );

    widgetInstance.open();
    setWidget(widgetInstance);
  };

  const handleSave = async () => {
    if (!user) return;
    
    return feedback.withFeedback(async () => {
      setLoading(true);
      
      try {
        // Step 1: Validate profile data
        feedback.setProgressStep(0);
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing time
        
        const validationResult = validateForm(formData, PROFILE_VALIDATION_SCHEMA);
        
        if (!validationResult.isValid) {
          const errorMessage = validationResult.errors
            .map(error => `${error.field}: ${error.message}`)
            .join(', ');
          throw new Error(`Validation failed: ${errorMessage}`);
        }

        // Step 2: Sanitize data
        feedback.setProgressStep(1);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const sanitizedData = {
          firstName: sanitize.name(formData.firstName || ''),
          lastName: sanitize.name(formData.lastName || ''),
          organizationName: sanitize.text(formData.organizationName || ''),
          organizationType: sanitize.text(formData.organizationType || ''),
          phoneNumber: sanitize.phone(formData.phoneNumber || ''),
          website: sanitize.url(formData.website || ''),
          description: sanitize.text(formData.description || '')
        };

        // Step 3: Security check
        feedback.setProgressStep(2);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        for (const [key, value] of Object.entries(sanitizedData)) {
          if (typeof value === 'string' && !securityValidation.isSafeInput(value)) {
            throw new Error(`Invalid characters detected in ${key}`);
          }
        }

        // Step 4: Save to database
        feedback.setProgressStep(3);
        await updateProfile(sanitizedData);
        
        // Step 5: Update cache
        feedback.setProgressStep(4);
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setIsEditing(false);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      // Organizer-specific fields
      organizationName: user?.organizationName || '',
      organizationType: user?.organizationType || '',
      phoneNumber: user?.phoneNumber || '',
      website: user?.website || '',
      description: user?.description || ''
    });
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-foreground">
            👤 Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Avatar section */}
        <div className="bg-card rounded-lg shadow-sm p-6 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={user.avatar || 'https://res.cloudinary.com/demo/image/upload/w_96,h_96,c_thumb,g_face,r_max/avatar.png'}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border"
              />
              <div>
                <div className="text-foreground font-medium">Profile Photo</div>
                <div className="text-muted-foreground text-sm">JPG, PNG up to 5MB</div>
              </div>
            </div>
            <button onClick={openUploadWidget} className="btn-primary">Upload new photo</button>
          </div>
        </div>

        {/* Profile Information */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Personal Information
              </h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-secondary"
                >
                  Edit
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="btn-secondary"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <SaveButton
                    onSave={handleSave}
                    validateBeforeSave={() => {
                      const validationResult = validateForm(formData, PROFILE_VALIDATION_SCHEMA);
                      return validationResult.isValid || validationResult.firstError?.message || 'Please fix validation errors';
                    }}
                    successMessage="Profile updated successfully!"
                    requireConfirmation={true}
                    confirmationMessage="Are you sure you want to save these changes to your profile?"
                    className="btn-primary"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Username
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input-field"
                    placeholder="Enter username"
                  />
                ) : (
                  <p className="text-foreground py-2">{user.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="Enter email"
                  />
                ) : (
                  <p className="text-foreground py-2">{user.email}</p>
                )}
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input-field"
                    placeholder="Enter first name"
                  />
                ) : (
                  <p className="text-foreground py-2">{user.firstName || 'Not set'}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Last Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input-field"
                    placeholder="Enter last name"
                  />
                ) : (
                  <p className="text-foreground py-2">{user.lastName || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Organizer Information - Only show for organizers */}
        {user.role === 'organizer' && (
          <div className="bg-card rounded-lg shadow-sm border border-border">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Organization Information
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization Name */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Organization Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      className="input-field"
                      placeholder="Enter organization name"
                    />
                  ) : (
                    <p className="text-foreground py-2">{user.organizationName || 'Not set'}</p>
                  )}
                </div>

                {/* Organization Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Organization Type
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.organizationType}
                      onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select organization type</option>
                      <option value="corporate">Corporate/Business</option>
                      <option value="nonprofit">Non-Profit Organization</option>
                      <option value="educational">Educational Institution</option>
                      <option value="government">Government Agency</option>
                      <option value="community">Community Group</option>
                      <option value="entertainment">Entertainment</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-foreground py-2">{user.organizationType || 'Not set'}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="input-field"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-foreground py-2">{user.phoneNumber || 'Not set'}</p>
                  )}
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Website
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="input-field"
                      placeholder="Enter website URL"
                    />
                  ) : (
                    <p className="text-foreground py-2">{user.website || 'Not set'}</p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input-field min-h-[120px]"
                      placeholder="Tell us about your organization"
                    />
                  ) : (
                    <p className="text-foreground py-2">{user.description || 'Not set'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Preferences
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-foreground">Theme</span>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="input-field w-40"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                Account
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-foreground">Logout</div>
                  <div className="text-muted-foreground text-sm">Sign out of your account</div>
                </div>
                <button onClick={handleLogout} className="btn-secondary">Logout</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Feedback Components */}
      <LoadingOverlay
        isVisible={feedback.state.isLoading}
        state={feedback.state.isLoading ? 'loading' : feedback.state.isSuccess ? 'success' : 'error'}
        message={feedback.state.message}
        progress={feedback.state.progress}
        showProgress={true}
        backdrop="blur"
      />
      
      <ProgressIndicator
        isVisible={feedback.state.isLoading && feedback.state.progress > 0}
        state={feedback.state.isLoading ? 'loading' : feedback.state.isSuccess ? 'success' : feedback.state.isError ? 'error' : 'loading'}
        progress={feedback.state.progress}
        autoHide={true}
      />
    </div>
  );
};

export default ProfilePage;