import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

interface Game {
  id: string
  title: string
  description: string
  image?: string
  type: string
  status: 'draft' | 'active' | 'completed'

  organizerId: string
  settings: {
    timeLimit?: number
    maxParticipants?: number
    allowLateJoin: boolean
    showLeaderboard: boolean
    requireApproval: boolean
  }
  content: any
  createdAt: string
  updatedAt: string
}

interface PreviewSession {
  id: string
  gameId: string
  participantName: string
  responses: any[]
  score: number
  timeSpent: number
  completedAt?: string
}

const GamePreview: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'organizer' | 'participant'>('organizer')
  const [previewSession, setPreviewSession] = useState<PreviewSession | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<any[]>([])
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [isPreviewActive, setIsPreviewActive] = useState(false)

  useEffect(() => {
    fetchGame()
  }, [gameId])

  const fetchGame = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/organizer/games/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch game')
      }

      const gameData = await response.json()
      setGame(gameData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const startPreview = () => {
    setIsPreviewActive(true)
    setSessionStartTime(new Date())
    setCurrentQuestionIndex(0)
    setResponses([])
    
    const newSession: PreviewSession = {
      id: `preview-${Date.now()}`,
      gameId: gameId!,
      participantName: 'Preview User',
      responses: [],
      score: 0,
      timeSpent: 0
    }
    setPreviewSession(newSession)
  }

  const endPreview = () => {
    if (sessionStartTime) {
      const timeSpent = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)
      const finalScore = calculateScore()
      
      setPreviewSession(prev => prev ? {
        ...prev,
        timeSpent,
        score: finalScore,
        completedAt: new Date().toISOString()
      } : null)
    }
    
    setIsPreviewActive(false)
  }

  const calculateScore = () => {
    if (!game || !game.content) return 0
    
    switch (game.type) {
      case 'trivia':
        return responses.reduce((score, response, index) => {
          const question = game.content.questions[index]
          if (question && response === question.correctAnswer) {
            return score + (question.points || 10)
          }
          return score
        }, 0)
      
      case 'scavenger-hunt':
        return responses.filter(response => response?.completed).length * 20
      
      case 'word-scramble':
        return responses.reduce((score, response, index) => {
          const word = game.content.words[index]
          if (word && response?.toLowerCase() === word.answer.toLowerCase()) {
            return score + (word.points || 15)
          }
          return score
        }, 0)
      
      default:
        return responses.length * 10
    }
  }

  const handleResponse = (response: any) => {
    const newResponses = [...responses]
    newResponses[currentQuestionIndex] = response
    setResponses(newResponses)
  }

  const nextQuestion = () => {
    if (game && game.content) {
      const totalQuestions = game.content.questions?.length || game.content.words?.length || game.content.tasks?.length || 0
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      } else {
        endPreview()
      }
    }
  }

  const renderGameContent = () => {
    if (!game || !game.content || !isPreviewActive) return null

    switch (game.type) {
      case 'trivia':
        return renderTriviaQuestion()
      case 'scavenger-hunt':
        return renderScavengerTask()
      case 'word-scramble':
        return renderWordScramble()
      case 'guess-the-song':
        return renderGuessTheSong()
      case 'creative-challenge':
        return renderCreativeChallenge()
      default:
        return <div className="text-center text-gray-500">Preview not available for this game type</div>
    }
  }

  const renderTriviaQuestion = () => {
    const question = game?.content?.questions?.[currentQuestionIndex]
    if (!question) return null

    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="mb-4">
          <span className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {game.content.questions.length}</span>
        </div>
        <h3 className="text-xl font-semibold mb-4 text-card-foreground">{question.question}</h3>
        <div className="space-y-3">
          {question.options.map((option: string, index: number) => (
            <button
              key={index}
              onClick={() => {
                handleResponse(option)
                setTimeout(nextQuestion, 1000)
              }}
              className="w-full text-left p-3 border border-input rounded-lg hover:bg-accent hover:border-accent-foreground transition-colors text-foreground"
            >
              {String.fromCharCode(65 + index)}. {option}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderScavengerTask = () => {
    const task = game?.content?.tasks?.[currentQuestionIndex]
    if (!task) return null

    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="mb-4">
          <span className="text-sm text-muted-foreground">Task {currentQuestionIndex + 1} of {game.content.tasks.length}</span>
        </div>
        <h3 className="text-xl font-semibold mb-4 text-card-foreground">{task.title}</h3>
        <p className="text-muted-foreground mb-4">{task.description}</p>
        {task.hint && (
          <div className="bg-chart-3/10 border border-chart-3/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-chart-3"><strong>Hint:</strong> {task.hint}</p>
          </div>
        )}
        <div className="space-y-3">
          <button
            onClick={() => {
              handleResponse({ completed: true, method: 'photo' })
              setTimeout(nextQuestion, 1000)
            }}
            className="w-full bg-chart-2 text-chart-2-foreground py-2 px-4 rounded-lg hover:bg-chart-2/90 transition-colors"
          >
            📷 Complete with Photo
          </button>
          <button
            onClick={() => {
              handleResponse({ completed: true, method: 'text' })
              setTimeout(nextQuestion, 1000)
            }}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
          >
            ✏️ Complete with Text
          </button>
        </div>
      </div>
    )
  }

  const renderWordScramble = () => {
    const word = game?.content?.words?.[currentQuestionIndex]
    if (!word) return null

    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="mb-4">
          <span className="text-sm text-muted-foreground">Word {currentQuestionIndex + 1} of {game.content.words.length}</span>
        </div>
        <h3 className="text-xl font-semibold mb-4 text-card-foreground">Unscramble this word:</h3>
        <div className="text-center mb-6">
          <div className="text-3xl font-bold text-primary bg-primary/10 py-4 px-6 rounded-lg inline-block">
            {word.scrambled}
          </div>
        </div>
        {word.hint && (
          <div className="bg-chart-3/10 border border-chart-3/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-chart-3"><strong>Hint:</strong> {word.hint}</p>
          </div>
        )}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Enter your answer..."
            className="w-full p-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleResponse((e.target as HTMLInputElement).value)
                setTimeout(nextQuestion, 1000)
              }
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input') as HTMLInputElement
              handleResponse(input.value)
              setTimeout(nextQuestion, 1000)
            }}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Submit Answer
          </button>
        </div>
      </div>
    )
  }

  const renderGuessTheSong = () => {
    const song = game?.content?.songs?.[currentQuestionIndex]
    if (!song) return null

    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="mb-4">
          <span className="text-sm text-muted-foreground">Song {currentQuestionIndex + 1} of {game.content.songs.length}</span>
        </div>
        <h3 className="text-xl font-semibold mb-4 text-card-foreground">Guess the Song!</h3>
        <div className="text-center mb-6">
          <div className="bg-chart-4/10 py-8 px-6 rounded-lg">
            <div className="text-4xl mb-2">🎵</div>
            <p className="text-muted-foreground">Audio preview would play here</p>
            <p className="text-sm text-muted-foreground/80 mt-2">Duration: {song.duration || '30'}s</p>
          </div>
        </div>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Song title..."
            className="w-full p-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          />
          <input
            type="text"
            placeholder="Artist name..."
            className="w-full p-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          />
          <button
            onClick={() => {
              handleResponse({ title: 'Preview Answer', artist: 'Preview Artist' })
              setTimeout(nextQuestion, 1000)
            }}
            className="w-full bg-chart-4 text-chart-4-foreground py-2 px-4 rounded-lg hover:bg-chart-4/90 transition-colors"
          >
            Submit Guess
          </button>
        </div>
      </div>
    )
  }

  const renderCreativeChallenge = () => {
    const challenge = game?.content?.challenges?.[currentQuestionIndex]
    if (!challenge) return null

    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <div className="mb-4">
          <span className="text-sm text-muted-foreground">Challenge {currentQuestionIndex + 1} of {game.content.challenges.length}</span>
        </div>
        <h3 className="text-xl font-semibold mb-4 text-card-foreground">{challenge.title}</h3>
        <p className="text-muted-foreground mb-4">{challenge.description}</p>
        <div className="bg-chart-5/10 border border-chart-5/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-chart-5"><strong>Time Limit:</strong> {challenge.timeLimit || 'No limit'}</p>
          <p className="text-sm text-chart-5"><strong>Submission Type:</strong> {challenge.submissionType || 'Any'}</p>
        </div>
        <div className="space-y-3">
          <textarea
            placeholder="Describe your creative response..."
            rows={4}
            className="w-full p-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          ></textarea>
          <button
            onClick={() => {
              handleResponse({ type: 'text', content: 'Preview creative response' })
              setTimeout(nextQuestion, 1000)
            }}
            className="w-full bg-chart-5 text-chart-5-foreground py-2 px-4 rounded-lg hover:bg-chart-5/90 transition-colors"
          >
            Submit Response
          </button>
        </div>
      </div>
    )
  }

  const renderPreviewResults = () => {
    if (!previewSession || !previewSession.completedAt) return null

    return (
      <div className="bg-card rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-center mb-6 text-card-foreground">Preview Complete! 🎉</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="text-2xl font-bold text-primary">{previewSession.score}</div>
            <div className="text-sm text-muted-foreground">Final Score</div>
          </div>
          <div className="text-center p-4 bg-chart-2/10 rounded-lg">
            <div className="text-2xl font-bold text-chart-2">{Math.floor(previewSession.timeSpent / 60)}:{(previewSession.timeSpent % 60).toString().padStart(2, '0')}</div>
            <div className="text-sm text-muted-foreground">Time Spent</div>
          </div>
          <div className="text-center p-4 bg-chart-4/10 rounded-lg">
            <div className="text-2xl font-bold text-chart-4">{responses.length}</div>
            <div className="text-sm text-muted-foreground">Responses</div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={startPreview}
            className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => navigate(`/games/${gameId}/manage`)}
            className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Back to Edit
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-destructive text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-card-foreground mb-2">Error Loading Game</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => navigate('/organizer/dashboard')}
              className="bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-muted-foreground/60 text-4xl mb-4">🎮</div>
            <h2 className="text-xl font-semibold text-card-foreground mb-2">Game Not Found</h2>
            <p className="text-muted-foreground mb-4">The game you're looking for doesn't exist or you don't have permission to view it.</p>
            <button
              onClick={() => navigate('/organizer/dashboard')}
              className="bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-card rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start space-x-4">
              {game.image && (
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-card-foreground">{game.title}</h1>
                <p className="text-muted-foreground">{game.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                game.status === 'draft' ? 'bg-chart-3/10 text-chart-3' :
                game.status === 'active' ? 'bg-chart-2/10 text-chart-2' :
                'bg-muted text-muted-foreground'
              }`}>
                {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
              </span>
            </div>
          </div>
          
          {/* Preview Mode Toggle */}
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-sm font-medium text-foreground">Preview as:</span>
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('organizer')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  previewMode === 'organizer'
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Organizer
              </button>
              <button
                onClick={() => setPreviewMode('participant')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  previewMode === 'participant'
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Participant
              </button>
            </div>
          </div>

          {/* Game Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <div className="font-medium capitalize text-foreground">{game.type.replace('-', ' ')}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Time Limit:</span>
              <div className="font-medium text-foreground">{game.settings.timeLimit ? `${game.settings.timeLimit} min` : 'No limit'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Max Participants:</span>
              <div className="font-medium text-foreground">{game.settings.maxParticipants || 'Unlimited'}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Late Join:</span>
              <div className="font-medium text-foreground">{game.settings.allowLateJoin ? 'Allowed' : 'Not allowed'}</div>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        {!isPreviewActive && !previewSession?.completedAt && (
          <div className="bg-card rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-card-foreground mb-4">Ready to Preview?</h2>
            <p className="text-muted-foreground mb-6">
              Test your game as a {previewMode} would experience it. This will help you identify any issues before launching.
            </p>
            <button
              onClick={startPreview}
              className="bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Start Preview
            </button>
          </div>
        )}

        {/* Active Preview */}
        {isPreviewActive && !previewSession?.completedAt && (
          <div className="space-y-6">
            {/* Game Content */}
            {renderGameContent()}

            {/* Preview Controls */}
            <div className="bg-card rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={endPreview}
                  className="bg-destructive text-destructive-foreground py-2 px-4 rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  End Preview
                </button>
                <div className="text-sm text-muted-foreground">
                  Preview started {sessionStartTime && new Date(sessionStartTime).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Results */}
        {previewSession?.completedAt && renderPreviewResults()}

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/organizer/dashboard')}
            className="text-primary hover:text-primary/80 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default GamePreview