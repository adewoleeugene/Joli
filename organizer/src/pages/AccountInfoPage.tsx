import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AccountInfoPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email || '');

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      // Here you would implement the actual save logic
      // For now, just show a success message
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Changes saved successfully!');
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = () => {
    navigate('/change-password');
  };

  const handleDeleteAccount = () => {
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.error('Delete account functionality coming soon');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#0f0e13', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/organizer/dashboard')}
              className="flex items-center mr-4 transition-colors"
              style={{ 
                color: 'var(--muted-foreground)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            Account Info
          </h1>
        </div>

        <div 
          className="rounded-lg p-8"
          style={{ 
            backgroundColor: 'var(--card)', 
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)'
          }}
        >
          {/* Edit Account Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
              Edit Account
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
              Update your account email and profile image, or change your password.
            </p>

            {/* Profile Image Upload */}
            <div className="mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: 'var(--muted)' }}
                  >
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8" style={{ color: 'var(--muted-foreground)' }} />
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="image-upload">
                    <div 
                      className="inline-flex items-center px-4 py-2 border rounded-lg cursor-pointer transition-colors"
                      style={{
                        borderColor: 'var(--primary)',
                        color: 'var(--primary)',
                        backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary)';
                        e.currentTarget.style.color = 'var(--primary-foreground)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--primary)';
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Image
                    </div>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    We recommend JPG or PNG
                  </p>
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>



          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={handleSaveChanges}
                disabled={isLoading}
                className="px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                {isLoading ? 'Saving...' : 'Save changes'}
              </button>
              <button
                onClick={handleChangePassword}
                className="px-6 py-3 border rounded-lg transition-colors font-medium"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  backgroundColor: 'var(--background)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--muted)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background)';
                }}
              >
                Change password
              </button>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="font-medium transition-colors"
              style={{
                color: 'var(--destructive)',
                backgroundColor: 'transparent',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}