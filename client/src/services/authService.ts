import { User, LoginRequest, RegisterRequest, AuthResponse, UpdateProfileRequest } from '../types/auth'
import { apiClient } from './apiClient'

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    })
    return response.data
  }

  async register(email: string, password: string, name: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    })
    return response.data
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  }

  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response = await apiClient.put<User>('/auth/profile', data)
    return response.data
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh')
    return response.data
  }

  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint
      await apiClient.post('/auth/logout')
      
      // Clear local storage
      localStorage.removeItem('token')
    } catch (error: any) {
      console.error('Logout error:', error)
      // Still clear local token even if backend call fails
      localStorage.removeItem('token')
      throw new Error(error.message || 'Logout failed')
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email })
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password })
  }

  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { token })
  }

  async resendVerification(email: string): Promise<void> {
    await apiClient.post('/auth/resend-verification', { email })
  }
}

export const authService = new AuthService()