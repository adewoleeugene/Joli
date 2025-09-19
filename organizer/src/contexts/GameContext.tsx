import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { Game, GameSession, GameSubmission } from '../types/game'
import { useAuth } from './AuthContext'

interface GameState {
  currentGame: Game | null
  currentSession: GameSession | null
  submissions: GameSubmission[]
  loading: boolean
  error: string | null
}

type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_GAME'; payload: Game | null }
  | { type: 'SET_CURRENT_SESSION'; payload: GameSession | null }
  | { type: 'ADD_SUBMISSION'; payload: GameSubmission }
  | { type: 'SET_SUBMISSIONS'; payload: GameSubmission[] }
  | { type: 'RESET_GAME' }

interface GameContextType {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  currentGame: Game | null
  currentSession: GameSession | null
  updateGame: (game: Game) => void
  updateSession: (session: GameSession) => void
  addSubmission: (submission: GameSubmission) => void
  joinGame: (gameId: string) => Promise<void>
  leaveGame: () => void
}

const initialState: GameState = {
  currentGame: null,
  currentSession: null,
  submissions: [],
  loading: false,
  error: null,
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_CURRENT_GAME':
      return { ...state, currentGame: action.payload }
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload }
    case 'ADD_SUBMISSION':
      return { ...state, submissions: [...state.submissions, action.payload] }
    case 'SET_SUBMISSIONS':
      return { ...state, submissions: action.payload }
    case 'RESET_GAME':
      return {
        ...state,
        currentGame: null,
        currentSession: null,
        submissions: [],
        error: null,
      }
    default:
      return state
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined)

interface GameProviderProps {
  children: ReactNode
}

export function GameProvider({ children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const { userProfile } = useAuth()

  const setCurrentGame = (game: Game | null) => {
    dispatch({ type: 'SET_CURRENT_GAME', payload: game })
  }

  const setCurrentSession = (session: GameSession | null) => {
    dispatch({ type: 'SET_CURRENT_SESSION', payload: session })
  }

  const addSubmission = (submission: GameSubmission) => {
    dispatch({ type: 'ADD_SUBMISSION', payload: submission })
  }

  const setSubmissions = (submissions: GameSubmission[]) => {
    dispatch({ type: 'SET_SUBMISSIONS', payload: submissions })
  }

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME' })
  }

  const joinGame = async (gameId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const token =
        localStorage.getItem('access_token') ||
        localStorage.getItem('sb-access-token') ||
        '';

      const res = await fetch(`/api/games/${gameId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch game: ${res.status}`);
      }

      const payload = await res.json();
      const game = (payload?.data?.game ?? payload?.game) as Game;

      dispatch({ type: 'SET_CURRENT_GAME', payload: game });

      const session: GameSession = {
        id: (crypto?.randomUUID && crypto.randomUUID()) || `sess_${Date.now()}`,
        gameId,
        userId: userProfile?.uid || 'organizer',
        status: 'active',
        startedAt: new Date().toISOString(),
        currentStep: 1,
        totalSteps: 1,
        score: 0,
        timeSpent: 0,
        submissions: [],
        metadata: { stub: true },
      };

      dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
    } catch (err: any) {
      console.error('joinGame error:', err);
      dispatch({ type: 'SET_ERROR', payload: err?.message || 'Failed to join game' });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };
  const leaveGame = () => {
    dispatch({ type: 'SET_CURRENT_GAME', payload: null });
    dispatch({ type: 'SET_CURRENT_SESSION', payload: null });
    dispatch({ type: 'SET_SUBMISSIONS', payload: [] });
  };

  const value: GameContextType = {
    state,
    dispatch,
    currentGame: state.currentGame,
    currentSession: state.currentSession,
    updateGame: (game: Game) => {
      dispatch({ type: 'SET_CURRENT_GAME', payload: game });
    },
    updateSession: (session: GameSession) => {
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
    },
    addSubmission: (submission: GameSubmission) => {
      dispatch({ type: 'ADD_SUBMISSION', payload: submission });
    },
    joinGame,
    leaveGame,
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}