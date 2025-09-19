// Game Types
export enum GameType {
  SCAVENGER_HUNT = 'scavenger_hunt',
  TRIVIA = 'trivia',
  SONG_VOTING = 'dj_song_voting',
  GUESS_THE_SONG = 'guess_the_song',
  HANGMAN = 'hangman',
  WORD_SCRAMBLE = 'word_scramble',
  CREATIVE_CHALLENGE = 'creative_challenge',
  TRUTH_OR_DARE = 'truth_or_dare'
}

export type GameTypeValue = 
  | 'scavenger_hunt'
  | 'dj_song_voting'
  | 'guess_the_song'
  | 'trivia'
  | 'hangman'
  | 'word_scramble'
  | 'creative_challenge'
  | 'truth_or_dare'

export enum GameStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface Game {
  id: string
  title: string
  description: string
  image?: string
  type: GameType
  status: GameStatus
  difficulty: DifficultyLevel
  maxParticipants?: number
  timeLimit?: number // in minutes
  pointsReward: number
  rules: string[]
  settings: GameSettings
  createdBy: string
  createdAt: string
  updatedAt: string
  startTime?: string
  endTime?: string
}

export interface GameSettings {
  allowMultipleAttempts: boolean
  showLeaderboard: boolean
  requireApproval: boolean
  customFields?: Record<string, any>
}

export interface GameSession {
  id: string
  gameId: string
  userId: string
  status: 'active' | 'completed' | 'abandoned'
  startedAt: string
  completedAt?: string
  currentStep: number
  totalSteps: number
  score: number
  timeSpent: number // in seconds
  submissions: GameSubmission[]
  metadata?: Record<string, any>
}

export interface GameSubmission {
  id: string
  sessionId: string
  gameId: string
  userId: string
  step: number
  content: SubmissionContent
  isCorrect?: boolean
  points: number
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  feedback?: string
}

export interface SubmissionContent {
  type: 'text' | 'image' | 'audio' | 'video' | 'location' | 'multiple_choice'
  value: string | string[] | File | MediaFile
  metadata?: Record<string, any>
}

export interface MediaFile {
  url: string
  filename: string
  size: number
  mimeType: string
}

// Game-specific interfaces
export interface ScavengerHuntItem {
  id: string
  description: string
  hint?: string
  requiredProof: 'photo' | 'video' | 'text' | 'location'
  points: number
  order: number
}

export interface TriviaQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  points: number
  timeLimit?: number
  category?: string
}

export interface SongVotingOption {
  id: string
  title: string
  artist: string
  previewUrl?: string
  votes: number
}

export interface HangmanGame {
  word: string
  category: string
  hint?: string
  maxWrongGuesses: number
}

export interface WordScrambleGame {
  originalWord: string
  scrambledWord: string
  hint?: string
  category?: string
}

export interface CreativeChallenge {
  prompt: string
  requirements: string[]
  submissionType: 'photo' | 'video' | 'text' | 'audio'
  judgesCriteria: string[]
}

export interface TruthOrDareOption {
  id: string
  type: 'truth' | 'dare'
  content: string
  difficulty: DifficultyLevel
  category?: string
}

// Leaderboard and statistics
export interface LeaderboardEntry {
  userId: string
  userName: string
  userAvatar?: string
  score: number
  rank: number
  gamesCompleted: number
  averageTime: number
  lastActivity: string
}

export interface GameStatistics {
  totalParticipants: number
  completionRate: number
  averageScore: number
  averageTime: number
  topScore: number
  participantsByDifficulty: Record<DifficultyLevel, number>
  submissionsByType: Record<string, number>
}

// Real-time game events
export interface GameEvent {
  id: string
  type: 'player_joined' | 'player_left' | 'submission_made' | 'game_completed' | 'leaderboard_updated'
  gameId: string
  userId?: string
  data: Record<string, any>
  timestamp: string
}