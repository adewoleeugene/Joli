import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/authService'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { cn } from '../utils/cn'
import { Link } from 'react-router-dom'
import Badge from '../components/ui/Badge'
import { Plus, BarChart3, Users, Trophy, Settings, Play, Pause, Eye, Calendar, Gamepad2, TrendingUp, List } from 'lucide-react'

interface OrganizerStats {
  participants: {
    total: number
    active: number
    new: number
  }
  games: {
    total: number
    active: number
    completed: number
  }
  engagement: {
    averageParticipation: number
    totalSubmissions: number
    completionRate: number
  }
}

interface ActiveGame {
  _id: string
  title: string
  type: 'scavenger_hunt' | 'trivia' | 'guess_the_song' | 'word_scramble' | 'hangman' | 'creative_challenge' | 'dj_song_voting' | 'truth_or_dare'
  status: 'active' | 'paused' | 'completed'
  participants: number
  submissions: number
  completionRate: number
  averageScore: number
  createdAt: Date
}

interface GameTypeOption {
  id: string
  title: string
  description: string
  icon: string
  color: string
}

interface RecentActivity {
  _id: string
  type: 'participant_joined' | 'game_completed' | 'submission_received'
  description: string
  timestamp: Date
}

function OrganizerDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<OrganizerStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)

  // Cache to prevent excessive API calls
  const dashboardCacheRef = React.useRef<{
    data: { stats: OrganizerStats; recentActivity: RecentActivity[]; activeGames: ActiveGame[] };
    timestamp: number;
    userId: string | null;
  } | null>(null)

  const gameTypeOptions: GameTypeOption[] = [
    {
      id: 'scavenger_hunt',
      title: 'Scavenger Hunt',
      description: 'Interactive photo and location-based challenges',
      icon: '🔍',
      color: 'bg-blue-500'
    },
    {
      id: 'trivia',
      title: 'Trivia Challenge',
      description: 'Multiple choice questions on various topics',
      icon: '🧠',
      color: 'bg-purple-500'
    },
    {
      id: 'guess_the_song',
      title: 'Guess the Song',
      description: 'Music identification and artist guessing',
      icon: '🎵',
      color: 'bg-green-500'
    },
    {
      id: 'word_scramble',
      title: 'Word Scramble',
      description: 'Unscramble letters to form words',
      icon: '🔤',
      color: 'bg-yellow-500'
    },
    {
      id: 'creative_challenge',
      title: 'Creative Challenge',
      description: 'Photo, video, and artistic submissions',
      icon: '🎨',
      color: 'bg-pink-500'
    },
    {
      id: 'dj_song_voting',
      title: 'DJ Song Voting',
      description: 'Collaborative playlist creation and voting',
      icon: '🎧',
      color: 'bg-indigo-500'
    }
  ]

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
          setRecentActivity(cachedData.recentActivity);
          setActiveGames(cachedData.activeGames);
          setLoading(false);
          return;
        }

        setLoading(true);
        
        const token = localStorage.getItem('token');
        
        // Fetch dashboard stats and recent activity
        const response = await fetch('/api/organizer/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Align with backend response shape
          const apiStats = data.data?.stats || {};

          const totalGames = apiStats.totalGames ?? 0;
          const totalSubmissions = apiStats.totalSubmissions ?? 0;

          setStats({
            // Participants are not provided by backend dashboard; default to 0s for now
            participants: { 
              total: 0, 
              active: 0, 
              new: 0 
            },
            games: { 
              total: totalGames, 
              active: 0, 
              completed: 0 
            },
            engagement: { 
              totalSubmissions: totalSubmissions, 
              averageParticipation: 0,
              completionRate: 0
            }
          });
          
          // Normalize recent activity to component's expected shape
          const normalizedActivity = (data.data?.recentActivity || []).map((item: any) => ({
            _id: item.id || item._id || Math.random().toString(36).slice(2),
            type: 'game_completed' as RecentActivity['type'],
            description: item.description || item.title || 'Activity',
            timestamp: new Date(item.timestamp || Date.now())
          }));
          setRecentActivity(normalizedActivity);
        }

        // Fetch active games (use existing /api/games with status filter)
        const gamesResponse = await fetch('/api/games?status=active', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (gamesResponse.ok) {
          const gamesData = await gamesResponse.json();
          const games = (gamesData.data?.games) || [];

          // Map games to expected UI shape first
          const mappedGames = games.map((g: any) => ({
            _id: g.id || g._id,
            title: g.title,
            type: g.type,
            status: g.status,
            participants: 0,
            submissions: 0,
            completionRate: 0,
            averageScore: 0,
            createdAt: g.createdAt ? new Date(g.createdAt) : new Date()
          }));
          
          // Fetch analytics for each active game
          const gamesWithAnalytics = await Promise.all(
            mappedGames.map(async (game: any) => {
              try {
                if (!game._id) return game;
                const analyticsResponse = await fetch(`/api/games/${game._id}/analytics`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (analyticsResponse.ok) {
                  const analyticsData = await analyticsResponse.json();
                  const analytics = analyticsData.data?.analytics || {};
                  
                  return {
                    ...game,
                    participants: analytics.totalParticipants ?? game.participants,
                    submissions: analytics.totalSubmissions ?? game.submissions,
                    completionRate: analytics.completionRate ?? game.completionRate,
                    averageScore: analytics.averageScore ?? game.averageScore
                  };
                }
              } catch (error) {
                console.error(`Error fetching analytics for game ${game._id}:`, error);
              }
              
              // Fallback if analytics fetch fails
              return game;
            })
          );
          
          setActiveGames(gamesWithAnalytics);
          
          // Cache the successful result
          if (stats) {
            dashboardCacheRef.current = {
              data: {
                stats,
                recentActivity,
                activeGames: gamesWithAnalytics
              },
              timestamp: Date.now(),
              userId: currentUserId
            };
          }
        }
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error?.message || 'Failed to load dashboard');
        // Fallback to mock data on error
        setStats({
          participants: { total: 0, active: 0, new: 0 },
          games: { total: 0, active: 0, completed: 0 },
          engagement: { totalSubmissions: 0, averageParticipation: 0, completionRate: 0 }
        });
        setRecentActivity([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    const iconClass = "w-5 h-5"
    
    switch (type) {
      case 'participant_joined':
        return (
          <svg className={cn(iconClass, "text-chart-1")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      case 'game_completed':
        return (
          <svg className={cn(iconClass, "text-chart-2")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'submission_received':
        return (
          <svg className={cn(iconClass, "text-chart-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        )
      default:
        return (
          <svg className={cn(iconClass, "text-muted-foreground")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {(user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(' ')).trim() || 'Organizer'}!
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your games and track performance analytics.
              </p>
            </div>
            <div className="mt-4 lg:mt-0 flex flex-wrap gap-3">
              <Link
                to="/games/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                <Gamepad2 className="h-4 w-4 mr-2" />
                Create Game
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link
            to="/games/create"
            className="bg-card rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Create Games</p>
                <p className="text-lg font-semibold text-card-foreground group-hover:text-chart-1">Start Building</p>
              </div>
              <Gamepad2 className="h-8 w-8 text-chart-1" />
            </div>
          </Link>
          <div className="bg-card rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Analytics</p>
                <p className="text-lg font-semibold text-card-foreground">View Reports</p>
              </div>
              <TrendingUp className="h-8 w-8 text-chart-2" />
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Support</p>
                <p className="text-lg font-semibold text-card-foreground">Get Help</p>
              </div>
              <Settings className="h-8 w-8 text-chart-4" />
            </div>
          </div>
        </div>

        {/* Performance Stats Overview */}
        {stats && (
          <div className="bg-card rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-card-foreground">Performance Overview</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-chart-1/10 rounded-lg mx-auto mb-3">
                    <Play className="h-6 w-6 text-chart-1" />
                  </div>
                  <p className="text-3xl font-bold text-chart-1">{stats.games.active}</p>
                  <p className="text-sm font-medium text-muted-foreground">Active Games</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{stats.games.total} total games</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-chart-2/10 rounded-lg mx-auto mb-3">
                    <Users className="h-6 w-6 text-chart-2" />
                  </div>
                  <p className="text-3xl font-bold text-chart-2">{stats.participants.total}</p>
                  <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{stats.participants.new} new this week</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-chart-3/10 rounded-lg mx-auto mb-3">
                    <BarChart3 className="h-6 w-6 text-chart-3" />
                  </div>
                  <p className="text-3xl font-bold text-chart-3">{stats.engagement.completionRate}%</p>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{stats.engagement.totalSubmissions} submissions</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-12 h-12 bg-chart-4/10 rounded-lg mx-auto mb-3">
                    <Trophy className="h-6 w-6 text-chart-4" />
                  </div>
                  <p className="text-3xl font-bold text-chart-4">{stats.games.total}</p>
                  <p className="text-sm font-medium text-muted-foreground">Total Games</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{stats.games.active} currently active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Games Section */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg shadow">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="text-lg font-semibold text-card-foreground">Active Games</h2>
                <Link
                  to="/games/create"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Game
                </Link>
              </div>
              <div className="p-6">
                {activeGames.length > 0 ? (
                  <div className="space-y-4">
                    {activeGames.map((game) => (
                      <div
                        key={game._id}
                        className={cn(
                          "border rounded-lg p-4 cursor-pointer transition-all",
                          selectedGame === game._id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-border/80"
                        )}
                        onClick={() => setSelectedGame(selectedGame === game._id ? null : game._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                              gameTypeOptions.find(opt => opt.id === game.type)?.color || "bg-muted"
                            )}>
                              {gameTypeOptions.find(opt => opt.id === game.type)?.icon || '🎮'}
                            </div>
                            <div>
                              <h3 className="font-medium text-card-foreground">{game.title}</h3>
                              <p className="text-sm text-muted-foreground">{gameTypeOptions.find(opt => opt.id === game.type)?.title || 'Game'}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={game.status === 'active' ? 'active' : game.status === 'paused' ? 'paused' : game.status === 'completed' ? 'completed' : 'default'}>
                              {game.status}
                            </Badge>
                            <button className="p-1 text-muted-foreground hover:text-foreground">
                              <Settings className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {selectedGame === game._id && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div className="text-center">
                                <p className="text-2xl font-bold text-chart-1">{game.participants}</p>
                                <p className="text-xs text-muted-foreground">Participants</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-chart-2">{game.submissions}</p>
                                <p className="text-xs text-muted-foreground">Submissions</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-chart-3">{game.completionRate}%</p>
                                <p className="text-xs text-muted-foreground">Completion</p>
                              </div>
                              <div className="text-center">
                                <p className="text-2xl font-bold text-chart-4">{game.averageScore}</p>
                                <p className="text-xs text-muted-foreground">Avg Score</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Link
                                to={`/games/${game._id}/analytics`}
                                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-input shadow-sm text-sm leading-4 font-medium rounded-md text-foreground bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                              >
                                <BarChart3 className="h-4 w-4 mr-1" />
                                Analytics
                              </Link>
                              <Link
                                to={`/dashboard?gameId=${game._id}`}
                                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-input shadow-sm text-sm leading-4 font-medium rounded-md text-foreground bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                Manage
                              </Link>
                              <Link
                                to={`/games/${game._id}/preview`}
                                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-input shadow-sm text-sm leading-4 font-medium rounded-md text-foreground bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Play className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium text-card-foreground">No active games</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first game.</p>
                    <div className="mt-6">
                      <Link
                        to="/games/create"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create Game
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Game Creation Options */}
            <div className="bg-card rounded-lg shadow">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-card-foreground">Create New Game</h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {gameTypeOptions.slice(0, 4).map((gameType) => (
                    <Link
                      key={gameType.id}
                      to={`/games/create?type=${gameType.id}`}
                      className="block p-3 border border-border rounded-lg hover:border-border/80 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm",
                          gameType.color
                        )}>
                          {gameType.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-card-foreground">{gameType.title}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  <Link
                    to="/games/create"
                    className="block text-center py-2 text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    View all game types →
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-card rounded-lg shadow">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-card-foreground">Recent Activity</h2>
              </div>
              <div className="p-6">
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity._id} className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                            <div className="text-primary text-xs">📝</div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-card-foreground truncate">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4 text-sm">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrganizerDashboardPage