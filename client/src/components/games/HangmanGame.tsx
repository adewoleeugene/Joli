import React from 'react';
import { Game, GameSession } from '../../types/game';

interface HangmanGameProps {
  game: Game;
  session: GameSession;
  onAction: (action: string, data?: any) => void;
  isConnected: boolean;
}

const HangmanGame: React.FC<HangmanGameProps> = ({ game, isConnected }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {game.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Guess the word letter by letter!
        </p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Hangman game implementation coming soon...
          </p>
          <div className={`inline-flex items-center space-x-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HangmanGame;