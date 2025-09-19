import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocket } from '../contexts/WebSocketContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { cn } from '../utils/cn'

const gameTypes = [
  {
    id: 'scavenger_hunt',
    title: 'Scavenger Hunt',
    description: 'Find items and complete challenges',
    icon: '🔍',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'trivia',
    title: 'Trivia',
    description: 'Test your knowledge',
    icon: '🧠',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'guess_the_song',
    title: 'Guess the Song',
    description: 'Name that tune!',
    icon: '🎵',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'word_scramble',
    title: 'Word Scramble',
    description: 'Unscramble the letters',
    icon: '🔤',
    color: 'from-orange-500 to-orange-600',
  },
  {
    id: 'hangman',
    title: 'Hangman',
    description: 'Guess the word letter by letter',
    icon: '🎯',
    color: 'from-red-500 to-red-600',
  },
  {
    id: 'creative_challenge',
    title: 'Creative Challenge',
    description: 'Show your creativity',
    icon: '🎨',
    color: 'from-pink-500 to-pink-600',
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const { isConnected } = useWebSocket()
  const navigate = useNavigate()
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) return

    setIsJoining(true)
    setJoinError('')

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api'
      const response = await fetch(`${API_BASE_URL}/games/join/${joinCode.trim().toUpperCase()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to join game')
      }

      // Navigate to the game
      navigate(`/game/${data.data.id}`)
    } catch (error) {
      console.error('Error joining game:', error)
      setJoinError(error instanceof Error ? error.message : 'Failed to join game')
    } finally {
      setIsJoining(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container-mobile py-6 space-y-6">
      {/* Welcome Section */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name}! 👋
        </h1>
        <p className="text-gray-600">
          Ready to play some games?
        </p>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse" />
            <span className="text-warning-800 text-sm font-medium">
              Connecting to live updates...
            </span>
          </div>
        </div>
      )}

      {/* Join Game with Code */}
      <div className="bg-white rounded-xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          🔑 Join Game with Code
        </h2>
        
        <form onSubmit={handleJoinGame} className="space-y-4">
          <div>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value.toUpperCase())
                setJoinError('')
              }}
              placeholder="Enter 6-character game code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-center text-lg font-mono tracking-wider"
              maxLength={6}
              disabled={isJoining}
            />
            {joinError && (
              <p className="text-red-600 text-sm mt-2">{joinError}</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!joinCode.trim() || isJoining}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {isJoining ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 text-center shadow-soft">
          <div className="text-2xl font-bold text-primary">
            {user.stats?.gamesPlayed || 0}
          </div>
          <div className="text-sm text-gray-600">Games Played</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-soft">
          <div className="text-2xl font-bold text-success-600">
            {user.stats?.gamesWon || 0}
          </div>
          <div className="text-sm text-gray-600">Games Won</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-soft">
          <div className="text-2xl font-bold text-warning-600">
            {user.stats?.totalPoints || 0}
          </div>
          <div className="text-sm text-gray-600">Total Points</div>
        </div>
      </div>

      {/* Game Types */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Choose Your Game
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          {gameTypes.map((game) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group block"
            >
              <div className="bg-white rounded-xl p-4 shadow-soft hover:shadow-medium transition-all duration-200 group-active:scale-95">
                <div className={cn(
                  'w-12 h-12 rounded-lg bg-gradient-to-r flex items-center justify-center text-2xl mb-3',
                  game.color
                )}>
                  {game.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  {game.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {game.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Recent Activity
        </h2>
        
        <div className="bg-white rounded-xl p-4 shadow-soft">
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎮</div>
            <p>No recent activity</p>
            <p className="text-sm">Start playing games to see your activity here!</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          to="/leaderboard"
          className="bg-gradient-to-r from-primary to-primary/90 text-white rounded-xl p-4 text-center shadow-lg active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-2">🏆</div>
          <div className="font-semibold">Leaderboard</div>
          <div className="text-sm opacity-90">See top players</div>
        </Link>
        
        <Link
          to="/profile"
          className="bg-gradient-to-r from-secondary-500 to-secondary-600 text-white rounded-xl p-4 text-center shadow-lg active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-2">👤</div>
          <div className="font-semibold">Profile</div>
          <div className="text-sm opacity-90">View your stats</div>
        </Link>
      </div>
    </div>
  )
}