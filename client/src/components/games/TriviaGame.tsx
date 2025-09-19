import React, { useState, useEffect, useRef } from 'react';
import { Game, GameSession } from '../../types/game';
import { apiClient } from '../../services/apiClient';

interface Question {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  timeLimit?: number;
  displayOrder: number;
}

interface TriviaGameProps {
  game: Game;
  session: GameSession;
  onAction: (action: string, data?: any) => void;
  isConnected: boolean;
}

const TriviaGame: React.FC<TriviaGameProps> = ({ game, session, isConnected }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await apiClient.get(`/games/${game.id}/questions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success) {
          setQuestions(response.data.data.questions);
          // Initialize timer with game's time limit (convert minutes to seconds)
          const totalTimeInSeconds = (game.timeLimit || 10) * 60;
          setTimeRemaining(totalTimeInSeconds);
        } else {
          setError('Failed to load questions');
        }
      } catch (err) {
        setError('Error loading questions');
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [game.id, game.timeLimit]);

  // Timer effect
  useEffect(() => {
    if (gameStarted && !gameCompleted && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setGameCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameStarted, gameCompleted, timeRemaining]);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleAnswerSubmit = () => {
    if (!selectedAnswer || gameCompleted) return;

    // Submit answer logic here
    console.log('Submitted answer:', selectedAnswer);
    
    // Move to next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
    } else {
      // Game completed
      setGameCompleted(true);
      console.log('Game completed!');
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {game.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {game.title}
          </h2>
          <p className="text-red-600 dark:text-red-400">
            {error || 'No questions available for this game.'}
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  // Show start screen if game hasn't started
  if (!gameStarted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {game.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {questions.length} questions • {formatTime(timeRemaining)} total time
          </p>
          <div className={`inline-flex items-center space-x-2 mb-6 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button
            onClick={handleStartGame}
            disabled={!isConnected}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-semibold"
          >
            Start Game
          </button>
        </div>
      </div>
    );
  }

  // Show completion screen if game is completed
  if (gameCompleted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Game Completed!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {timeRemaining > 0 ? 'You finished all questions!' : 'Time\'s up!'}
          </p>
          <div className="mt-4 text-lg font-semibold text-blue-600">
            Final Time: {formatTime((game.timeLimit || 10) * 60 - timeRemaining)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {game.title}
        </h2>
        <div className="flex justify-center items-center space-x-4 mb-2">
          <p className="text-gray-600 dark:text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          <div className={`text-lg font-bold ${timeRemaining <= 60 ? 'text-red-600' : 'text-blue-600'}`}>
            ⏱️ {formatTime(timeRemaining)}
          </div>
        </div>
        <div className={`inline-flex items-center space-x-2 mt-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {currentQuestion.question}
          </h3>
          
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <label key={index} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          )}
          
          {currentQuestion.type === 'true_false' && (
            <div className="space-y-3">
              {['True', 'False'].map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          )}
          
          {currentQuestion.type === 'short_answer' && (
            <input
              type="text"
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Enter your answer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleAnswerSubmit}
            disabled={!selectedAnswer || gameCompleted}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Game'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TriviaGame;