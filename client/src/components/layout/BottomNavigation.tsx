import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../utils/cn'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  activeIcon?: React.ReactNode
}

const getNavItems = (userRole?: string): NavItem[] => {
  const baseItems: NavItem[] = [
    {
      path: '/',
      label: 'Home',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
      ),
    },
    {
      path: '/games',
      label: 'Games',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M16 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
    },
    {
      path: '/leaderboard',
      label: 'Leaderboard',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 13v8h4v-8H7zM15 5v16h4V5h-4zM3 17v4h4v-4H3z" />
        </svg>
      ),
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
    },
  ]

  // Add organizer-specific navigation item
  if (userRole === 'organizer') {
    const organizerDashboard: NavItem = {
      path: '/organizer/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      activeIcon: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      ),
    }
    // Insert dashboard as second item (after Home)
    baseItems.splice(1, 0, organizerDashboard)
  }

  return baseItems
}

export function BottomNavigation() {
  const location = useLocation()
  const { user } = useAuth()
  const navItems = getNavItems(user?.role)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 safe-area-bottom">
      <div className={`grid h-16 ${navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path))
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center space-y-1 transition-colors touch-manipulation',
                isActive 
                  ? 'text-primary' 
                  : 'text-gray-500 hover:text-gray-700 active:text-primary'
              )}
            >
              <div className="relative">
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              
              <span className={cn(
                'text-xs font-medium',
                isActive ? 'text-primary' : 'text-gray-500'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Alternative compact bottom navigation
export function CompactBottomNavigation() {
  const location = useLocation()
  const { user } = useAuth()
  const navItems = getNavItems(user?.role)

  return (
    <nav className="fixed bottom-4 left-4 right-4 z-50">
      <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path))
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 touch-manipulation',
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-110' 
                    : 'text-gray-500 hover:bg-gray-100 active:scale-95'
                )}
              >
                {isActive && item.activeIcon ? item.activeIcon : item.icon}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}