import React, { useState, useEffect } from 'react';
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

interface ScavengerHuntGameProps {
  game: Game;
  session: GameSession;
  onAction: (action: string, data?: any) => void;
  isConnected: boolean;
}

const ScavengerHuntGame: React.FC<ScavengerHuntGameProps> = ({ game, session, isConnected }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        } else {
          setError('Failed to load challenges');
        }
      } catch (err) {
        setError('Error loading challenges');
        console.error('Error fetching questions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [game.id]);

  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return;

    // Submit answer logic here
    console.log('Submitted answer:', selectedAnswer);
    
    // Move to next challenge
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
    } else {
      // Game completed
      console.log('Scavenger hunt completed!');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {game.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Loading challenges...</p>
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
            {error || 'No challenges available for this scavenger hunt.'}
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {game.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Challenge {currentQuestionIndex + 1} of {questions.length}
        </p>
        <div className={`inline-flex items-center space-x-2 mt-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🔍 {currentQuestion.question}
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
            <div className="space-y-3">
              <input
                type="text"
                value={selectedAnswer}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="Describe what you found or completed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                💡 Tip: You can also upload a photo as proof!
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end items-center">
          <button
            onClick={handleAnswerSubmit}
            disabled={!selectedAnswer}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Challenge' : 'Complete Hunt'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScavengerHuntGame;