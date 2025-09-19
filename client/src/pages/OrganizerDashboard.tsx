import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
// Firebase auth service no longer needed - using authService through context
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { cn } from '../utils/cn'
import { apiClient } from '../services/apiClient'

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

interface RecentActivity {
  _id: string
  type: 'participant_joined' | 'game_completed' | 'submission_received'
  description: string
  timestamp: Date
}

function OrganizerDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<OrganizerStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const response = await apiClient.get('/organizer/dashboard')
        
        if (response.status !== 200) {
          throw new Error('Failed to fetch dashboard data');
        }
        
        const data = response.data
        
        if (data.success) {
          // Transform the API response to match our component's expected format
          const apiStats = data.data.stats;
          setStats({
            participants: { 
              total: apiStats.participantCount, 
              active: Math.floor(apiStats.participantCount * 0.8), // Mock active participants
              new: Math.floor(apiStats.participantCount * 0.1) // Mock new participants
            },
            games: { 
              total: apiStats.gameCount, 
              active: Math.floor(apiStats.gameCount * 0.3), // Mock active games
              completed: Math.floor(apiStats.gameCount * 0.7) // Mock completed games
            },
            engagement: { 
              totalSubmissions: apiStats.submissionCount, 
              averageParticipation: apiStats.participantCount > 0 ? (apiStats.submissionCount / apiStats.participantCount) * 100 : 0,
              completionRate: apiStats.gameCount > 0 ? (Math.floor(apiStats.gameCount * 0.7) / apiStats.gameCount) * 100 : 0
            }
          });
          
          setRecentActivity(data.data.recentActivity || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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
          <svg className={cn(iconClass, "text-blue-500")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      case 'game_completed':
        return (
          <svg className={cn(iconClass, "text-purple-500")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'submission_received':
        return (
          <svg className={cn(iconClass, "text-orange-500")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        )
      default:
        return (
          <svg className={cn(iconClass, "text-gray-500")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Welcome header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="mt-1 text-gray-600">
          Manage your games and track participant engagement from your organizer dashboard.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="bg-secondary text-white p-4 rounded-lg hover:bg-secondary/90 transition-colors">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 011 1v1z" />
            </svg>
            <span className="font-medium">Add Game</span>
          </div>
        </button>
        
        <button className="bg-accent text-white p-4 rounded-lg hover:bg-accent/90 transition-colors">
          <div className="flex items-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium">View Analytics</span>
          </div>
        </button>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Participants stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Participants
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.participants.total}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Active: {stats.participants.active}</span>
                <span>New: +{stats.participants.new}</span>
              </div>
            </div>
          </div>

          {/* Games stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V9a1 1 0 011-1h1a2 2 0 100-4H4a1 1 0 01-1-1V4a1 1 0 011-1h3a1 1 0 011 1v1z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Games Created
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.games.total}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Active: {stats.games.active}</span>
                <span>Completed: {stats.games.completed}</span>
              </div>
            </div>
          </div>

          {/* Engagement stats */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg. Participation
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.engagement.averageParticipation}%
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Submissions: {stats.engagement.totalSubmissions}</span>
                <span>Completion: {stats.engagement.completionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.map((activity) => (
            <div key={activity._id} className="px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-gray-50 text-center">
          <button className="text-sm font-medium text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60">
            View all activity
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrganizerDashboard