import { supabase } from '../config/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  username?: string;
  organizationName: string;
  organizationType?: string;
  organizationDescription: string;
  phoneNumber?: string;
  website?: string;
  description?: string;
  role?: string;
  createdAt: Date;
  lastLoginAt: Date;
  stats?: {
    totalGames?: number;
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
    totalScore?: number;
    averageScore: number;
    rank: number;
    achievements: any[];
  };
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  organizationDescription: string;
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    
    if (token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
    }
    
    return {
      'Content-Type': 'application/json'
    };
  }

  // Sign up new organizer
  // Overloads to support both existing call sites and new unified signature
  async signUp(userData: SignUpData): Promise<UserProfile>;
  async signUp(email: string, password: string, details: Omit<SignUpData, 'email' | 'password'>): Promise<UserProfile>;
  async signUp(arg1: any, arg2?: any, arg3?: any): Promise<UserProfile> {
    try {
      // Normalize arguments into a SignUpData object
      const userData: SignUpData = typeof arg1 === 'string'
        ? {
            email: arg1,
            password: arg2,
            firstName: arg3?.firstName,
            lastName: arg3?.lastName,
            organizationName: arg3?.organizationName,
            organizationDescription: arg3?.organizationDescription
          }
        : arg1;

      // 1) Create the user via backend (which also creates Supabase Auth user)
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          organizationName: userData.organizationName,
          organizationDescription: userData.organizationDescription,
          role: 'organizer'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Registration failed');
      }

      // The backend returns { success, message, data: { user, token } }
      await response.json().catch(() => ({}));

      // 2) Sign in with Supabase to obtain a real access token for subsequent API calls
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });

      if (signInError || !signInData?.session?.access_token) {
        throw new Error(signInError?.message || 'Sign in after registration failed');
      }

      const accessToken = signInData.session.access_token;
      localStorage.setItem('token', accessToken);

      // 3) Verify token with backend and get normalized user profile
      const verifyResp = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!verifyResp.ok) {
        const errJson = await verifyResp.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to verify session');
      }

      const verifyData = await verifyResp.json();
      const user = verifyData?.data?.user;
      if (!user) {
        throw new Error('No user data returned');
      }

      // Normalize to UserProfile
      return {
        id: user.id,
        uid: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        organizationName: user.organizationName,
        organizationDescription: user.organizationDescription,
        role: user.role,
        createdAt: new Date(user.createdAt || Date.now()),
        lastLoginAt: new Date(user.lastLogin || user.createdAt || Date.now())
      };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  // Sign in existing organizer via Supabase and verify with backend
  async signIn(email: string, password: string): Promise<UserProfile> {
    try {
      // 1) Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        throw new Error(error?.message || 'Invalid email or password');
      }

      const accessToken = data.session.access_token;

      // 2) Verify token with backend and get user profile (creates if missing)
      const verifyResp = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!verifyResp.ok) {
        const errJson = await verifyResp.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to verify session');
      }

      // Persist token for subsequent API calls
      localStorage.setItem('token', accessToken);

      const verifyData = await verifyResp.json();
      const user = verifyData?.data?.user;
      if (!user) {
        throw new Error('No user data returned');
      }

      // Normalize to UserProfile
      return {
        id: user.id,
        uid: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        organizationName: user.organizationName,
        organizationDescription: user.organizationDescription,
        role: user.role,
        createdAt: new Date(user.createdAt || Date.now()),
        lastLoginAt: new Date(user.lastLogin || user.createdAt || Date.now())
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  // Send password reset email (alias for sendPasswordResetEmail)
  async resetPassword(email: string): Promise<void> {
    return this.sendPasswordResetEmail(email);
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send password reset email');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  }

  // Get user profile from backend
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const headers = this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        console.error('getUserProfile failed:', response.status, response.statusText);
        if (response.status === 401) {
          // Clear invalid token
          localStorage.removeItem('token');
        }
        return null;
      }

      const data = await response.json();
      const u = data?.data?.user || data?.user;
      if (!u) {
        console.error('No user data in response:', data);
        return null;
      }

      return {
        id: u.id,
        uid: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        displayName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        organizationName: u.organizationName || '',
        organizationDescription: u.organizationDescription || '',
        role: u.role,
        createdAt: new Date(u.createdAt || Date.now()),
        lastLoginAt: new Date(u.lastLogin || u.createdAt || Date.now())
      };
    } catch (error: any) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  // Get current user token
  getCurrentUserToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      localStorage.removeItem('token');
      
      // Also sign out from Supabase session
      await supabase.auth.signOut();
      
      // Optionally call backend logout endpoint
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      
      if (!response.ok) {
        console.warn('Backend logout failed, but local token cleared');
      }
    } catch (error: any) {
      console.error('Sign out error:', error);
      // Still clear local token even if backend call fails
      localStorage.removeItem('token');
      throw new Error(error.message || 'Sign out failed');
    }
  }
}

export const authService = new AuthService();
export default authService;