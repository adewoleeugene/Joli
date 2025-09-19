import React from 'react';
import { X } from 'lucide-react';

interface GameTypeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface GameTypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (typeId: string) => void;
}

const gameTypeOptions: GameTypeOption[] = [
  {
    id: 'scavenger_hunt',
    title: 'Scavenger Hunt',
    description: 'Interactive photo and location-based challenges',
    icon: '🔍',
    color: 'bg-blue-500',
    difficulty: 'Medium'
  },
  {
    id: 'trivia',
    title: 'Trivia Challenge',
    description: 'Multiple choice questions on various topics',
    icon: '🧠',
    color: 'bg-purple-500',
    difficulty: 'Easy'
  },
  {
    id: 'guess_the_song',
    title: 'Guess the Song',
    description: 'Audio-based music identification game',
    icon: '🎵',
    color: 'bg-green-500',
    difficulty: 'Medium'
  },
  {
    id: 'word_scramble',
    title: 'Word Scramble',
    description: 'Unscramble letters to form words',
    icon: '🔤',
    color: 'bg-yellow-500',
    difficulty: 'Easy'
  },
  {
    id: 'hangman',
    title: 'Hangman',
    description: 'Classic word guessing game',
    icon: '🎯',
    color: 'bg-red-500',
    difficulty: 'Medium'
  },
  {
    id: 'creative_challenge',
    title: 'Creative Challenge',
    description: 'Photo and video submission challenges',
    icon: '🎨',
    color: 'bg-pink-500',
    difficulty: 'Hard'
  },
  {
    id: 'dj_song_voting',
    title: 'DJ Song Voting',
    description: 'Collaborative playlist creation and voting',
    icon: '🎧',
    color: 'bg-indigo-500',
    difficulty: 'Easy'
  },
  {
    id: 'truth_or_dare',
    title: 'Truth or Dare',
    description: 'Interactive truth questions and dare challenges',
    icon: '🎭',
    color: 'bg-orange-500',
    difficulty: 'Medium'
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Easy':
      return 'bg-green-100 text-green-800';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'Hard':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export default function GameTypeSelection({ isOpen, onClose, onSelectType }: GameTypeSelectionProps) {
  if (!isOpen) return null;

  const handleTypeSelect = (typeId: string) => {
    onSelectType(typeId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-card rounded-lg shadow-xl border border-border">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Choose Your Game Type</h2>
              <p className="text-muted-foreground mt-1">Select the type of game you want to create</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted/50 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
          
          {/* Game Types Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gameTypeOptions.map((gameType) => (
                <div
                  key={gameType.id}
                  onClick={() => handleTypeSelect(gameType.id)}
                  className="bg-card rounded-lg shadow-md border-2 border-transparent hover:border-primary cursor-pointer transition-all duration-200 p-6 group hover:shadow-lg"
                >
                  <div className="text-center">
                    <div className={`w-16 h-16 ${gameType.color} rounded-full flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                      {gameType.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{gameType.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 min-h-[2.5rem]">{gameType.description}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(gameType.difficulty)}`}>
                      {gameType.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 rounded-b-lg">
            <p className="text-sm text-muted-foreground text-center">
              Choose a game type to start creating your interactive experience
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}