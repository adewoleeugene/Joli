import React from 'react'
import { Link } from 'react-router-dom'
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
    color: 'from-primary to-primary/90',
  },
  {
    id: 'trivia',
    title: 'Trivia',
    description: 'Test your knowledge',
    icon: '🧠',
    color: 'from-chart-4 to-chart-4/90',
  },
  {
    id: 'guess_the_song',
    title: 'Guess the Song',
    description: 'Name that tune!',
    icon: '🎵',
    color: 'from-chart-2 to-chart-2/90',
  },
  {
    id: 'word_scramble',
    title: 'Word Scramble',
    description: 'Unscramble the letters',
    icon: '🔤',
    color: 'from-chart-3 to-chart-3/90',
  },
  {
    id: 'hangman',
    title: 'Hangman',
    description: 'Guess the word letter by letter',
    icon: '🎯',
    color: 'from-destructive to-destructive/90',
  },
  {
    id: 'creative_challenge',
    title: 'Creative Challenge',
    description: 'Show your creativity',
    icon: '🎨',
    color: 'from-chart-5 to-chart-5/90',
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const { isConnected } = useWebSocket()

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
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user.firstName || user.email}! 👋
        </h1>
        <p className="text-muted-foreground">
          Ready to play some games?
        </p>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-chart-3/10 border border-chart-3/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-chart-3 rounded-full animate-pulse" />
            <span className="text-chart-3 text-sm font-medium">
              Connecting to live updates...
            </span>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 text-center shadow-soft">
          <div className="text-2xl font-bold text-primary">
            {user.stats?.gamesPlayed || 0}
          </div>
          <div className="text-sm text-muted-foreground">Games Played</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center shadow-soft">
          <div className="text-2xl font-bold text-chart-2">
            {user.stats?.gamesWon || 0}
          </div>
          <div className="text-sm text-muted-foreground">Games Won</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center shadow-soft">
          <div className="text-2xl font-bold text-chart-3">
            {user.stats?.totalPoints || 0}
          </div>
          <div className="text-sm text-muted-foreground">Total Points</div>
        </div>
      </div>

      {/* Game Types */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Choose Your Game
        </h2>
        
        <div className="grid grid-cols-2 gap-4">
          {gameTypes.map((game) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group block"
            >
              <div className="bg-card rounded-xl p-4 shadow-soft hover:shadow-medium transition-all duration-200 group-active:scale-95">
                <div className={cn(
                  'w-12 h-12 rounded-lg bg-gradient-to-r flex items-center justify-center text-2xl mb-3',
                  game.color
                )}>
                  {game.icon}
                </div>
                <h3 className="font-semibold text-card-foreground mb-1">
                  {game.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {game.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          Recent Activity
        </h2>
        
        <div className="bg-card rounded-xl p-4 shadow-soft">
          <div className="text-center py-8 text-muted-foreground">
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
          className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl p-4 text-center shadow-lg active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-2">🏆</div>
          <div className="font-semibold">Leaderboard</div>
          <div className="text-sm opacity-90">See top players</div>
        </Link>
        
        <Link
          to="/profile"
          className="bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground rounded-xl p-4 text-center shadow-lg active:scale-95 transition-transform"
        >
          <div className="text-2xl mb-2">👤</div>
          <div className="font-semibold">Profile</div>
          <div className="text-sm opacity-90">View your stats</div>
        </Link>
      </div>
    </div>
  )
}