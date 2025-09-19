import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            // Try to refresh token
            const refreshResponse = await this.client.post('/auth/refresh')
            const { token } = refreshResponse.data
            localStorage.setItem('token', token)
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${token}`
            return this.client(originalRequest)
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('token')
            window.location.href = '/login'
            return Promise.reject(refreshError)
          }
        }

        // Handle other errors
        if (error.response?.status >= 500) {
          toast.error('Server error. Please try again later.')
        } else if (error.response?.status === 404) {
          toast.error('Resource not found.')
        } else if (error.response?.status === 403) {
          toast.error('Access denied.')
        } else if (error.code === 'ECONNABORTED') {
          toast.error('Request timeout. Please check your connection.')
        } else if (!error.response) {
          toast.error('Network error. Please check your connection.')
        }

        return Promise.reject(error)
      }
    )
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config)
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config)
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config)
  }

  // Upload file with progress
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  }

  // Set base URL (useful for switching environments)
  setBaseURL(baseURL: string) {
    this.client.defaults.baseURL = baseURL
  }

  // Get current base URL
  getBaseURL(): string {
    return this.client.defaults.baseURL || ''
  }
}

export const apiClient = new ApiClient()