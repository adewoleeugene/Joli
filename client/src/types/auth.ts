export interface User {
  id: string
  email: string
  name: string
  username?: string
  firstName?: string
  lastName?: string
  avatar?: string
  role: 'user' | 'organizer'
  createdAt: string
  updatedAt: string
  stats?: UserStats
  // Organizer-specific fields
  organizationName?: string
  organizationType?: string
  phoneNumber?: string
  website?: string
  description?: string
}

export interface UserStats {
  totalGames?: number
  gamesPlayed: number
  gamesWon: number
  totalPoints: number
  totalScore?: number
  averageScore: number
  rank: number
  achievements: Achievement[]
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface UpdateProfileRequest {
  name?: string
  avatar?: string
}