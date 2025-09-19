import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, UserProfile } from '../services/authService';
import { supabase } from '../config/supabase';

interface AuthContextType {
  user: UserProfile | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cache to prevent excessive API calls
  const profileCacheRef = React.useRef<{
    profile: UserProfile | null;
    timestamp: number;
    token: string | null;
  } | null>(null);

  // Helper to load the profile based on current token
  const loadProfile = async (forceRefresh = false) => {
    try {
      const currentToken = localStorage.getItem('token');
      
      // Check cache first (valid for 30 seconds)
      if (!forceRefresh && profileCacheRef.current && 
          profileCacheRef.current.token === currentToken &&
          Date.now() - profileCacheRef.current.timestamp < 30000) {
        const cachedProfile = profileCacheRef.current.profile;
        if (cachedProfile) {
          setUser(cachedProfile);
          setUserProfile(cachedProfile);
        } else {
          setUser(null);
          setUserProfile(null);
        }
        setIsLoading(false);
        return;
      }

      const profile = await authService.getUserProfile();
      
      // Update cache
      profileCacheRef.current = {
        profile,
        timestamp: Date.now(),
        token: currentToken
      };

      if (profile) {
        setUser(profile);
        setUserProfile(profile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('token');
      profileCacheRef.current = null;
      setUser(null);
      setUserProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Initial check on mount
    loadProfile();

    // Subscribe to Supabase auth state changes to keep context in sync
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      try {
        console.log('Auth state change:', event, !!session);
        
        if (event === 'SIGNED_IN' && session?.access_token) {
          // Only refresh profile on sign in, not on every token refresh
          localStorage.setItem('token', session.access_token);
          // Force refresh on sign in to get latest profile
          await loadProfile(true);
        } else if (event === 'TOKEN_REFRESHED' && session?.access_token) {
          // Just update the token, don't refetch profile
          localStorage.setItem('token', session.access_token);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('token');
          profileCacheRef.current = null;
          if (mounted) {
            setUser(null);
            setUserProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth state change handling error:', err);
      } finally {
        // Ensure loading is not stuck
        if (mounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const signOut = async () => {
    try {
      await authService.signOut();
      profileCacheRef.current = null;
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      // Clear local state and cache even if API call fails
      profileCacheRef.current = null;
      setUser(null);
      setUserProfile(null);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      if (!user) throw new Error('No user logged in');
      
      // Update local state optimistically
      const updatedProfile = { ...user, ...updates };
      setUser(updatedProfile);
      setUserProfile(updatedProfile);
      
      // Update cache with new profile
      profileCacheRef.current = {
        profile: updatedProfile,
        timestamp: Date.now(),
        token: localStorage.getItem('token')
      };
      
      // Here you would typically make an API call to update the profile
      // await authService.updateProfile(updates);
    } catch (error) {
      console.error('Update profile error:', error);
      // Clear cache and revert on error
      profileCacheRef.current = null;
      await loadProfile(true);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading: isLoading,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;