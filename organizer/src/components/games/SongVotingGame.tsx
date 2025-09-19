import React from 'react';
import { Game, GameSession } from '../../types/game';

interface SongVotingGameProps {
  game: Game;
  session: GameSession;
  onAction: (action: string, data?: any) => void;
  isConnected: boolean;
}

const SongVotingGame: React.FC<SongVotingGameProps> = ({ game, isConnected }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {game.title}
        </h2>
        <p className="text-muted-foreground">
          Vote for your favorite songs!
        </p>
      </div>
      
      <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Song Voting game implementation coming soon...
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

export default SongVotingGame;