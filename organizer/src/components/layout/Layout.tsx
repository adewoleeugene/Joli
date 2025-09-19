import React, { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'
import { cn } from '../../utils/cn'

interface LayoutProps {
  children: ReactNode
  className?: string
  showHeader?: boolean
}

export default function Layout({ 
  children, 
  className,
  showHeader = true
}: LayoutProps) {
  const location = useLocation()
  
  // Hide navigation on certain pages
  const isGamePage = location.pathname.startsWith('/game/')
  const isOrganizerPage = location.pathname.startsWith('/organizer/') || 
                         location.pathname.startsWith('/games/')
  const shouldShowHeader = showHeader && !isGamePage
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {shouldShowHeader && <Header />}
      
      <main 
        className={cn(
          'flex-1 flex flex-col',
          shouldShowHeader && 'pt-16', // Account for fixed header
          className
        )}
      >
        {children}
      </main>
    </div>
  )
}

// Alternative layout for full-screen experiences (like games)
export function FullScreenLayout({ children, className }: LayoutProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {children}
    </div>
  )
}

// Layout for authentication pages
export function AuthLayout({ children, className }: LayoutProps) {
  return (
    <div className={cn(
      'min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4',
      className
    )}>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}