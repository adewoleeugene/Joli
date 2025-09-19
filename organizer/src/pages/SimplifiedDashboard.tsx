import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { Link } from 'react-router-dom'
import Badge from '../components/ui/Badge'
import JoinCodeCache from '../utils/joinCodeCache'
import { 
  Plus, 
  Users, 
  Trophy, 
  Play, 
  Trash2, 
  Gamepad2
} from 'lucide-react'

interface DashboardStats {
  totalGames: number
  activeGames: number
  totalSubmissions: number
  totalParticipants: number
}

interface Game {
  id: string
  title: string
  type: string
  status: string
  participants: number
  createdAt: Date
  description?: string
}

interface PersistentDeleteConfirmation {
  gameId: string
  timestamp: number
  expiresAt: number
}

function SimplifiedDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [games, setGames] = useState<Game[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Cache to prevent excessive API calls
  const dashboardCacheRef = React.useRef<{
    data: { stats: DashboardStats; games: Game[] };
    timestamp: number;
    userId: string | null;
  } | null>(null)

  // Constants for persistent confirmation
  const CONFIRMATION_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
  const STORAGE_KEY = 'joli_delete_confirmations'

  // Persistent confirmation management
  const savePersistentConfirmation = (gameId: string) => {
    const confirmation: PersistentDeleteConfirmation = {
      gameId,
      timestamp: Date.now(),
      expiresAt: Date.now() + CONFIRMATION_EXPIRY_MS
    }
    
    try {
      const existingConfirmations = getPersistentConfirmations()
      const updatedConfirmations = existingConfirmations.filter(c => c.gameId !== gameId)
      updatedConfirmations.push(confirmation)
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfirmations))
    } catch (error) {
      console.warn('Failed to save persistent confirmation:', error)
    }
  }

  const getPersistentConfirmations = (): PersistentDeleteConfirmation[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const confirmations: PersistentDeleteConfirmation[] = JSON.parse(stored)
      const now = Date.now()
      
      // Filter out expired confirmations
      const validConfirmations = confirmations.filter(c => c.expiresAt > now)
      
      // Update storage if we removed any expired confirmations
      if (validConfirmations.length !== confirmations.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validConfirmations))
      }
      
      return validConfirmations
    } catch (error) {
      console.warn('Failed to get persistent confirmations:', error)
      return []
    }
  }

  const removePersistentConfirmation = (gameId: string) => {
    try {
      const confirmations = getPersistentConfirmations()
      const updatedConfirmations = confirmations.filter(c => c.gameId !== gameId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfirmations))
    } catch (error) {
      console.warn('Failed to remove persistent confirmation:', error)
    }
  }

  const isPersistentlyConfirmed = (gameId: string): boolean => {
    const confirmations = getPersistentConfirmations()
    return confirmations.some(c => c.gameId === gameId)
  }



  useEffect(() => {
    const fetchDashboardData = async (forceRefresh = false) => {
      try {
        const currentUserId = user?.id || null;
        
        // Check cache first (valid for 60 seconds)
        if (!forceRefresh && dashboardCacheRef.current && 
            dashboardCacheRef.current.userId === currentUserId &&
            Date.now() - dashboardCacheRef.current.timestamp < 60000) {
          const cachedData = dashboardCacheRef.current.data;
          setStats(cachedData.stats);
          setGames(cachedData.games);
          setLoading(false);
          return;
        }

        setLoading(true)
        const token = localStorage.getItem('token')
        
        // Fetch dashboard stats
        const response = await fetch('/api/organizer/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        let statsData = null;
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const apiStats = data.data?.stats || {}
            statsData = {
              totalGames: apiStats.totalGames ?? 0,
              activeGames: apiStats.activeGames ?? 0,
              totalSubmissions: apiStats.totalSubmissions ?? 0,
              totalParticipants: apiStats.totalParticipants ?? 0
            };
            setStats(statsData)
          }
        }
        
        // Fetch all games
        const gamesResponse = await fetch('/api/games', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json()
          const allGames = gamesData.data?.games || []
          const mappedGames = allGames.map((game: any) => ({
            id: game.id || game._id,
            title: game.title,
            type: game.type,
            status: game.status,
            participants: game.participants || 0,
            createdAt: new Date(game.createdAt || Date.now()),
            description: game.description
          }))
          
          setGames(mappedGames)
          
          // Cache the successful result if we have both stats and games data
          if (statsData && mappedGames) {
            dashboardCacheRef.current = {
              data: {
                stats: statsData,
                games: mappedGames
              },
              timestamp: Date.now(),
              userId: currentUserId
            };
          }
        }
        
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error)
        setError(error?.message || 'Failed to load dashboard')
        // Set fallback data
        setStats({
          totalGames: 0,
          activeGames: 0,
          totalSubmissions: 0,
          totalParticipants: 0
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user])

  // Restore persistent confirmations on component mount
  useEffect(() => {
    const restorePersistentConfirmations = () => {
      const confirmations = getPersistentConfirmations()
      if (confirmations.length > 0) {
        // If there's a persistent confirmation, restore the first one
        // (in practice, there should only be one at a time)
        setDeleteConfirm(confirmations[0].gameId)
      }
    }

    restorePersistentConfirmations()
  }, [])

  const handleDeleteGame = async (gameId: string) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        alert('Authentication required. Please log in again.')
        return
      }

      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        // Get the game title for success message
        const deletedGame = games.find(game => game.id === gameId)
        const gameTitle = deletedGame?.title || 'Game'
        
        // Clean up cached join code when game is deleted
        JoinCodeCache.removeGameFromCache(gameId)
        
        // Remove the game from the local state
        const updatedGames = games.filter(game => game.id !== gameId)
        setGames(updatedGames)
        
        // Calculate stats based on the updated games array to prevent negative values
        const activeGamesCount = updatedGames.filter(game => game.status === 'active').length
        setStats(prev => prev ? ({
          ...prev,
          totalGames: updatedGames.length,
          activeGames: activeGamesCount
        }) : prev)
        
        // Clear both local state and persistent storage
        setDeleteConfirm(null)
        removePersistentConfirmation(gameId)
        
        // Show success message
        alert(`"${gameTitle}" has been successfully deleted.`)
      } else {
        let errorMessage = 'Unknown error occurred'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || `HTTP ${response.status}`
        }
        
        console.error('Delete game failed:', { status: response.status, message: errorMessage })
        alert(`Failed to delete game: ${errorMessage}`)
      }
    } catch (error) {
      console.error('Error deleting game:', error)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to delete game'
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (error instanceof Error) {
        errorMessage = `Error: ${error.message}`
      }
      
      alert(errorMessage)
    }
  }

  const handleSetDeleteConfirm = (gameId: string) => {
    setDeleteConfirm(gameId)
    savePersistentConfirmation(gameId)
  }

  const handleCancelDeleteConfirm = () => {
    if (deleteConfirm) {
      removePersistentConfirmation(deleteConfirm)
    }
    setDeleteConfirm(null)
  }

  const formatGameType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12" style={{maxWidth: '1200px'}}>
        {/* Header with Create Button */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-foreground mb-2 tracking-tight">
                My Experiences
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg font-light">Create and manage your interactive experiences</p>
            </div>
            <div className="flex justify-center sm:justify-end">
              <Link
                to="/games/create"
                className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm font-medium rounded-xl text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring shadow-soft transition-all duration-200 hover:shadow-medium active:scale-95 touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Create Experience</span>
                <span className="sm:hidden">Create</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12 lg:mb-16">
          <div className="bg-card rounded-lg sm:rounded-xl shadow-soft p-4 sm:p-6 border border-border hover:shadow-medium transition-all duration-300 group">
             <div className="flex items-center gap-4 mb-3">
               <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors duration-300">
                 <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
               </div>
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Games</p>
             </div>
             <div className="flex justify-end">
               <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground">{stats?.totalGames || 0}</p>
             </div>
           </div>
          
          <div className="bg-card rounded-lg sm:rounded-xl shadow-soft p-4 sm:p-6 border border-border hover:shadow-medium transition-all duration-300 group">
             <div className="flex items-center gap-4 mb-3">
               <div className="p-2 bg-accent/20 rounded-lg group-hover:bg-accent/30 transition-colors duration-300">
                 <Play className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
               </div>
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Active Games</p>
             </div>
             <div className="flex justify-end">
               <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground">{stats?.activeGames || 0}</p>
             </div>
           </div>
          
          <div className="bg-card rounded-lg sm:rounded-xl shadow-soft p-4 sm:p-6 border border-border hover:shadow-medium transition-all duration-300 group">
             <div className="flex items-center gap-4 mb-3">
               <div className="p-2 bg-secondary/50 rounded-lg group-hover:bg-secondary/70 transition-colors duration-300">
                 <Users className="h-5 w-5 sm:h-6 sm:w-6 text-secondary-foreground" />
               </div>
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Participants</p>
             </div>
             <div className="flex justify-end">
               <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground">{stats?.totalParticipants || 0}</p>
             </div>
           </div>
          
          <div className="bg-card rounded-lg sm:rounded-xl shadow-soft p-4 sm:p-6 border border-border hover:shadow-medium transition-all duration-300 group">
             <div className="flex items-center gap-4 mb-3">
               <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors duration-300">
                 <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
               </div>
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Submissions</p>
             </div>
             <div className="flex justify-end">
               <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground">{stats?.totalSubmissions || 0}</p>
             </div>
           </div>
        </div>

        {/* My Experiences */}
        <div className="w-full">
            <div className="bg-card rounded-xl sm:rounded-2xl shadow-soft border border-border overflow-hidden">
              <div className="p-4 sm:p-6 lg:p-8 border-b border-border">
                <h2 className="text-xl sm:text-2xl font-light text-foreground mb-2">My Experiences</h2>
                <p className="text-muted-foreground text-sm sm:text-base font-light">Manage and track your game experiences</p>
              </div>
              <div className="p-4 sm:p-6 lg:p-8">
                {games.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                    {games.map((game) => (
                      <div key={game.id} className="bg-card rounded-xl sm:rounded-2xl shadow-soft border border-border p-4 sm:p-6 lg:p-8 hover:shadow-medium hover:border-primary/20 transition-all duration-300 group">
                        <div className="flex flex-col mb-4 sm:mb-6">
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                              <h3 className="text-lg sm:text-xl font-medium text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                {game.title}
                              </h3>
                              <Badge variant={game.status === 'draft' ? 'draft' : game.status === 'active' ? 'active' : 'default'} className="whitespace-nowrap self-start">
                                {game.status === 'active' ? 'Live' : game.status === 'draft' ? 'Draft' : 'Ended'}
                              </Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 font-medium uppercase tracking-wide">{formatGameType(game.type)}</p>
                            {game.description && (
                              <p className="text-sm text-muted-foreground mb-4 sm:mb-6 line-clamp-2 leading-relaxed">{game.description}</p>
                            )}
                            <div className="flex items-center text-sm text-muted-foreground mb-4 sm:mb-6">
                              <Users className="h-4 w-4 mr-2" />
                              <span className="font-medium">{game.participants} participants</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          {deleteConfirm === game.id ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleDeleteGame(game.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-destructive text-sm font-medium rounded-lg text-destructive-foreground bg-destructive hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all duration-200"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={handleCancelDeleteConfirm}
                                className="inline-flex items-center px-3 py-1.5 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSetDeleteConfirm(game.id)}
                              className="flex-1 inline-flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 border border-border text-sm font-medium rounded-lg sm:rounded-xl text-muted-foreground bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-200 active:scale-95 touch-manipulation"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </button>
                          )}
                          <Link
                            to={`/dashboard?gameId=${game.id}`}
                            className="flex-1 inline-flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 border border-transparent text-sm font-medium rounded-lg sm:rounded-xl text-primary-foreground bg-primary hover:opacity-90 transition-all duration-200 shadow-soft hover:shadow-medium active:scale-95 touch-manipulation"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Manage
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 sm:py-16 lg:py-24">
                    <div className="mx-auto mb-8 sm:mb-12">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-3xl opacity-30"></div>
                        <svg className="relative mx-auto h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40 text-muted-foreground/40" viewBox="0 0 200 200" fill="none">
                          <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1.5" strokeDasharray="12 8" className="animate-pulse-slow" />
                          <circle cx="100" cy="80" r="12" fill="currentColor" opacity="0.6" />
                          <path d="M88 95h24v10H88z" fill="currentColor" opacity="0.6" />
                          <path d="M85 110c0-8.284 6.716-15 15-15s15 6.716 15 15v20H85v-20z" fill="currentColor" opacity="0.6" />
                          <path d="M75 140h50v5H75z" fill="currentColor" opacity="0.6" />
                          <circle cx="70" cy="60" r="3" fill="currentColor" opacity="0.3" />
                          <circle cx="130" cy="65" r="2" fill="currentColor" opacity="0.3" />
                          <circle cx="140" cy="45" r="2.5" fill="currentColor" opacity="0.2" />
                          <path d="M60 120l8-8 4 4 8-8" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-light text-foreground mb-3 sm:mb-4">
                      Nothing to see here!
                    </h3>
                    <p className="text-muted-foreground mb-8 sm:mb-12 max-w-sm sm:max-w-md mx-auto text-base sm:text-lg font-light leading-relaxed px-4">
                      Flex your creative feathers and build your very first Experience
                    </p>

                  </div>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}

export default SimplifiedDashboard