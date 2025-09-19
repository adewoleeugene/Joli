import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit, Save, X, Trash2, Eye, Play, Pause, BarChart3, Users, Settings, Plus, Clock, Trophy, Copy, Key, Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Badge from '../components/ui/Badge';
import SaveButton from '../components/ui/SaveButton';
import useVisualFeedback from '../hooks/useVisualFeedback';
import { updateGameTimeFromQuestions, formatGameTime } from '../utils/gameTimeCalculator';
import { usePlatform, getPlatformClasses } from '../utils/platform';
import { authService } from '../services/authService';
import JoinCodeCache from '../utils/joinCodeCache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

interface Game {
  id: string;
  title: string;
  description: string;
  image?: string;
  type: 'scavenger_hunt' | 'trivia' | 'guess_the_song' | 'word_scramble' | 'hangman' | 'creative_challenge' | 'dj_song_voting' | 'truth_or_dare';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'scheduled';
  organizerId: string;
  settings: {
    timeLimit?: number;
    maxAttempts?: number;
    shuffleQuestions?: boolean;
    showCorrectAnswers?: boolean;
    allowSkipping?: boolean;
    requireApproval?: boolean;
    maxParticipants?: number;
  };
  questions?: Question[];
  challenges?: Challenge[];
  isPublic: boolean;
  joinCode?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  createdAt: string;
  updatedAt: string;
  participants: number;
  submissions: number;
  completionRate: number;
  averageScore: number;
}

interface Question {
  id: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  timeLimit?: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'photo' | 'location' | 'text' | 'video';
  points: number;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
}

interface Participant {
  id: string;
  name: string;
  email: string;
  score: number;
  progress: number;
  completedAt?: string;
  joinedAt: string;
  status: 'active' | 'completed' | 'abandoned';
}

const GameManage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState<Partial<Game>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  
  // Time selection state management
  const [startTimeMode, setStartTimeMode] = useState<'now' | 'specific'>('now');
  const [endTimeMode, setEndTimeMode] = useState<'duration' | 'specific'>('duration');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [duration, setDuration] = useState({ value: 1, unit: 'hours' });
  const [timeSelectionErrors, setTimeSelectionErrors] = useState<{[key: string]: string}>({});
  
  const feedback = useVisualFeedback({
    showToast: true,
    successMessage: 'Game settings saved successfully!',
    errorMessage: 'Failed to save game settings'
  });
  const { isMobile } = usePlatform();

  // Time selection validation and helper functions
  const validateDateTime = (dateTime: string, fieldName: string): string | null => {
    if (!dateTime) return `${fieldName} is required`;
    const date = new Date(dateTime);
    if (isNaN(date.getTime())) return `Invalid ${fieldName.toLowerCase()}`;
    if (date < new Date()) return `${fieldName} cannot be in the past`;
    return null;
  };

  const calculateEndTime = (startTime: Date, duration: { value: number; unit: string }): Date => {
    const endTime = new Date(startTime);
    switch (duration.unit) {
      case 'minutes':
        endTime.setMinutes(endTime.getMinutes() + duration.value);
        break;
      case 'hours':
        endTime.setHours(endTime.getHours() + duration.value);
        break;
      case 'days':
        endTime.setDate(endTime.getDate() + duration.value);
        break;
      case 'weeks':
        endTime.setDate(endTime.getDate() + (duration.value * 7));
        break;
      case 'months':
        endTime.setMonth(endTime.getMonth() + duration.value);
        break;
    }
    return endTime;
  };

  const validateTimeSelection = (): boolean => {
    const errors: {[key: string]: string} = {};

    if (startTimeMode === 'specific') {
      const startError = validateDateTime(startDateTime, 'Start date and time');
      if (startError) errors.startDateTime = startError;
    }

    if (endTimeMode === 'specific') {
      const endError = validateDateTime(endDateTime, 'End date and time');
      if (endError) errors.endDateTime = endError;
      
      if (!errors.startDateTime && !errors.endDateTime && startDateTime && endDateTime) {
        const start = new Date(startDateTime);
        const end = new Date(endDateTime);
        if (end <= start) {
          errors.endDateTime = 'End time must be after start time';
        }
      }
    } else if (endTimeMode === 'duration') {
      if (duration.value <= 0) {
        errors.duration = 'Duration must be greater than 0';
      }
    }

    setTimeSelectionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    if (id) {
      fetchGame();
      fetchParticipants();
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchGame = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/${id}`, {
        headers: {
          'Authorization': `Bearer ${authService.getCurrentUserToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch game');
      }

      const gameData = await response.json();
      
      // Use cached join code if available to maintain persistence during navigation
      const gameWithPersistentJoinCode = JoinCodeCache.syncJoinCode(gameData);
      
      setGame(gameWithPersistentJoinCode);
      setFormData(gameWithPersistentJoinCode);

      // Initialize time selection state based on existing game data
      if (gameWithPersistentJoinCode.scheduledStartTime) {
        setStartTimeMode('specific');
        setStartDateTime(new Date(gameWithPersistentJoinCode.scheduledStartTime).toISOString().slice(0, 16));
      } else {
        setStartTimeMode('now');
      }

      if (gameWithPersistentJoinCode.scheduledEndTime) {
        setEndTimeMode('specific');
        setEndDateTime(new Date(gameWithPersistentJoinCode.scheduledEndTime).toISOString().slice(0, 16));
      } else {
        setEndTimeMode('duration');
      }
    } catch (error) {
      console.error('Error fetching game:', error);
      toast.error('Failed to load game');
      navigate('/organizer');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/${id}/participants`, {
        headers: {
          'Authorization': `Bearer ${authService.getCurrentUserToken()}`,
        },
      });

      if (response.ok) {
        const participantsData = await response.json();
        setParticipants(participantsData);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast.error('Game title is required');
      return;
    }

    // Validate time selection
    if (!validateTimeSelection()) {
      toast.error('Please fix the time selection errors');
      return;
    }

    setSaving(true);
    try {
      // Calculate total time from questions if they exist
      const updatedFormData = updateGameTimeFromQuestions(formData.questions || [], formData.settings);

      // Process time selection data
      let scheduledStartTime: string | undefined;
      let scheduledEndTime: string | undefined;

      if (startTimeMode === 'specific' && startDateTime) {
        scheduledStartTime = new Date(startDateTime).toISOString();
      }

      if (endTimeMode === 'specific' && endDateTime) {
        scheduledEndTime = new Date(endDateTime).toISOString();
      } else if (endTimeMode === 'duration' && startTimeMode === 'specific' && startDateTime) {
        const startTime = new Date(startDateTime);
        const endTime = calculateEndTime(startTime, duration);
        scheduledEndTime = endTime.toISOString();
      } else if (endTimeMode === 'duration' && startTimeMode === 'now') {
        const startTime = new Date();
        const endTime = calculateEndTime(startTime, duration);
        scheduledEndTime = endTime.toISOString();
      }

      // Add time selection data to form data
      updatedFormData.scheduledStartTime = scheduledStartTime;
      updatedFormData.scheduledEndTime = scheduledEndTime;

      const response = await fetch(`${API_BASE_URL}/games/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getCurrentUserToken()}`,
        },
        body: JSON.stringify(updatedFormData),
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      const updatedGame = await response.json();
      setGame(updatedGame);
      setFormData(updatedGame);
      setIsEditing(false);
      feedback.showSuccess();
      toast.success('Game updated successfully');
    } catch (error) {
      console.error('Error updating game:', error);
      feedback.showError(error as Error);
      toast.error('Failed to update game');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(game || {});
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authService.getCurrentUserToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete game');
      }

      // Clean up cached join code when game is deleted
      if (id) {
        JoinCodeCache.removeGameFromCache(id);
      }

      toast.success('Game deleted successfully');
      navigate('/organizer');
    } catch (error) {
      console.error('Error deleting game:', error);
      toast.error('Failed to delete game');
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getCurrentUserToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate game');
      }

      const duplicatedGame = await response.json();
      toast.success('Game duplicated successfully');
      navigate(`/organizer/games/${duplicatedGame.id}`);
    } catch (error) {
      console.error('Error duplicating game:', error);
      toast.error('Failed to duplicate game');
    }
  };

  const handleStatusChange = async (newStatus: Game['status']) => {
    try {
      const response = await fetch(`${API_BASE_URL}/games/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getCurrentUserToken()}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update game status');
      }

      const updatedGame = await response.json();
      setGame(updatedGame);
      setFormData(updatedGame);
      toast.success(`Game ${newStatus === 'active' ? 'started' : newStatus === 'paused' ? 'paused' : 'completed'} successfully`);
    } catch (error) {
      console.error('Error updating game status:', error);
      toast.error('Failed to update game status');
    }
  };

  const copyJoinCode = () => {
    if (game?.joinCode) {
      navigator.clipboard.writeText(game.joinCode);
      toast.success('Join code copied to clipboard');
    }
  };

  const copyJoinLink = () => {
    if (game?.joinCode) {
      const joinLink = `${window.location.origin}/join/${game.joinCode}`;
      navigator.clipboard.writeText(joinLink);
      toast.success('Join link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Game Not Found</h2>
          <p className="text-muted-foreground mb-6">The game you're looking for doesn't exist or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/organizer')}
            className="btn btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: Game['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: Game['type']) => {
    switch (type) {
      case 'trivia': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'scavenger_hunt': return 'bg-green-100 text-green-800 border-green-200';
      case 'guess_the_song': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'word_scramble': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'hangman': return 'bg-red-100 text-red-800 border-red-200';
      case 'creative_challenge': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'dj_song_voting': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'truth_or_dare': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatType = (type: Game['type']) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className={`min-h-screen bg-background ${getPlatformClasses()}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/organizer')}
              className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn btn-outline flex items-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDuplicateConfirm(true)}
                  className="btn btn-outline flex items-center"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-destructive flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="btn btn-outline flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <SaveButton
                  onSave={handleSave}
                  disabled={saving}
                  className="flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </SaveButton>
              </>
            )}
          </div>
        </div>

        {/* Game Info Card */}
        <div className="card mb-6">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="text-2xl font-bold bg-transparent border-none outline-none text-card-foreground"
                    placeholder="Game Title"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-card-foreground">{game.title}</h1>
                )}
                <Badge className={getStatusColor(game.status)}>
                  {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                </Badge>
                <Badge className={getTypeColor(game.type)}>
                  {formatType(game.type)}
                </Badge>
                {game.isPublic && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    Public
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {game.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="btn btn-primary flex items-center"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Game
                  </button>
                )}
                {game.status === 'active' && (
                  <button
                    onClick={() => handleStatusChange('paused')}
                    className="btn btn-secondary flex items-center"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Game
                  </button>
                )}
                {game.status === 'paused' && (
                  <button
                    onClick={() => handleStatusChange('active')}
                    className="btn btn-primary flex items-center"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume Game
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card-content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                      rows={3}
                      placeholder="Game description"
                    />
                  ) : (
                    <p className="text-muted-foreground">{game.description || 'No description provided'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Game Type
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.type || ''}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as Game['type'] })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                      >
                        <option value="trivia">Trivia</option>
                        <option value="scavenger_hunt">Scavenger Hunt</option>
                        <option value="guess_the_song">Guess the Song</option>
                        <option value="word_scramble">Word Scramble</option>
                        <option value="hangman">Hangman</option>
                        <option value="creative_challenge">Creative Challenge</option>
                        <option value="dj_song_voting">DJ Song Voting</option>
                        <option value="truth_or_dare">Truth or Dare</option>
                      </select>
                    ) : (
                      <p className="text-muted-foreground">{formatType(game.type)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Visibility
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.isPublic ? 'public' : 'private'}
                        onChange={(e) => setFormData({ ...formData, isPublic: e.target.value === 'public' })}
                        className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                      >
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                      </select>
                    ) : (
                      <p className="text-muted-foreground">{game.isPublic ? 'Public' : 'Private'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Participants</span>
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-card-foreground">{game.participants}</p>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Submissions</span>
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-card-foreground">{game.submissions}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Completion Rate</span>
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-card-foreground">{game.completionRate}%</p>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Avg Score</span>
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold text-card-foreground">{game.averageScore}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Join Code Card */}
        {game.joinCode && (
          <div className="card mb-6">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-card-foreground flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Join Code
              </h3>
            </div>
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-muted p-3 rounded-lg">
                    <span className="text-2xl font-mono font-bold text-card-foreground">
                      {showJoinCode ? game.joinCode : '••••••'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowJoinCode(!showJoinCode)}
                    className="btn btn-outline flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {showJoinCode ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={copyJoinCode}
                    className="btn btn-outline flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </button>
                  <button
                    onClick={copyJoinLink}
                    className="btn btn-primary flex items-center"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Settings */}
        <div className="card mb-6">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Game Settings
            </h3>
          </div>
          
          <div className="card-content">
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Total Game Time (automatically calculated)
                    </label>
                    <input
                      type="text"
                      value={formData.settings?.timeLimit ? formatGameTime(formData.settings.timeLimit) : 'No questions added'}
                      readOnly
                      className="input bg-muted text-muted-foreground cursor-not-allowed"
                      placeholder="Add questions with time limits to calculate total time"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Time is calculated from individual question time limits
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Maximum Attempts per Question
                    </label>
                    <input
                      type="number"
                      value={formData.settings?.maxAttempts || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, maxAttempts: parseInt(e.target.value) || undefined }
                      })}
                      min="1"
                      max="10"
                      className="input"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Shuffle Questions */}
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background hover:bg-accent/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                        <Settings className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground mb-1">Shuffle Questions</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">Randomize question order for each participant</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings?.shuffleQuestions || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, shuffleQuestions: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Show Correct Answers */}
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background hover:bg-accent/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg">
                        <Eye className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground mb-1">Show Correct Answers</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">Display correct answers after each question</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings?.showCorrectAnswers || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, showCorrectAnswers: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Allow Skipping */}
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background hover:bg-accent/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-lg">
                        <Plus className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground mb-1">Allow Skipping</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">Let participants skip questions they don't know</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings?.allowSkipping || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, allowSkipping: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* Access Control for Public Games */}
                {formData.isPublic && (
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="font-medium text-card-foreground mb-4 flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Access Control
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                  {/* Require Approval */}
                  <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-background hover:bg-accent/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground mb-1">Require Approval</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">Manually approve participants before they can join</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings?.requireApproval || false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, requireApproval: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Participant Limit */}
                  <div className="flex items-start p-4 border border-border rounded-xl bg-background">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg mr-4">
                      <Trophy className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="text-sm font-medium text-foreground mb-1">Participant Limit</div>
                        <div className="text-xs text-muted-foreground leading-relaxed">Set maximum number of participants</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.settings?.maxParticipants !== undefined && formData.settings?.maxParticipants > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  settings: { ...formData.settings, maxParticipants: 10 }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  settings: { ...formData.settings, maxParticipants: undefined }
                                });
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <span className="text-sm text-muted-foreground">Enable limit</span>
                      </div>
                      {formData.settings?.maxParticipants !== undefined && formData.settings?.maxParticipants > 0 && (
                        <div className="flex items-center space-x-3">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Participants</label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={formData.settings?.maxParticipants || 10}
                            onChange={(e) => setFormData({
                              ...formData,
                              settings: { ...formData.settings, maxParticipants: parseInt(e.target.value) || 10 }
                            })}
                            className="w-20 px-2 py-1 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                    </div>
                  </div>
                )}

                {/* Time Selection Section */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h4 className="font-medium text-card-foreground mb-4 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    When do you want your Experience to be live?
                  </h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* START Section */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium text-foreground uppercase tracking-wide">START</h5>
                      
                      {/* Now Option */}
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id="start-now"
                          name="startTime"
                          checked={startTimeMode === 'now'}
                          onChange={() => setStartTimeMode('now')}
                          className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                        />
                        <label htmlFor="start-now" className="text-sm font-medium text-foreground">
                          Now
                        </label>
                      </div>
                      
                      {/* Specific Date/Time Option */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="start-specific"
                            name="startTime"
                            checked={startTimeMode === 'specific'}
                            onChange={() => setStartTimeMode('specific')}
                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                          />
                          <label htmlFor="start-specific" className="text-sm font-medium text-foreground">
                            At a specific date and time
                          </label>
                        </div>
                        
                        {startTimeMode === 'specific' && (
                          <div className="ml-7 space-y-3">
                            <div>
                              <input
                                type="datetime-local"
                                value={startDateTime}
                                onChange={(e) => setStartDateTime(e.target.value)}
                                className={`input ${timeSelectionErrors.startDateTime ? 'border-red-500' : ''}`}
                                placeholder="Select date and time"
                              />
                              {timeSelectionErrors.startDateTime && (
                                <p className="text-xs text-red-500 mt-1">{timeSelectionErrors.startDateTime}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* END Section */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium text-foreground uppercase tracking-wide">END</h5>
                      
                      {/* Duration Option */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="end-duration"
                            name="endTime"
                            checked={endTimeMode === 'duration'}
                            onChange={() => setEndTimeMode('duration')}
                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                          />
                          <label htmlFor="end-duration" className="text-sm font-medium text-foreground">
                            After a specific length of time
                          </label>
                        </div>
                        
                        {endTimeMode === 'duration' && (
                          <div className="ml-7 space-y-3">
                            <div className="flex items-center space-x-3">
                              <input
                                type="number"
                                min="1"
                                value={duration.value}
                                onChange={(e) => setDuration({ ...duration, value: parseInt(e.target.value) || 1 })}
                                className={`w-20 px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground ${timeSelectionErrors.duration ? 'border-red-500' : ''}`}
                              />
                              <select
                                value={duration.unit}
                                onChange={(e) => setDuration({ ...duration, unit: e.target.value })}
                                className="px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                              >
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                                <option value="months">Months</option>
                              </select>
                            </div>
                            {timeSelectionErrors.duration && (
                              <p className="text-xs text-red-500 mt-1">{timeSelectionErrors.duration}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Specific Date/Time Option */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="end-specific"
                            name="endTime"
                            checked={endTimeMode === 'specific'}
                            onChange={() => setEndTimeMode('specific')}
                            className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                          />
                          <label htmlFor="end-specific" className="text-sm font-medium text-foreground">
                            At a specific date and time
                          </label>
                        </div>
                        
                        {endTimeMode === 'specific' && (
                          <div className="ml-7 space-y-3">
                            <div>
                              <input
                                type="datetime-local"
                                value={endDateTime}
                                onChange={(e) => setEndDateTime(e.target.value)}
                                className={`input ${timeSelectionErrors.endDateTime ? 'border-red-500' : ''}`}
                                placeholder="Select date and time"
                              />
                              {timeSelectionErrors.endDateTime && (
                                <p className="text-xs text-red-500 mt-1">{timeSelectionErrors.endDateTime}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview Section */}
                  {(startTimeMode === 'specific' || endTimeMode === 'duration' || endTimeMode === 'specific') && (
                    <div className="mt-6 p-4 bg-accent/50 rounded-lg border border-border">
                      <h6 className="text-sm font-medium text-foreground mb-2">Preview</h6>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Start:</span>{' '}
                          {startTimeMode === 'now' 
                            ? 'Immediately' 
                            : startDateTime 
                              ? new Date(startDateTime).toLocaleString()
                              : 'Not set'
                          }
                        </div>
                        <div>
                          <span className="font-medium">End:</span>{' '}
                          {endTimeMode === 'duration' 
                            ? `After ${duration.value} ${duration.unit}`
                            : endTimeMode === 'specific' && endDateTime
                              ? new Date(endDateTime).toLocaleString()
                              : 'Not set'
                          }
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Limit:</span>
                    <span className="font-medium">{game.settings.timeLimit ? formatGameTime(game.settings.timeLimit) : 'No limit'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Attempts:</span>
                    <span className="font-medium">{game.settings.maxAttempts || 'Unlimited'}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shuffle Questions:</span>
                    <span className="font-medium">{game.settings.shuffleQuestions ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Show Correct Answers:</span>
                    <span className="font-medium">{game.settings.showCorrectAnswers ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allow Skipping:</span>
                    <span className="font-medium">{game.settings.allowSkipping ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Participants Section */}
        {participants.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-card-foreground flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Participants ({participants.length})
                </h3>
                <button
                  onClick={() => setShowParticipants(!showParticipants)}
                  className="btn btn-outline"
                >
                  {showParticipants ? 'Hide' : 'Show'} Participants
                </button>
              </div>
            </div>
            
            {showParticipants && (
              <div className="card-content">
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-card-foreground">{participant.name}</p>
                        <p className="text-sm text-muted-foreground">{participant.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-card-foreground">Score: {participant.score}</p>
                        <p className="text-sm text-muted-foreground">Progress: {participant.progress}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Delete Game</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete this game? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setShowDeleteConfirm(false);
                  }}
                  className="btn btn-destructive"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Confirmation Modal */}
        {showDuplicateConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Duplicate Game</h3>
              <p className="text-muted-foreground mb-6">
                This will create a copy of the game with all its questions and settings.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDuplicateConfirm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDuplicate();
                    setShowDuplicateConfirm(false);
                  }}
                  className="btn btn-primary"
                >
                  Duplicate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameManage;