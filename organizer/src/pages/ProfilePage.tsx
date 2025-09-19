import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn } from '../utils/cn';
import { Achievement } from '../types/auth';
import { Building2, Globe, Phone, FileText } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, updateProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
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
      await signOut();
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
      <div className="border-b border-border" style={{ backgroundColor: '#0f0e13' }}>
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
                  <button
                    onClick={handleSave}
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? <LoadingSpinner size="sm" /> : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                    placeholder="Enter username"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">{user.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input"
                    placeholder="Enter email"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">{user.email}</p>
                )}
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input"
                    placeholder="Enter first name"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white py-2">{user.firstName || 'Not set'}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  <p className="text-gray-900 dark:text-white py-2">{user.lastName || 'Not set'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Organizer Information - Only show for organizers */}
        {user.role === 'organizer' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Organization Information
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Organization Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      className="input"
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
                      className="input"
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
                    <p className="text-foreground py-2">
                      {user.organizationType ? 
                        user.organizationType.charAt(0).toUpperCase() + user.organizationType.slice(1) : 
                        'Not set'
                      }
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="input"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-foreground py-2">{user.phoneNumber || 'Not set'}</p>
                  )}
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Website
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="input"
                      placeholder="https://www.yourorganization.com"
                    />
                  ) : (
                    <p className="text-foreground py-2">
                      {user.website ? (
                        <a 
                          href={user.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline"
                        >
                          {user.website}
                        </a>
                      ) : (
                        'Not set'
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Organization Description
                  </label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="input resize-none"
                    placeholder="Describe your organization and the types of activities you organize..."
                  />
                ) : (
                  <p className="text-foreground py-2 whitespace-pre-wrap">
                    {user.description || 'Not set'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* User Statistics */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Your Statistics
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {user.stats?.totalGames || 0}
                </div>
                <div className="text-sm text-muted-foreground">Games Played</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {user.stats?.totalScore || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {user.stats?.achievements?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Achievements</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  #{user.stats?.rank || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Current Rank</div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {user.stats?.achievements && user.stats.achievements.length > 0 && (
          <div className="bg-card rounded-lg shadow-sm border border-border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-6">
                🏆 Achievements
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.stats.achievements.map((achievement: Achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="text-2xl">{achievement.icon}</div>
                    <div>
                      <h3 className="font-medium text-foreground">
                        {achievement.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* App Settings */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              App Settings
            </h2>
            
            <div className="space-y-4">
              {/* Theme Setting */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">
                    Theme
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred color scheme
                  </p>
                </div>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="input w-32"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-6">
              Account Actions
            </h2>
            
            <div className="space-y-4">
              <button
                onClick={handleLogout}
                className="w-full btn-danger"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;