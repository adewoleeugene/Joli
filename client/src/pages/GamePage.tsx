import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn } from '../utils/cn';
import { GameType, GameStatus, GameSession } from '../types/game';

// Game-specific components
import ScavengerHuntGame from '../components/games/ScavengerHuntGame';
import TriviaGame from '../components/games/TriviaGame';
import SongVotingGame from '../components/games/SongVotingGame';
import GuessTheSongGame from '../components/games/GuessTheSongGame';
import HangmanGame from '../components/games/HangmanGame';
import WordScrambleGame from '../components/games/WordScrambleGame';
import CreativeChallengeGame from '../components/games/CreativeChallengeGame';
import TruthOrDareGame from '../components/games/TruthOrDareGame';

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { currentGame, currentSession, joinGame, leaveGame } = useGame();
  const { isConnected, sendMessage } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
      navigate('/games');
      return;
    }

    const loadGame = async () => {
      try {
        setLoading(true);
        await joinGame(gameId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    loadGame();

    return () => {
      if (currentGame) {
        leaveGame();
      }
    };
  }, [gameId, joinGame, leaveGame, navigate]);

  const handleGameAction = (action: string, data?: any) => {
    if (!isConnected || !currentGame) return;

    sendMessage({
      type: 'game_action',
      gameId: currentGame.id,
      action,
      data
    });
  };

  const renderGameComponent = () => {
    if (!currentGame || !currentSession) return null;

    const gameProps = {
      game: currentGame,
      session: currentSession,
      onAction: handleGameAction,
      isConnected
    };

    switch (currentGame.type) {
      case GameType.SCAVENGER_HUNT:
        return <ScavengerHuntGame {...gameProps} />;
      case GameType.TRIVIA:
        return <TriviaGame {...gameProps} />;
      case GameType.SONG_VOTING:
        return <SongVotingGame {...gameProps} />;
      case GameType.GUESS_THE_SONG:
        return <GuessTheSongGame {...gameProps} />;
      case GameType.HANGMAN:
        return <HangmanGame {...gameProps} />;
      case GameType.WORD_SCRAMBLE:
        return <WordScrambleGame {...gameProps} />;
      case GameType.CREATIVE_CHALLENGE:
        return <CreativeChallengeGame {...gameProps} />;
      case GameType.TRUTH_OR_DARE:
        return <TruthOrDareGame {...gameProps} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Game type not supported</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Game Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/games')}
            className="btn-primary"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  if (!currentGame) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🎮</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Game Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The game you're looking for doesn't exist or has ended.
          </p>
          <button
            onClick={() => navigate('/games')}
            className="btn-primary"
          >
            Browse Games
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Game Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/games')}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentGame.title}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentGame.description}
                </p>
              </div>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )} />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          {/* Game Status */}
          <div className="mt-3 flex items-center space-x-4">
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              currentGame.status === GameStatus.ACTIVE
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : currentGame.status === GameStatus.WAITING
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            )}>
              {currentGame.status}
            </span>
            
            {currentSession && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Players: {currentSession.participants?.length || 0}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="max-w-4xl mx-auto p-4">
        {currentGame.status === GameStatus.WAITING ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Waiting for Game to Start
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              The game will begin shortly. Stay tuned!
            </p>
          </div>
        ) : currentGame.status === GameStatus.ENDED ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🏁</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Game Ended
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Thanks for playing! Check the leaderboard for results.
            </p>
            <button
              onClick={() => navigate('/leaderboard')}
              className="btn-primary"
            >
              View Results
            </button>
          </div>
        ) : (
          renderGameComponent()
        )}
      </div>
    </div>
  );
};

export default GamePage;