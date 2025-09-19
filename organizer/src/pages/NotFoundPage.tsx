import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../utils/cn'

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-4">🎮</div>
        <h1 className="text-4xl font-bold text-foreground mb-2">
          404
        </h1>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8">
          Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
        </p>
        
        <div className="space-y-3">
          <Link
            to="/"
            className={cn(
              'inline-block w-full px-6 py-3 bg-primary text-primary-foreground hover:opacity-90 transition-all duration-200',
              'text-white font-medium rounded-lg transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
            )}
          >
            Go Home
          </Link>
          
          <Link
            to="/games"
            className={cn(
              'inline-block w-full px-6 py-3 bg-muted hover:bg-muted/80',
              'text-foreground font-medium rounded-lg transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
            )}
          >
            Browse Games
          </Link>
        </div>
        
        <div className="mt-8 text-sm text-muted-foreground">
          <p>Need help? <Link to="/support" className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary/60 transition-colors">Contact Support</Link></p>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage