import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      // Here you would implement the actual password change logic
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      toast.success('Password changed successfully!');
      navigate('/account-info');
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/account-info')}
              className="flex items-center mr-4 transition-colors"
              style={{ 
                color: 'var(--muted-foreground)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted-foreground)'}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Account Info
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            Change Password
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
          {/* Current Password */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              CURRENT PASSWORD
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
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

          {/* New Password */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              NEW PASSWORD
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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

          {/* Confirm New Password */}
          <div className="mb-8">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
              CONFIRM NEW PASSWORD
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

          {/* Save Button */}
          <button
            onClick={handleSavePassword}
            disabled={isLoading}
            className="px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
            {isLoading ? 'Saving...' : 'Save password'}
          </button>
        </div>
      </main>
    </div>
  );
}