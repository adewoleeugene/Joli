import React, { useState, useEffect } from 'react';
import { Search, Plus, Download, BookOpen, Lightbulb, ArrowDown, ArrowLeft, Settings, Edit3, Globe, Lock, Calendar, BarChart3, Users, Trophy, Activity, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AddQuestionModal, { QuestionFormData } from '../components/modals/AddQuestionModal';
import EditQuestionModal from '../components/modals/EditQuestionModal';
import Badge from '../components/ui/Badge';
import { updateGameTimeFromQuestions, formatGameTime } from '../utils/gameTimeCalculator';
import { usePlatform, getPlatformClasses } from '../utils/platform';
import JoinCodeCache from '../utils/joinCodeCache';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

interface Mission {
  id: string;
  title: string;
  description: string;
  image: string;
  status: 'active' | 'draft' | 'completed';
}

interface Game {
  id: string;
  title: string;
  description?: string;
  image?: string;
  status: string;
  participants: number;
  isPublic?: boolean;
  joinCode?: string;
  type: 'scavenger_hunt' | 'trivia' | 'guess_the_song' | 'word_scramble' | 'hangman' | 'creative_challenge' | 'dj_song_voting' | 'truth_or_dare';
  settings: {
    timeLimit?: number;
    maxAttempts?: number;
    shuffleQuestions?: boolean;
    showCorrectAnswers?: boolean;
    allowSkipping?: boolean;
    requireApproval?: boolean;
    maxParticipants?: number;
  };
}

interface Question {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  points?: number;
  timeLimit?: number;
  createdAt?: string;
}

function MissionsDashboard() {
  const { gameId: paramGameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const gameId = paramGameId || searchParams.get('gameId');
  
  const [missions, setMissions] = useState<Mission[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'mission' | 'publish' | 'review'>('details');
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState('');
  
  // Add original values state for change detection
  const [originalValues, setOriginalValues] = useState({
    title: '',
    description: '',
    image: ''
  });
  
  // Add state to track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;
  
  // Search state
  const [searchResults, setSearchResults] = useState<Question[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState<string>('');

  // Publishing state
  const [publishSettings, setPublishSettings] = useState({
    visibility: 'public',
    requireApproval: false,
    participantLimit: '',
    startDate: '',
    endDate: '',
    joinCode: ''
  });
  const [publishErrors, setPublishErrors] = useState<{ [key: string]: string }>({});
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Join code state
  const [isGeneratingJoinCode, setIsGeneratingJoinCode] = useState(false);
  const [isRemovingJoinCode, setIsRemovingJoinCode] = useState(false);

  // Game type display information
  const getGameTypeInfo = (type: string) => {
    const gameTypes = {
      'scavenger_hunt': { title: 'Scavenger Hunt', icon: '🔍', color: 'bg-blue-500' },
      'trivia': { title: 'Trivia Challenge', icon: '🧠', color: 'bg-purple-500' },
      'guess_the_song': { title: 'Guess the Song', icon: '🎵', color: 'bg-green-500' },
      'word_scramble': { title: 'Word Scramble', icon: '🔤', color: 'bg-yellow-500' },
      'hangman': { title: 'Hangman', icon: '🎯', color: 'bg-red-500' },
      'creative_challenge': { title: 'Creative Challenge', icon: '🎨', color: 'bg-pink-500' },
      'dj_song_voting': { title: 'DJ Song Voting', icon: '🎧', color: 'bg-indigo-500' },
      'truth_or_dare': { title: 'Truth or Dare', icon: '🎭', color: 'bg-orange-500' }
    };
    return gameTypes[type as keyof typeof gameTypes] || { title: 'Game', icon: '🎮', color: 'bg-gray-500' };
  };

  // Publishing validation functions
  const validateSchedule = () => {
    const errors: { [key: string]: string } = {};
    
    if (publishSettings.startDate && publishSettings.endDate) {
      const startDate = new Date(publishSettings.startDate);
      const endDate = new Date(publishSettings.endDate);
      const now = new Date();
      
      if (startDate < now) {
        errors.startDate = 'Start date cannot be in the past';
      }
      
      if (endDate <= startDate) {
        errors.endDate = 'End date must be after start date';
      }
      
      // Check if the duration is reasonable (at least 5 minutes)
      const duration = endDate.getTime() - startDate.getTime();
      const minDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
      if (duration < minDuration) {
        errors.endDate = 'Game duration must be at least 5 minutes';
      }
    }
    
    if (publishSettings.participantLimit) {
      const limit = parseInt(publishSettings.participantLimit);
      if (isNaN(limit) || limit < 1) {
        errors.participantLimit = 'Participant limit must be a positive number';
      } else if (limit > 10000) {
        errors.participantLimit = 'Participant limit cannot exceed 10,000';
      }
    }
    
    return errors;
  };

  const handlePublishSettingsChange = async (field: string, value: string | boolean) => {
    setPublishSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear specific field error when user starts typing
    if (publishErrors[field]) {
      setPublishErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Note: Automatic join code generation removed to prevent regeneration during navigation
    // Users can manually generate join codes when needed
  };

  const validatePublishSettings = () => {
    const scheduleErrors = validateSchedule();
    const allErrors = { ...scheduleErrors };
    
    setPublishErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  // Join code management functions
  const generateJoinCode = async () => {
    if (!gameId) return;
    
    try {
      setIsGeneratingJoinCode(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/join-code/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate join code');
      }

      const data = await response.json();
      const newJoinCode = data.data.joinCode;
      
      // Cache the generated join code with game status
      JoinCodeCache.setCachedJoinCode(gameId, newJoinCode, game?.status as any || 'draft');
      
      setGame(prev => prev ? { ...prev, joinCode: newJoinCode } : null);
      setPublishSettings(prev => ({ ...prev, joinCode: newJoinCode }));
      toast.success('Join code generated successfully!');
    } catch (error) {
      console.error('Error generating join code:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate join code');
    } finally {
      setIsGeneratingJoinCode(false);
    }
  };

  const removeJoinCode = async () => {
    if (!gameId) return;
    
    try {
      setIsRemovingJoinCode(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/join-code`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove join code');
      }

      // Clear the cached join code
      JoinCodeCache.removeGameFromCache(gameId);
      
      setGame(prev => prev ? { ...prev, joinCode: undefined } : null);
      setPublishSettings(prev => ({ ...prev, joinCode: '' }));
      toast.success('Join code removed successfully!');
    } catch (error) {
      console.error('Error removing join code:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove join code');
    } finally {
      setIsRemovingJoinCode(false);
    }
  };

  const copyJoinCode = async () => {
    if (!game?.joinCode) return;
    
    try {
      await navigator.clipboard.writeText(game.joinCode);
      toast.success('Join code copied to clipboard!');
    } catch (error) {
      console.error('Error copying join code:', error);
      toast.error('Failed to copy join code');
    }
  };

  // Fetch questions for the current game
  const fetchQuestions = async () => {
    if (!gameId) return;
    
    try {
      setQuestionsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedQuestions = data.data?.questions || [];
        setQuestions(fetchedQuestions);
      } else {
        console.error('Failed to fetch questions');
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Question deleted successfully!');
        // Remove the question from the local state and recalculate time
        const updatedQuestions = questions.filter(q => q.id !== questionId);
        setQuestions(updatedQuestions);
        
        // Automatically recalculate game time from remaining questions
        if (game) {
          const updatedSettings = updateGameTimeFromQuestions(updatedQuestions, game.settings);
          if (updatedSettings.timeLimit !== game.settings.timeLimit) {
            await handleSettingsUpdate(updatedSettings);
          }
        }
      } else {
        const errorData = await response.json();
        toast.error(`Failed to delete question: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question. Please try again.');
    }
  };

  useEffect(() => {
    if (gameId) {
      fetchGameData(gameId);
      fetchQuestions();
    }
  }, [gameId]);

  // Automatically calculate and update game time when both game and questions are available
  useEffect(() => {
    const updateGameTimeFromQuestionsData = async () => {
      if (game && questions.length > 0) {
        const updatedSettings = updateGameTimeFromQuestions(questions, game.settings);
        if (updatedSettings.timeLimit !== game.settings.timeLimit) {
          await handleSettingsUpdate(updatedSettings);
        }
      }
    };

    updateGameTimeFromQuestionsData();
  }, [game, questions]);

  // Reset pagination when questions change
  useEffect(() => {
    setCurrentPage(1);
  }, [questions]);

  // Helper function to highlight search terms
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  // Search utility functions
  const searchQuestions = (query: string, questionsToSearch: Question[]): Question[] => {
    if (!query.trim()) {
      return questionsToSearch;
    }

    const searchTerm = query.toLowerCase().trim();
    return questionsToSearch.filter(question => {
      const questionText = question.question.toLowerCase();
      const questionType = question.type.toLowerCase();
      const correctAnswer = question.correctAnswer.toLowerCase();
      const options = question.options?.join(' ').toLowerCase() || '';
      
      return questionText.includes(searchTerm) ||
             questionType.includes(searchTerm) ||
             correctAnswer.includes(searchTerm) ||
             options.includes(searchTerm);
    });
  };

  const generateSearchSuggestions = (query: string, questionsToSearch: Question[]): string[] => {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const suggestions = new Set<string>();
    const searchTerm = query.toLowerCase();

    questionsToSearch.forEach(question => {
      // Add question words that start with search term
      const words = question.question.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.startsWith(searchTerm) && word.length > searchTerm.length) {
          suggestions.add(word);
        }
      });

      // Add question types as suggestions
      if (question.type.toLowerCase().includes(searchTerm)) {
        suggestions.add(question.type.replace('_', ' '));
      }
    });

    return Array.from(suggestions).slice(0, 5);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setSearchError('');
    
    if (!value.trim()) {
      setSearchResults([]);
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Debounced search
    const timeoutId = setTimeout(() => {
      try {
        const results = searchQuestions(value, questions);
        const suggestions = generateSearchSuggestions(value, questions);
        
        setSearchResults(results);
        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
        
        if (results.length === 0 && value.trim()) {
          setSearchError(`No questions found for "${value}". Try different keywords or check your spelling.`);
        }
      } catch (error) {
        setSearchError('An error occurred while searching. Please try again.');
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      setSearchError('Please enter a search term to find questions.');
      return;
    }

    setShowSuggestions(false);
    setIsSearching(true);
    
    try {
      const results = searchQuestions(searchTerm, questions);
      setSearchResults(results);
      setCurrentPage(1); // Reset pagination for search results
      
      if (results.length === 0) {
        setSearchError(`No questions found for "${searchTerm}". Try different keywords or check your spelling.`);
      }
    } catch (error) {
      setSearchError('An error occurred while searching. Please try again.');
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setSearchError('');
    setIsSearching(false);
    setCurrentPage(1);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    handleSearchChange(suggestion);
  };

  // Keyboard navigation for suggestions
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Enter' && !showSuggestions) {
      handleSearchSubmit(e as any);
    }
  };



  // Helper function to automatically generate join code for private games
  const autoGenerateJoinCodeIfNeeded = async (gameData: any) => {
    // First, sync with cache to get any existing persistent join code
    let syncedGameData = JoinCodeCache.syncJoinCode(gameData);
    
    // Check if game is private and still doesn't have a join code after cache sync
    if (!syncedGameData.isPublic && !syncedGameData.joinCode) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/games/${syncedGameData.id}/join-code/generate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const newJoinCode = data.data.joinCode;
          
          // Cache the generated join code for persistence
          JoinCodeCache.setCachedJoinCode(syncedGameData.id, newJoinCode, syncedGameData.status);
          
          // Return updated game data with join code
          return { ...syncedGameData, joinCode: newJoinCode };
        }
      } catch (error) {
        console.error('Error auto-generating join code:', error);
      }
    }
    return syncedGameData;
  };

  const fetchGameData = async (id: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/games/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        let gameData = data.data.game;
        
        // Auto-generate join code for private games if needed (includes cache sync)
        const gameWithPersistentJoinCode = await autoGenerateJoinCodeIfNeeded(gameData);
        
        setGame({
          id: gameWithPersistentJoinCode.id,
          title: gameWithPersistentJoinCode.title,
          description: gameWithPersistentJoinCode.description,
          status: gameWithPersistentJoinCode.status,
          participants: gameWithPersistentJoinCode.participants || 0,
          isPublic: gameWithPersistentJoinCode.isPublic,
          joinCode: gameWithPersistentJoinCode.joinCode,
          type: gameWithPersistentJoinCode.type,
          settings: gameData.settings || {
            timeLimit: 300,
            maxAttempts: 3,
            shuffleQuestions: false,
            showCorrectAnswers: true,
            allowSkipping: false,
            pointsPerCorrect: 10
          }
        });

        // Initialize publish settings with current game data
        setPublishSettings({
          visibility: gameData.isPublic ? 'public' : 'private',
          requireApproval: false,
          participantLimit: '',
          startDate: '',
          endDate: '',
          joinCode: gameWithPersistentJoinCode.joinCode || ''
        });
        
        // Initialize edit states
        const title = gameData.title || '';
        const description = gameData.description || '';
        const image = gameData.image || '';
        
        setEditTitle(title);
        setEditDescription(description);
        setEditImage(image);
        
        // Set original values for change detection
        setOriginalValues({
          title,
          description,
          image
        });
        
        // Reset unsaved changes flag
        setHasUnsavedChanges(false);
      } else {
        console.error('Failed to fetch game data');
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (questionData: QuestionFormData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/questions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      });

      if (response.ok) {
        toast.success('Question added successfully!');
        // Refresh the questions list to show the new question and recalculate time
        await fetchQuestions();
        // Close the modal
        setShowAddQuestionModal(false);
      } else {
        toast.error('Failed to add question. Please try again.');
      }
    } catch (error) {
      console.error('Error adding question:', error);
      toast.error('An error occurred while adding the question.');
    }
  };

  const handleEditQuestion = async (questionData: QuestionFormData) => {
    if (!editingQuestion) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/games/${gameId}/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      });

      if (response.ok) {
        toast.success('Question updated successfully!');
        // Refresh the questions list to show the updated question
        await fetchQuestions();
        // Close the modal and reset editing state
        setShowEditQuestionModal(false);
        setEditingQuestion(null);
      } else {
        toast.error('Failed to update question. Please try again.');
      }
    } catch (error) {
      console.error('Error updating question:', error);
      toast.error('An error occurred while updating the question.');
    }
  };

  const openEditModal = (question: Question) => {
    setEditingQuestion(question);
    setShowEditQuestionModal(true);
  };

  const closeEditModal = () => {
    setShowEditQuestionModal(false);
    setEditingQuestion(null);
  };

  const handleSettingsUpdate = async (newSettings: any) => {
    if (!game) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings: newSettings })
      });

      if (response.ok) {
        setGame({ ...game, settings: newSettings });
        console.log('Settings updated successfully');
      } else {
        console.error('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };



  // Validation function
  const validateGameDetails = () => {
    const errors: { [key: string]: string } = {};
    
    // Title validation
    if (!editTitle.trim()) {
      errors.title = 'Experience name is required';
    } else if (editTitle.trim().length < 3) {
      errors.title = 'Experience name must be at least 3 characters';
    } else if (editTitle.trim().length > 60) {
      errors.title = 'Experience name must be 60 characters or less';
    }
    
    // Description validation
    if (!editDescription.trim()) {
      errors.description = 'Description is required';
    } else if (editDescription.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    } else if (editDescription.trim().length > 200) {
      errors.description = 'Description must be 200 characters or less';
    }
    
    // Image validation (optional but if provided, should be valid)
    if (editImage && editImage.trim()) {
      const isDataUrl = editImage.startsWith('data:image/');
      const isValidUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(editImage);
      
      if (!isDataUrl && !isValidUrl) {
        errors.image = 'Please provide a valid image URL or upload an image file';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDetailsUpdate = async () => {
    if (!game) return;
    
    // Clear previous messages
    setSaveMessage({ type: null, text: '' });
    
    // Validate input
    if (!validateGameDetails()) {
      setSaveMessage({ 
        type: 'error', 
        text: 'Please fix the validation errors before saving' 
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      const response = await fetch(`${API_BASE_URL}/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          image: editImage.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedGame = data.data.game;
        
        // Update local state
        setGame({
          ...game,
          title: updatedGame.title,
          description: updatedGame.description,
          image: updatedGame.image
        });
        
        // Update original values to reflect the saved state
        setOriginalValues({
          title: editTitle.trim(),
          description: editDescription.trim(),
          image: editImage.trim()
        });
        
        // Reset unsaved changes flag
        setHasUnsavedChanges(false);
        
        setIsEditingDetails(false);
        setSaveMessage({ 
          type: 'success', 
          text: 'Experience details saved successfully!' 
        });
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSaveMessage({ type: null, text: '' });
        }, 3000);
        
      } else {
        // Handle different HTTP error codes
        let errorMessage = 'Failed to save changes';
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to edit this experience.';
        } else if (response.status === 404) {
          errorMessage = 'Experience not found.';
        } else if (response.status === 422) {
          const errorData = await response.json().catch(() => null);
          errorMessage = errorData?.message || 'Invalid data provided.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        setSaveMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      console.error('Error updating details:', error);
      
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setSaveMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

   const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEditImage(result);
        // Clear validation error when user uploads a new image
        if (validationErrors.image) {
          setValidationErrors(prev => ({ ...prev, image: '' }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Detect changes in form fields
  useEffect(() => {
    const hasChanges = 
      editTitle !== originalValues.title ||
      editDescription !== originalValues.description ||
      editImage !== originalValues.image;
    
    setHasUnsavedChanges(hasChanges);
  }, [editTitle, editDescription, editImage, originalValues]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {game && (
            <div className="flex items-center gap-4 mb-4">
              <Link
                to="/organizer/dashboard"
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Games
              </Link>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {game ? game.title : 'Missions'}
              </h1>
              {game && game.status === 'draft' && (
                <Badge variant="draft">
                  Draft
                </Badge>
              )}
              {game && (
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium text-white ${getGameTypeInfo(game.type).color}`}>
                  <span>{getGameTypeInfo(game.type).icon}</span>
                  {getGameTypeInfo(game.type).title}
                </span>
              )}
            </div>
            {game && ['trivia', 'guess_the_song', 'hangman', 'word_scramble'].includes(game.type) && activeTab === 'mission' && (
              <button
                onClick={() => setShowAddQuestionModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </button>
            )}
          </div>
          {game && (
            <p className="text-muted-foreground mb-6">
              Manage your game settings, content, and performance
            </p>
          )}
          
          {/* Pill-style Navigation */}
          <div className="mb-8">
            <div className="bg-muted p-1 rounded-lg inline-flex space-x-1">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'details'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                Details
              </button>
              <button
                onClick={() => setActiveTab('mission')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'mission'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Mission
              </button>
              <button
                onClick={() => setActiveTab('publish')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'publish'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Globe className="w-4 h-4" />
                Publish
              </button>
              <button
                onClick={() => setActiveTab('review')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'review'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Review
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="bg-card rounded-lg border border-border p-6">
                {/* Image Section */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-4 uppercase tracking-wide">IMAGE</h3>
                  <div className="flex items-start gap-4">
                    <div className="w-32 h-20 bg-muted rounded-lg border border-border overflow-hidden">
                      {(editImage || game?.image) ? (
                        <img 
                          src={editImage || game?.image || ''} 
                          alt="Experience preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="inline-flex items-center px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/10 transition-colors cursor-pointer">
                        <Plus className="w-4 h-4 mr-2" />
                        {(editImage || game?.image) ? 'Change image' : 'Add an image'}
                      </label>
                      <p className="text-sm text-muted-foreground mt-2">
                        Add an image to set your Experience apart and help participants find it! We recommend JPG or PNG
                      </p>
                      {validationErrors.image && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.image}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Experience Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wide">EXPERIENCE NAME</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => {
                        setEditTitle(e.target.value);
                        // Clear validation error when user starts typing
                        if (validationErrors.title) {
                          setValidationErrors(prev => ({ ...prev, title: '' }));
                        }
                      }}
                      className={`w-full px-3 py-3 border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                        validationErrors.title ? 'border-red-500' : 'border-border'
                      }`}
                      placeholder="Enter experience name"
                    />
                  </div>
                  {validationErrors.title && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2 uppercase tracking-wide">DESCRIPTION</label>
                  <div className="relative">
                    <textarea
                      value={editDescription}
                      onChange={(e) => {
                        setEditDescription(e.target.value);
                        // Clear validation error when user starts typing
                        if (validationErrors.description) {
                          setValidationErrors(prev => ({ ...prev, description: '' }));
                        }
                      }}
                      rows={4}
                      className={`w-full px-3 py-3 border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none ${
                        validationErrors.description ? 'border-red-500' : 'border-border'
                      }`}
                      placeholder="Describe your experience"
                    />
                  </div>
                  {validationErrors.description && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.description}</p>
                  )}
                </div>







                {/* Save Feedback Message */}
                {saveMessage.type && (
                  <div className={`mb-4 p-3 rounded-md ${
                    saveMessage.type === 'success' 
                      ? 'bg-green-50 border border-green-200 text-green-800' 
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    <p className="text-sm font-medium">{saveMessage.text}</p>
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-start">
                  <button 
                    onClick={handleDetailsUpdate}
                    disabled={isSaving || !hasUnsavedChanges}
                    className={`px-6 py-3 rounded-md font-medium transition-colors flex items-center gap-2 ${
                      isSaving || !hasUnsavedChanges
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Mission Tab */}
          {activeTab === 'mission' && (
            <div className="space-y-6">
              {/* Enhanced Search Bar */}
              <div className="relative">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search questions by content, type, or answer..."
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      className="w-full pl-10 pr-24 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      aria-label="Search questions"
                      aria-describedby={searchError ? "search-error" : undefined}
                      aria-expanded={showSuggestions}
                      aria-autocomplete="list"
                      role="combobox"
                    />
                    
                    {/* Search Actions */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                      {isSearching && (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Clear search"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!searchTerm.trim() || isSearching}
                        className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Search"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Search Suggestions */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50">
                      <div className="p-2">
                        <div className="text-xs text-muted-foreground mb-2">Suggestions</div>
                        {searchSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                            role="option"
                            aria-selected={false}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>

                {/* Search Error */}
                {searchError && (
                  <div id="search-error" className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      {searchError}
                    </div>
                  </div>
                )}

                {/* Search Results Summary */}
                {searchTerm && !searchError && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {searchResults.length > 0 ? (
                      `Found ${searchResults.length} question${searchResults.length !== 1 ? 's' : ''} matching "${searchTerm}"`
                    ) : !isSearching ? (
                      `No results found for "${searchTerm}"`
                    ) : (
                      'Searching...'
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2">
                  {questionsLoading ? (
                    <div className="bg-card rounded-lg border border-border p-12 text-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading questions...</p>
                    </div>
                  ) : (searchTerm ? searchResults : questions).length > 0 ? (
                    <div className="bg-card rounded-lg border border-border">
                      <div className="p-6 border-b border-border">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold text-foreground">
                            {searchTerm ? 'Search Results' : 'Questions'}
                          </h2>
                          <span className="text-sm text-muted-foreground">
                            {(searchTerm ? searchResults : questions).length} question{(searchTerm ? searchResults : questions).length !== 1 ? 's' : ''}
                            {searchTerm && ` for "${searchTerm}"`}
                          </span>
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {(() => {
                          const questionsToShow = searchTerm ? searchResults : questions;
                          const startIndex = (currentPage - 1) * questionsPerPage;
                          const endIndex = startIndex + questionsPerPage;
                          const currentQuestions = questionsToShow.slice(startIndex, endIndex);
                          
                          return currentQuestions.map((question, index) => (
                          <div key={question.id} className="p-6 hover:bg-muted/50 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">{startIndex + index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-medium text-foreground truncate">
                                    {searchTerm ? highlightSearchTerm(question.question, searchTerm) : question.question}
                                  </h3>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    question.type === 'multiple_choice' ? 'bg-blue-100 text-blue-800' :
                                    question.type === 'true_false' ? 'bg-green-100 text-green-800' :
                                    'bg-purple-100 text-purple-800'
                                  }`}>
                                    {question.type === 'multiple_choice' ? 'Multiple Choice' :
                                     question.type === 'true_false' ? 'True/False' : 'Short Answer'}
                                  </span>
                                </div>
                                {question.options && question.options.length > 0 && (
                                  <div className="space-y-1">
                                    {question.options.map((option, optionIndex) => (
                                      <div key={optionIndex} className={`text-sm px-3 py-1 rounded ${
                                        option === question.correctAnswer 
                                          ? 'bg-green-100 text-green-800 font-medium' 
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {String.fromCharCode(65 + optionIndex)}. {searchTerm ? highlightSearchTerm(option, searchTerm) : option}
                                        {option === question.correctAnswer && ' ✓'}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {question.type === 'short_answer' && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Correct answer: </span>
                                    <span className="font-medium text-green-600">
                                      {searchTerm ? highlightSearchTerm(question.correctAnswer, searchTerm) : question.correctAnswer}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                  {question.points && <span>Points: {question.points}</span>}
                                  {question.timeLimit && <span>Time: {question.timeLimit}s</span>}
                                </div>
                              </div>
                              <div className="flex-shrink-0 flex gap-1">
                                <button
                                  onClick={() => openEditModal(question)}
                                  className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit question"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteQuestion(question.id)}
                                  className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete question"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          ));
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-card rounded-lg border border-border p-12 text-center">
                      <div className="w-48 h-48 mx-auto mb-6 bg-muted rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-4 bg-muted-foreground/20 rounded-lg flex items-center justify-center">
                            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="space-y-2">
                            <div className="h-3 bg-muted-foreground/20 rounded w-24 mx-auto"></div>
                            <div className="h-3 bg-muted-foreground/20 rounded w-32 mx-auto"></div>
                            <div className="h-3 bg-muted-foreground/20 rounded w-20 mx-auto"></div>
                          </div>
                        </div>
                      </div>
                      
                      <h2 className="text-xl font-semibold text-foreground mb-2">
                        Ready to create your first question?
                      </h2>
                      <p className="text-muted-foreground mb-8">
                        Start building your game by adding questions!
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Sidebar */}
                 <div className="space-y-6">
                   {/* Points Overview */}
                   <div className="bg-card rounded-lg border border-border p-6">
                     <h3 className="font-semibold text-card-foreground mb-4">Points overview</h3>
                     
                     <div className="space-y-4">
                       {/* Header */}
                       <div className="flex justify-between items-center border-b border-border pb-2">
                         <span className="text-sm font-medium text-card-foreground">QUESTION</span>
                         <span className="text-sm font-medium text-card-foreground">POINTS</span>
                       </div>
                       
                       {/* Total Points - Always visible */}
                       <div className="flex justify-between items-center bg-muted/50 rounded-lg p-3">
                         <span className="text-sm font-semibold text-card-foreground">TOTAL POINTS</span>
                         <span className="text-sm font-semibold text-card-foreground">
                           {questions.reduce((total, question) => total + (question.points || 10), 0)} PTS
                         </span>
                       </div>
                       
                       {/* Individual Questions with Pagination */}
                       {(searchTerm ? searchResults : questions).length > 0 ? (
                         <>
                           {/* Paginated Questions */}
                           <div className="space-y-2">
                             {(() => {
                               const questionsToShow = searchTerm ? searchResults : questions;
                               const totalPages = Math.ceil(questionsToShow.length / questionsPerPage);
                               const startIndex = (currentPage - 1) * questionsPerPage;
                               const endIndex = startIndex + questionsPerPage;
                               const currentQuestions = questionsToShow.slice(startIndex, endIndex);
                               
                               return currentQuestions.map((question, index) => (
                                 <div key={question.id} className="flex justify-between items-center py-2 px-3 hover:bg-muted/30 rounded-md transition-colors">
                                   <span className="text-sm text-muted-foreground flex-1 mr-4 truncate" title={question.question}>
                                     {startIndex + index + 1}. {question.question}
                                   </span>
                                   <span className="text-sm font-medium text-card-foreground whitespace-nowrap">
                                     {question.points || 10} pts
                                   </span>
                                 </div>
                               ));
                             })()}
                           </div>
                           
                           {/* Pagination Controls */}
                           {(() => {
                             const questionsToShow = searchTerm ? searchResults : questions;
                             const totalPages = Math.ceil(questionsToShow.length / questionsPerPage);
                             
                             if (totalPages <= 1) return null;
                             
                             const getVisiblePages = () => {
                               const delta = 2;
                               const range = [];
                               const rangeWithDots = [];
                               
                               for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
                                 range.push(i);
                               }
                               
                               if (currentPage - delta > 2) {
                                 rangeWithDots.push(1, '...');
                               } else {
                                 rangeWithDots.push(1);
                               }
                               
                               rangeWithDots.push(...range);
                               
                               if (currentPage + delta < totalPages - 1) {
                                 rangeWithDots.push('...', totalPages);
                               } else if (totalPages > 1) {
                                 rangeWithDots.push(totalPages);
                               }
                               
                               return rangeWithDots;
                             };
                             
                             return (
                               <div className="flex flex-col items-center gap-3 pt-4 border-t border-border">
                                 {/* Page Info */}
                                 <div className="text-xs text-muted-foreground text-center">
                                   Showing {((currentPage - 1) * questionsPerPage) + 1} to {Math.min(currentPage * questionsPerPage, questionsToShow.length)} of {questionsToShow.length} questions
                                   {searchTerm && ` (filtered from ${questions.length} total)`}
                                 </div>
                                 
                                 {/* Pagination Buttons */}
                                 <div className="flex flex-wrap items-center justify-center gap-1">
                                   {/* Previous Button */}
                                   <button
                                     onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                     disabled={currentPage === 1}
                                     className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                   >
                                     <ChevronLeft className="w-3 h-3" />
                                     <span className="hidden sm:inline">Prev</span>
                                   </button>
                                   
                                   {/* Page Numbers */}
                                   {getVisiblePages().map((page, index) => (
                                     <button
                                       key={index}
                                       onClick={() => typeof page === 'number' && setCurrentPage(page)}
                                       disabled={typeof page !== 'number'}
                                       className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                                         page === currentPage
                                           ? 'bg-primary text-primary-foreground border-primary'
                                           : typeof page === 'number'
                                           ? 'border-border bg-background hover:bg-muted'
                                           : 'border-transparent cursor-default'
                                       }`}
                                     >
                                       {page}
                                     </button>
                                   ))}
                                   
                                   {/* Next Button */}
                                   <button
                                     onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                     disabled={currentPage === totalPages}
                                     className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                   >
                                     <span className="hidden sm:inline">Next</span>
                                     <ChevronRight className="w-3 h-3" />
                                   </button>
                                 </div>
                               </div>
                             );
                           })()}
                         </>
                       ) : (
                         <div className="text-center py-8 text-muted-foreground">
                           <div className="text-sm">No questions added yet</div>
                           <div className="text-xs mt-1">Add questions to see point breakdown</div>
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Game Settings */}
                   {game && (
                     <div className="bg-card rounded-lg border border-border p-6">
                       <h3 className="font-semibold text-card-foreground mb-4 flex items-center">
                         <Settings className="w-5 h-5 mr-2" />
                         Game Settings
                       </h3>
                       
                       <div className="space-y-4">
                         <div className="grid grid-cols-1 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Total Game Time (automatically calculated)
                              </label>
                              <input
                                type="text"
                                value={game.settings.timeLimit ? formatGameTime(game.settings.timeLimit) : 'No questions added'}
                                readOnly
                                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-muted-foreground cursor-not-allowed"
                                placeholder="Add questions with time limits to calculate total time"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                This is calculated from the sum of all question time limits
                              </p>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">Max Attempts</label>
                              <input
                                type="number"
                                value={game.settings.maxAttempts || ''}
                                onChange={(e) => handleSettingsUpdate({
                                  ...game.settings,
                                  maxAttempts: parseInt(e.target.value)
                                })}
                                min="1"
                                className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-3 pt-4 border-t border-border">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="shuffleQuestions"
                                checked={game.settings.shuffleQuestions}
                                onChange={(e) => handleSettingsUpdate({
                                  ...game.settings,
                                  shuffleQuestions: e.target.checked
                                })}
                                className="h-4 w-4 rounded focus:ring-2 accent-primary"
                              />
                              <label htmlFor="shuffleQuestions" className="ml-2 text-sm text-foreground">
                                Shuffle questions for each player
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="showCorrectAnswers"
                                checked={game.settings.showCorrectAnswers}
                                onChange={(e) => handleSettingsUpdate({
                                  ...game.settings,
                                  showCorrectAnswers: e.target.checked
                                })}
                                className="h-4 w-4 rounded focus:ring-2 accent-primary"
                              />
                              <label htmlFor="showCorrectAnswers" className="ml-2 text-sm text-foreground">
                                Show correct answers after completion
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="allowSkipping"
                                checked={game.settings.allowSkipping}
                                onChange={(e) => handleSettingsUpdate({
                                  ...game.settings,
                                  allowSkipping: e.target.checked
                                })}
                                className="h-4 w-4 rounded focus:ring-2 accent-primary"
                              />
                              <label htmlFor="allowSkipping" className="ml-2 text-sm text-foreground">
                                Allow players to skip questions
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Publish Tab */}
            {activeTab === 'publish' && (
              <div className="space-y-6">
                {/* Publishing Overview */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Publishing Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">Configure how your game will be shared and accessed</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-sm font-medium text-muted-foreground">Draft</span>
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    {/* Visibility Settings */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">Game Visibility</label>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">Required</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <input
                            type="radio"
                            id="public"
                            name="visibility"
                            checked={publishSettings.visibility === 'public'}
                            onChange={() => handlePublishSettingsChange('visibility', 'public')}
                            className="peer sr-only"
                          />
                          <label 
                            htmlFor="public" 
                            className="flex items-start p-4 border-2 border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 group"
                          >
                            <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mr-4 group-hover:bg-green-200 transition-colors">
                              <Globe className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground mb-1">Public Game</div>
                              <div className="text-xs text-muted-foreground leading-relaxed">Anyone can discover and join this game through the public game directory</div>
                            </div>
                          </label>
                        </div>
                        
                        <div className="relative">
                          <input
                            type="radio"
                            id="private"
                            name="visibility"
                            checked={publishSettings.visibility === 'private'}
                            onChange={() => handlePublishSettingsChange('visibility', 'private')}
                            className="peer sr-only"
                          />
                          <label 
                            htmlFor="private" 
                            className="flex items-start p-4 border-2 border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 group"
                          >
                            <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg mr-4 group-hover:bg-orange-200 transition-colors">
                              <Lock className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground mb-1">Private Game</div>
                              <div className="text-xs text-muted-foreground leading-relaxed">Only participants with the game code or direct invitation can join</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Join Code for Private Games */}
                    {publishSettings.visibility === 'private' && (
                      <div className="space-y-4">
                        <label className="text-sm font-medium text-foreground">Private Game Join Code</label>
                        <div className="bg-muted/30 rounded-xl p-4">
                          {game?.joinCode ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-blue-800 mb-2 font-medium">Share this code with participants:</p>
                                  <p className="font-mono text-2xl font-bold text-blue-800">{game.joinCode}</p>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={copyJoinCode}
                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Copy join code"
                                  >
                                    📋
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : isGeneratingJoinCode ? (
                            <div className="text-center py-8">
                              <div className={`inline-flex items-center space-x-2 ${getPlatformClasses()}`}>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary transition-all duration-300 ease-in-out"></div>
                                <span className="text-foreground font-medium text-sm md:text-base">Generating join code...</span>
                              </div>
                            </div>
                          ) : !game ? (
                            <div className="text-center py-8">
                              <div className={`inline-flex items-center space-x-2 ${getPlatformClasses()}`}>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary transition-all duration-300 ease-in-out"></div>
                                <span className="text-foreground font-medium text-sm md:text-base">Loading game...</span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="flex items-center space-x-3">
                                <div className="text-yellow-600">⚠️</div>
                                <div>
                                  <p className="text-sm text-yellow-800 font-medium">Join code will be generated automatically</p>
                                  <p className="text-xs text-yellow-700 mt-1">A join code will be created when you publish this game</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Access Control Settings */}
                    {publishSettings.visibility === 'public' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">Access Control</label>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">Optional</span>
                        </div>
                        
                        {/* Require Approval */}
                        <div className="space-y-3">
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
                                checked={publishSettings.requireApproval || false}
                                onChange={(e) => handlePublishSettingsChange('requireApproval', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </div>

                        {/* Participant Limit */}
                        <div className="space-y-3">
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
                                     checked={publishSettings.participantLimit !== '' && parseInt(publishSettings.participantLimit) > 0}
                                     onChange={(e) => {
                                       if (e.target.checked) {
                                         handlePublishSettingsChange('participantLimit', '10');
                                       } else {
                                         handlePublishSettingsChange('participantLimit', '');
                                       }
                                     }}
                                     className="sr-only peer"
                                   />
                                   <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                 </label>
                                 <span className="text-sm text-muted-foreground">Enable limit</span>
                               </div>
                               {publishSettings.participantLimit !== '' && parseInt(publishSettings.participantLimit) > 0 && (
                                 <div className="flex items-center space-x-3">
                                   <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Participants</label>
                                   <input
                                     type="number"
                                     min="1"
                                     max="1000"
                                     value={publishSettings.participantLimit || '10'}
                                     onChange={(e) => handlePublishSettingsChange('participantLimit', e.target.value || '10')}
                                     className="w-20 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                                   />
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    
                    {/* Schedule Settings */}
                     <div className="space-y-4">
                       <label className="text-sm font-medium text-foreground">Game Schedule</label>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date & Time</label>
                           <div className="relative">
                             <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                             <input
                               type="datetime-local"
                               value={publishSettings.startDate}
                               onChange={(e) => handlePublishSettingsChange('startDate', e.target.value)}
                               className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                                 publishErrors.startDate 
                                   ? 'border-red-500 focus:ring-red-500' 
                                   : 'border-border focus:ring-primary'
                               }`}
                               min={new Date().toISOString().slice(0, 16)}
                             />
                           </div>
                           {publishErrors.startDate && (
                             <p className="text-xs text-red-600 mt-1">{publishErrors.startDate}</p>
                           )}
                         </div>
                         
                         <div className="space-y-2">
                           <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date & Time</label>
                           <div className="relative">
                             <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                             <input
                               type="datetime-local"
                               value={publishSettings.endDate}
                               onChange={(e) => handlePublishSettingsChange('endDate', e.target.value)}
                               className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                                 publishErrors.endDate 
                                   ? 'border-red-500 focus:ring-red-500' 
                                   : 'border-border focus:ring-primary'
                               }`}
                               min={publishSettings.startDate || new Date().toISOString().slice(0, 16)}
                             />
                           </div>
                           {publishErrors.endDate && (
                             <p className="text-xs text-red-600 mt-1">{publishErrors.endDate}</p>
                           )}
                         </div>
                       </div>
                       
                       {/* Schedule Duration Display */}
                       {publishSettings.startDate && publishSettings.endDate && !publishErrors.startDate && !publishErrors.endDate && (
                         <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                           <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                           <span className="text-sm text-green-700 dark:text-green-300">
                             Game duration: {(() => {
                               const start = new Date(publishSettings.startDate);
                               const end = new Date(publishSettings.endDate);
                               const duration = end.getTime() - start.getTime();
                               const hours = Math.floor(duration / (1000 * 60 * 60));
                               const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                               return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                             })()}
                           </span>
                         </div>
                       )}
                       
                       <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                         <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                         <span className="text-sm text-blue-700 dark:text-blue-300">Leave empty to allow participants to join anytime</span>
                       </div>
                     </div>

                    {/* Game Preview */}
                    <div className="space-y-4">
                      <label className="text-sm font-medium text-foreground">Preview & Testing</label>
                      <div className="bg-muted/30 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-foreground">Test Your Game</div>
                            <div className="text-xs text-muted-foreground">Preview how participants will experience your game</div>
                          </div>
                          <button className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-lg text-foreground bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200">
                            <Globe className="w-4 h-4 mr-2" />
                            Preview Game
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Publishing Actions */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-lg font-semibold text-foreground">Ready to Publish?</h4>
                      <p className="text-sm text-muted-foreground">Review your settings and make your game live for participants</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => {
                          // Save draft logic
                          toast.success('Draft saved successfully');
                        }}
                        className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-foreground bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
                      >
                        Save Draft
                      </button>
                      <button 
                        onClick={async () => {
                          const isValid = validatePublishSettings();
                          if (!isValid) {
                            toast.error('Please fix validation errors before publishing');
                            return;
                          }
                          
                          setIsPublishing(true);
                          try {
                            // Simulate publish API call
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            toast.success('Game published successfully!');
                          } catch (error) {
                            toast.error('Failed to publish game');
                          } finally {
                            setIsPublishing(false);
                          }
                        }}
                        disabled={isPublishing || !game?.title || questions.length === 0}
                        className={`inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl transition-all duration-200 shadow-soft hover:shadow-medium ${
                          isPublishing || !game?.title || questions.length === 0
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                        }`}
                      >
                        {isPublishing ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4 mr-2" />
                            Publish Game
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Publishing Checklist */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h5 className="text-sm font-medium text-foreground mb-4">Publishing Checklist</h5>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          questions.length > 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            questions.length > 0 ? 'bg-green-600' : 'bg-red-600'
                          }`}></div>
                        </div>
                        <span className={`text-sm ${
                          questions.length > 0 ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          Game has at least 1 question ({questions.length} added)
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          game?.title && game?.description ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            game?.title && game?.description ? 'bg-green-600' : 'bg-orange-600'
                          }`}></div>
                        </div>
                        <span className={`text-sm ${
                          game?.title && game?.description ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          Game title and description are set
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          publishSettings.startDate && publishSettings.endDate ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            publishSettings.startDate && publishSettings.endDate ? 'bg-green-600' : 'bg-orange-600'
                          }`}></div>
                        </div>
                        <span className={`text-sm ${
                          publishSettings.startDate && publishSettings.endDate ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          Schedule configured
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          publishSettings.visibility ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            publishSettings.visibility ? 'bg-green-600' : 'bg-orange-600'
                          }`}></div>
                        </div>
                        <span className={`text-sm ${
                          publishSettings.visibility ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          Visibility settings configured
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Validation Errors Summary */}
                  {Object.keys(publishErrors).length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                        <h5 className="text-sm font-medium text-destructive mb-2">Please fix the following issues:</h5>
                        <ul className="space-y-1">
                          {Object.entries(publishErrors).map(([field, error]) => (
                            <li key={field} className="text-sm text-destructive flex items-center">
                              <div className="w-1 h-1 bg-destructive rounded-full mr-2"></div>
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Review Tab */}
            {activeTab === 'review' && (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                        <p className="text-2xl font-bold text-foreground">{game?.participants || 0}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                        <p className="text-2xl font-bold text-foreground">0%</p>
                      </div>
                      <Trophy className="w-8 h-8 text-yellow-500" />
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                        <p className="text-2xl font-bold text-foreground">0</p>
                      </div>
                      <BarChart3 className="w-8 h-8 text-green-500" />
                    </div>
                  </div>
                  
                  <div className="bg-card rounded-lg border border-border p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Now</p>
                        <p className="text-2xl font-bold text-foreground">0</p>
                      </div>
                      <Activity className="w-8 h-8 text-purple-500" />
                    </div>
                  </div>
                </div>
                
                {/* Activity Feed & Leaderboard */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Activity Feed */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Activity Feed</h3>
                    <div className="space-y-4">
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No activity yet</p>
                        <p className="text-sm text-muted-foreground">Activity will appear here when participants start playing</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Leaderboard */}
                  <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Leaderboard</h3>
                    <div className="space-y-4">
                      <div className="text-center py-8">
                        <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No scores yet</p>
                        <p className="text-sm text-muted-foreground">Leaderboard will populate as participants complete the game</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Submissions */}
                <div className="bg-card rounded-lg border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Recent Submissions</h3>
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No submissions yet</p>
                    <p className="text-sm text-muted-foreground">Participant submissions will be displayed here</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Add Question Modal */}
      <AddQuestionModal
        isOpen={showAddQuestionModal}
        onClose={() => setShowAddQuestionModal(false)}
        onSubmit={handleAddQuestion}
        gameType={game?.type || ''}
      />

      {/* Edit Question Modal */}
      {editingQuestion && (
        <EditQuestionModal
          isOpen={showEditQuestionModal}
          onClose={closeEditModal}
          onSubmit={handleEditQuestion}
          gameType={game?.type || ''}
          question={editingQuestion}
        />
      )}
    </div>
  );
}

export default MissionsDashboard;