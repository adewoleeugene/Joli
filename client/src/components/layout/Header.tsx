import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useWebSocket } from '../../contexts/WebSocketContext'
import { cn } from '../../utils/cn'

export function Header() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { connectionStatus } = useWebSocket()
  const location = useLocation()

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-top">
      <div className="container-mobile py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">J</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Joli</span>
          </Link>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {/* Connection status */}
            <div className="flex items-center space-x-1">
              <div 
                className={cn(
                  'w-2 h-2 rounded-full',
                  connectionStatus === 'connected' && 'bg-success-500',
                  connectionStatus === 'connecting' && 'bg-warning-500 animate-pulse',
                  connectionStatus === 'disconnected' && 'bg-gray-400',
                  connectionStatus === 'error' && 'bg-error-500'
                )}
              />
              <span className="text-xs text-gray-500 hidden sm:inline">
                {connectionStatus === 'connected' && 'Online'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'disconnected' && 'Offline'}
                {connectionStatus === 'error' && 'Error'}
              </span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* User menu */}
            {user && (
              <div className="relative">
                <Link
                  to="/profile"
                  className={cn(
                    'flex items-center space-x-2 p-2 rounded-lg transition-colors',
                    location.pathname === '/profile' 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-gray-100'
                  )}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-900 hidden sm:inline">
                    {user.name}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}