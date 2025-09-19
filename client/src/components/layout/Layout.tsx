import React, { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Header } from './Header'
import { BottomNavigation } from './BottomNavigation'
import { cn } from '../../utils/cn'

interface LayoutProps {
  children: ReactNode
  className?: string
  showHeader?: boolean
  showBottomNav?: boolean
}

export default function Layout({ 
  children, 
  className,
  showHeader = true,
  showBottomNav = true 
}: LayoutProps) {
  const location = useLocation()
  
  // Hide navigation on certain pages
  const isGamePage = location.pathname.startsWith('/game/')
  const shouldShowHeader = showHeader && !isGamePage
  const shouldShowBottomNav = showBottomNav && !isGamePage

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {shouldShowHeader && <Header />}
      
      <main 
        className={cn(
          'flex-1 flex flex-col',
          shouldShowHeader && 'pt-16', // Account for fixed header
          shouldShowBottomNav && 'pb-16', // Account for fixed bottom nav
          className
        )}
      >
        {children}
      </main>
      
      {shouldShowBottomNav && <BottomNavigation />}
    </div>
  )
}

// Alternative layout for full-screen experiences (like games)
export function FullScreenLayout({ children, className }: LayoutProps) {
  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
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