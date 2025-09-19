import React, { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserAvatarProps {
  onSignOut: () => void;
}

export default function UserAvatar({ onSignOut }: UserAvatarProps) {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getInitials = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0)}`;
    }
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`
        : names[0].charAt(0);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getDisplayName = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`;
    }
    return user?.displayName || user?.email || 'User';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {/* Avatar Circle */}
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
          {getInitials()}
        </div>
        
        {/* Name and Chevron */}
        <div className="hidden sm:flex items-center space-x-1">
          <span className="text-sm font-medium text-foreground">
            {userProfile?.firstName || user?.displayName?.split(' ')[0] || 'User'}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg border border-border py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-medium">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {getDisplayName()}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user?.email}
                </p>
                {userProfile?.organizationName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {userProfile.organizationName}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Account Info */}
            <button 
              onClick={() => {
                setIsOpen(false);
                navigate('/account-info');
              }}
              className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted/50 flex items-center space-x-3"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>Account Info</span>
            </button>

            {/* Divider */}
            <div className="border-t border-border my-1"></div>

            {/* Sign Out */}
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3"
            >
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}