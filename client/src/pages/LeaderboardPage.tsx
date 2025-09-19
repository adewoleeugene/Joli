import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn } from '../utils/cn';
import { LeaderboardEntry } from '../types/game';
import { apiClient } from '../services/apiClient';

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isConnected } = useWebSocket();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');
  const [gameFilter, setGameFilter] = useState<string>('all');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<LeaderboardEntry[]>(`/leaderboard`, {
          params: { time: timeFilter, game: gameFilter },
        });
        setLeaderboard(response.data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        // Fallback to mock data for development when API is unavailable
        setLeaderboard([
          {
            userId: 'user1',
            userName: 'GameMaster',
            score: 2450,
            rank: 1,
            gamesCompleted: 15,
            averageTime: 120,
            lastActivity: new Date().toISOString(),
          },
          {
            userId: 'user2',
            userName: 'QuizWhiz',
            score: 2200,
            rank: 2,
            gamesCompleted: 12,
            averageTime: 95,
            lastActivity: new Date().toISOString(),
          },
          {
            userId: 'user3',
            userName: 'CreativeGenius',
            score: 1980,
            rank: 3,
            gamesCompleted: 18,
            averageTime: 150,
            lastActivity: new Date().toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeFilter, gameFilter]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 2:
        return 'text-muted-foreground bg-muted';
      case 3:
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                🏆 Leaderboard
              </h1>
              <p className="text-muted-foreground mt-1">
                See how you rank against other players
              </p>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Filters */}
        <div className="bg-card rounded-lg p-4 mb-6 shadow-sm border border-border">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Time Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Time Period
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="input-field"
              >
                <option value="daily">Today</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            {/* Game Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Game Type
              </label>
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Games</option>
                <option value="trivia">Trivia</option>
                <option value="scavenger_hunt">Scavenger Hunt</option>
                <option value="song_voting">Song Voting</option>
                <option value="guess_the_song">Guess the Song</option>
                <option value="hangman">Hangman</option>
                <option value="word_scramble">Word Scramble</option>
                <option value="creative_challenge">Creative Challenge</option>
                <option value="truth_or_dare">Truth or Dare</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-card rounded-lg shadow-sm overflow-hidden border border-border">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Rankings Yet
              </h3>
              <p className="text-muted-foreground">
                Play some games to see rankings appear here!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={cn(
                    "p-4 flex items-center space-x-4 hover:bg-muted/50 transition-colors",
                    entry.userId === user?.id && "bg-primary/10 border-l-4 border-primary"
                  )}
                >
                  {/* Rank */}
                  <div className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg",
                    getRankBadgeColor(entry.rank)
                  )}>
                    {getRankIcon(entry.rank)}
                  </div>
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {entry.userName}
                        {entry.userId === user?.id && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                      </h3>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                      <span>Games: {entry.gamesCompleted}</span>
                      <span>Avg: {Math.round(entry.averageTime)}s</span>
                    </div>
                  </div>
                  
                  {/* Score */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-foreground">
                      {entry.score.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User's Current Rank */}
        {user && leaderboard.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-2">
              Your Performance
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  #{leaderboard.find(entry => entry.userId === user.id)?.rank || 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Rank</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-chart-2">
                  {leaderboard.find(entry => entry.userId === user.id)?.score?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-chart-3">
                  {leaderboard.find(entry => entry.userId === user.id)?.gamesCompleted || '0'}
                </div>
                <div className="text-sm text-muted-foreground">Games</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-chart-4">
                  {Math.round(leaderboard.find(entry => entry.userId === user.id)?.averageTime || 0)}s
                </div>
                <div className="text-sm text-muted-foreground">Avg Time</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;