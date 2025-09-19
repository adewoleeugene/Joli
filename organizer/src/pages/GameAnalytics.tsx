import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, BarChart3, Users, Trophy, Clock, TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GameAnalytics {
  gameId: string;
  gameTitle: string;
  gameType: string;
  status: string;
  totalParticipants: number;
  activeParticipants: number;
  completedParticipants: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageCompletionTime: number;
  totalSubmissions: number;
  completionRate: number;
  engagementRate: number;
  dropoffRate: number;
  participantsByDay: { date: string; count: number }[];
  scoreDistribution: { range: string; count: number }[];
  questionAnalytics?: QuestionAnalytics[];
  timeSpentBySection: { section: string; averageTime: number }[];
  deviceBreakdown: { device: string; count: number; percentage: number }[];
  geographicData: { location: string; count: number }[];
}

interface QuestionAnalytics {
  questionId: string;
  question: string;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyRate: number;
  averageTimeSpent: number;
  skipRate: number;
  mostSelectedAnswer?: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  score: number;
  completionTime: number;
  progress: number;
  joinedAt: string;
  completedAt?: string;
  device: string;
  location?: string;
}

const GameAnalytics: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<GameAnalytics | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d'); // 1d, 7d, 30d, all

  useEffect(() => {
    if (gameId) {
      fetchAnalytics();
    }
  }, [gameId, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/games/${gameId}/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
    toast.success('Analytics refreshed!');
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/games/${gameId}/analytics/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `game-${gameId}-analytics.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Analytics exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-foreground mb-4">Analytics Not Available</h1>
        <button 
          onClick={() => navigate('/organizer/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/organizer/dashboard')}
            className="flex items-center px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{analytics.gameTitle} Analytics</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(analytics.status)}`}>
                {analytics.status.charAt(0).toUpperCase() + analytics.status.slice(1)}
              </span>
              <span className="text-sm text-muted-foreground capitalize">
                {analytics.gameType.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Participants</p>
              <p className="text-3xl font-bold text-blue-600">{analytics.totalParticipants}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.activeParticipants} active, {analytics.completedParticipants} completed
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className="text-3xl font-bold text-green-600">{analytics.averageScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                High: {analytics.highestScore}, Low: {analytics.lowestScore}
              </p>
            </div>
            <Trophy className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-3xl font-bold text-purple-600">{formatPercentage(analytics.completionRate)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.completedParticipants} of {analytics.totalParticipants} completed
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
              <p className="text-3xl font-bold text-orange-600">{formatTime(analytics.averageCompletionTime)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.totalSubmissions} total submissions
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Engagement Rate</h3>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{formatPercentage(analytics.engagementRate)}</div>
            <p className="text-sm text-muted-foreground">Participants actively engaging</p>
          </div>
        </div>
        
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Drop-off Rate</h3>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600 mb-2">{formatPercentage(analytics.dropoffRate)}</div>
            <p className="text-sm text-muted-foreground">Participants who left early</p>
          </div>
        </div>
        
        <div className="bg-card rounded-lg shadow p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Total Submissions</h3>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">{analytics.totalSubmissions}</div>
            <p className="text-sm text-muted-foreground">Answers submitted</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full">
        <div className="border-b border-border">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'participants'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Participants ({participants.length})
            </button>
            {analytics.questionAnalytics && (
              <button
                onClick={() => setActiveTab('questions')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'questions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                Question Analysis
              </button>
            )}
            <button
              onClick={() => setActiveTab('insights')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'insights'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Insights
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="mt-6 space-y-6">
            {/* Participation Over Time */}
            <div className="bg-card rounded-lg shadow p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Participation Over Time</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {analytics.participantsByDay.map((day, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div 
                      className="bg-blue-500 rounded-t w-full transition-all hover:bg-blue-600"
                      style={{ height: `${(day.count / Math.max(...analytics.participantsByDay.map(d => d.count))) * 200}px` }}
                    ></div>
                    <span className="text-xs text-muted-foreground mt-2 transform -rotate-45">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Distribution */}
            <div className="bg-card rounded-lg shadow p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Score Distribution</h3>
              <div className="space-y-3">
                {analytics.scoreDistribution.map((range, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-20 text-sm text-muted-foreground">{range.range}</div>
                    <div className="flex-1 mx-4">
                      <div className="bg-muted rounded-full h-4">
                        <div 
                          className="bg-blue-500 h-4 rounded-full transition-all"
                          style={{ width: `${(range.count / Math.max(...analytics.scoreDistribution.map(r => r.count))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-12 text-sm text-foreground text-right">{range.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="mt-6">
            <div className="bg-card rounded-lg shadow overflow-hidden border border-border">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="text-lg font-medium text-foreground">Participant Details</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Participant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Completion Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Device</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {participants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-foreground">{participant.name}</div>
                            <div className="text-sm text-muted-foreground">{participant.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-blue-600">{participant.score}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-muted rounded-full h-2 mr-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${participant.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground">{participant.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {participant.completionTime ? formatTime(participant.completionTime) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {participant.device}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(participant.joinedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && analytics.questionAnalytics && (
          <div className="mt-6 space-y-4">
            {analytics.questionAnalytics.map((question, index) => (
              <div key={question.questionId} className="bg-card rounded-lg shadow p-6 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-medium text-foreground">Question {index + 1}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    question.accuracyRate >= 80 ? 'bg-green-100 text-green-800' :
                    question.accuracyRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {formatPercentage(question.accuracyRate)} accuracy
                  </span>
                </div>
                
                <p className="text-foreground mb-4">{question.question}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{question.totalAttempts}</div>
                    <div className="text-sm text-muted-foreground">Total Attempts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{question.correctAnswers}</div>
                    <div className="text-sm text-muted-foreground">Correct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{formatTime(question.averageTimeSpent)}</div>
                    <div className="text-sm text-muted-foreground">Avg Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{formatPercentage(question.skipRate)}</div>
                    <div className="text-sm text-muted-foreground">Skip Rate</div>
                  </div>
                </div>
                
                {question.mostSelectedAnswer && (
                  <div className="mt-4 p-3 bg-muted/50 rounded">
                    <span className="text-sm text-muted-foreground">Most selected answer: </span>
                    <span className="font-medium">{question.mostSelectedAnswer}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="mt-6 space-y-6">
            {/* Device Breakdown */}
            <div className="bg-card rounded-lg shadow p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Device Breakdown</h3>
              <div className="space-y-3">
                {analytics.deviceBreakdown.map((device, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-foreground capitalize">{device.device}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${device.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-muted-foreground w-12 text-right">{device.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Spent by Section */}
            <div className="bg-card rounded-lg shadow p-6 border border-border">
              <h3 className="text-lg font-medium text-foreground mb-4">Time Spent by Section</h3>
              <div className="space-y-3">
                {analytics.timeSpentBySection.map((section, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{section.section}</span>
                    <span className="text-sm font-medium text-foreground">{formatTime(section.averageTime)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Geographic Data */}
            {analytics.geographicData.length > 0 && (
              <div className="bg-card rounded-lg shadow p-6 border border-border">
                <h3 className="text-lg font-medium text-foreground mb-4">Geographic Distribution</h3>
                <div className="space-y-3">
                  {analytics.geographicData.map((location, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{location.location}</span>
                      <span className="text-sm font-medium text-foreground">{location.count} participants</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameAnalytics;