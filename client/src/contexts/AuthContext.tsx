import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { authService } from '../services/authService'
import { User } from '../types/auth'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (
    email: string, 
    password: string, 
    name: string, 
    role?: 'user' | 'organizer',
    additionalData?: Record<string, any>
  ) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing authentication
    const checkAuth = async () => {
      try {
        const userData = await authService.getCurrentUser()
        setUser(userData)
      } catch (error) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('Attempting login with:', email)
      const { user: userData, token } = await authService.login(email, password)
      console.log('Login successful, user data:', userData)
      localStorage.setItem('token', token)
      setUser(userData)
      toast.success('Welcome back!')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (
    email: string, 
    password: string, 
    name: string, 
    role: 'user' | 'organizer' = 'user',
    additionalData?: Record<string, any>
  ) => {
    try {
      setLoading(true)
      const { user: userData, token } = await authService.register(email, password, name)
      localStorage.setItem('token', token)
      setUser(userData)
      toast.success('Account created successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setUser(null)
      toast.success('Logged out successfully')
    } catch (error: any) {
      console.error('Logout error:', error)
      // Clear local state even if logout fails
      localStorage.removeItem('token')
      setUser(null)
      toast.error(error.message || 'Logout failed')
    }
  }

  const updateProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await authService.updateProfile(data)
      setUser(updatedUser)
      toast.success('Profile updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}