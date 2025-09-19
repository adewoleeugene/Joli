import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, Save, Eye, Clock, Users, Trophy, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ImageUpload from '../components/ui/ImageUpload';

interface GameTypeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
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

interface GameFormData {
  title: string;
  description: string;
  type: string;
  image?: string;
  settings: {
    timeLimit?: number;
    maxAttempts?: number;
    shuffleQuestions?: boolean;
    showCorrectAnswers?: boolean;
    allowSkipping?: boolean;
    pointsPerCorrect?: number;
    requireApproval?: boolean;
    maxParticipants?: number;
  };
  questions?: Question[];
  challenges?: Challenge[];
  isPublic: boolean;
  status: 'draft' | 'active' | 'scheduled';
  scheduledStartTime?: string;
  scheduledEndTime?: string;
}

const GameCreate: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState<GameFormData>({
    title: '',
    description: '',
    type: '',
    image: '',
    settings: {
      timeLimit: 30,
      maxAttempts: 3,
      shuffleQuestions: true,
      showCorrectAnswers: true,
      allowSkipping: false,
      pointsPerCorrect: 10,
    },
    questions: [],
    challenges: [],
    isPublic: true,
    status: 'draft',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const gameTypeOptions: GameTypeOption[] = [
    {
      id: 'trivia',
      title: 'Trivia Quiz',
      description: 'Multiple choice questions with instant feedback',
      icon: '🧠',
      color: 'var(--chart-1)'
    },
    {
      id: 'scavenger',
      title: 'Scavenger Hunt',
      description: 'Location-based challenges and photo submissions',
      icon: '🔍',
      color: 'var(--chart-3)'
    },
    {
      id: 'puzzle',
      title: 'Puzzle Challenge',
      description: 'Brain teasers and logic problems',
      icon: '🧩',
      color: 'var(--primary)'
    },
    {
      id: 'memory',
      title: 'Memory Game',
      description: 'Test memory skills with sequences and patterns',
      icon: '🎯',
      color: 'var(--chart-4)'
    },
    {
      id: 'word',
      title: 'Word Game',
      description: 'Vocabulary and word association challenges',
      icon: '📝',
      color: 'var(--destructive)'
    },
    {
      id: 'photo',
      title: 'Photo Challenge',
      description: 'Creative photo submissions with themes',
      icon: '📸',
      color: 'var(--chart-2)'
    }
  ];

  useEffect(() => {
    // Always reset to initial state with no pre-selected game
    setSelectedType('');
    setFormData(prev => ({ ...prev, type: '' }));
    setStep(1);
  }, []);

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    setFormData(prev => ({ ...prev, type: typeId }));
    setStep(2);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      // Reset selection when returning to step 1
      if (step === 2) {
        setSelectedType('');
        setFormData(prev => ({ ...prev, type: '' }));
      }
    } else {
      navigate('/organizer/dashboard');
    }
  };

  const handleSaveGame = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a game title');
      return;
    }

    setLoading(true);
    try {
      // Send only the fields that the backend expects
      const gameData = {
        title: formData.title,
        description: formData.description,
        image: formData.image,
        type: formData.type
      };

      // Get the authentication token
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to create a game');
        navigate('/login');
        return;
      }

      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(gameData),
      });

      if (response.ok) {
        const result = await response.json();
        navigate(`/missions/${result.data.game.id}`);
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        alert(`Failed to create game: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const selectedGameType = gameTypeOptions.find(type => type.id === selectedType);
  const stepLabels = ['Choose Type', 'Basic Info'];

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        

        
        .fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        
        .game-type-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .game-type-card:hover {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg);
        }
        
        .game-type-card.selected {
          transform: translateY(-4px);
          box-shadow: var(--shadow-2xl);
        }
      `}</style>
      
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="shadow-sm border-b border-border" style={{ backgroundColor: '#0f0e13' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button 
                onClick={handleBack}
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {step > 1 ? 'Back' : 'Dashboard'}
              </button>
              <div className="pl-4 border-l border-border">
                <h1 className="text-2xl font-bold text-foreground">Create New Game</h1>
                <p className="text-sm mt-1 text-muted-foreground">
                  Step {step} of 3: {stepLabels[step - 1]}
                </p>
              </div>
            </div>

          </div>
        </div>



        {/* Content */}
        <div className="p-6">
          {/* Step 1: Game Type Selection */}
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-foreground mb-3">Choose Your Game Type</h2>
                <p className="text-lg text-muted-foreground">Select the type of interactive experience you want to create for your audience</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {gameTypeOptions.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => handleTypeSelect(option.id)}
                    className={`game-type-card cursor-pointer p-6 rounded-xl border-2 transition-all duration-300 ${
                      selectedType === option.id 
                        ? 'border-primary bg-primary/5 selected' 
                        : 'border-border bg-card hover:border-border/80'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-4">{option.icon}</div>
                      <h3 className="text-xl font-semibold text-card-foreground mb-2">{option.title}</h3>
                      <p className="text-muted-foreground mb-4">{option.description}</p>
                      {selectedType === option.id && (
                        <div className="flex justify-center mt-4">
                          <div className="bg-primary text-primary-foreground rounded-full p-2">
                            <span className="text-sm font-bold">✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Basic Information */}
          {step === 2 && selectedGameType && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-card rounded-xl shadow-lg overflow-hidden border border-border">
                {/* Header Section */}
                <div className="p-8 bg-accent border-b border-border">
                  <div className="flex items-center mb-4">
                    <span className="text-4xl mr-4">{selectedGameType.icon}</span>
                    <div>
                      <h2 className="text-3xl font-bold text-foreground">{selectedGameType.title}</h2>
                      <p className="text-lg text-muted-foreground">{selectedGameType.description}</p>
                    </div>
                  </div>
                </div>

                {/* Form Section */}
                <div className="p-8 space-y-6">
                  <div>
                     <label className="block text-sm font-medium text-foreground mb-2">Game Image</label>
                     <ImageUpload
                       value={formData.image}
                       onChange={(url) => setFormData({ ...formData, image: url })}
                     />
                   </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Game Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Enter your game title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={4}
                      placeholder="Describe your game"
                    />
                  </div>

                  {/* Visibility Setting */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">Game Visibility</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <input
                          type="radio"
                          id="public-create"
                          name="visibility-create"
                          checked={formData.isPublic}
                          onChange={() => setFormData({ ...formData, isPublic: true })}
                          className="peer sr-only"
                        />
                        <label 
                          htmlFor="public-create" 
                          className="flex items-start p-4 border-2 border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 group"
                        >
                          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mr-4 group-hover:bg-green-200 transition-colors">
                            <Users className="w-5 h-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground mb-1">Public Game</div>
                            <div className="text-xs text-muted-foreground leading-relaxed">Anyone can discover and join this game</div>
                          </div>
                        </label>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="radio"
                          id="private-create"
                          name="visibility-create"
                          checked={!formData.isPublic}
                          onChange={() => setFormData({ ...formData, isPublic: false })}
                          className="peer sr-only"
                        />
                        <label 
                          htmlFor="private-create" 
                          className="flex items-start p-4 border-2 border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5 group"
                        >
                          <div className="flex items-center justify-center w-10 h-10 bg-orange-100 rounded-lg mr-4 group-hover:bg-orange-200 transition-colors">
                            <Settings className="w-5 h-5 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-foreground mb-1">Private Game</div>
                            <div className="text-xs text-muted-foreground leading-relaxed">Only invited participants can join</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Access Control for Public Games */}
                  {formData.isPublic && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">Access Control</label>
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
                              checked={formData.settings.requireApproval || false}
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
                                  checked={formData.settings.maxParticipants !== undefined && formData.settings.maxParticipants > 0}
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
                            {formData.settings.maxParticipants !== undefined && formData.settings.maxParticipants > 0 && (
                              <div className="flex items-center space-x-3">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Max Participants</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="1000"
                                  value={formData.settings.maxParticipants || 10}
                                  onChange={(e) => setFormData({ 
                                    ...formData, 
                                    settings: { ...formData.settings, maxParticipants: parseInt(e.target.value) || 10 }
                                  })}
                                  className="w-20 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="px-8 py-6 bg-accent border-t border-border flex justify-between">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex items-center px-6 py-3 border border-border rounded-lg text-muted-foreground hover:bg-background hover:border-border/80 transition-all duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </button>
                  <button 
                    onClick={handleSaveGame}
                    disabled={!formData.title.trim()}
                    className="flex items-center px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    Create Game
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </>
  );
};

export default GameCreate;