import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, var(--background), var(--muted))` }}>
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 mx-auto mb-4"
            style={{
              border: '3px solid var(--muted)',
              borderTop: '3px solid var(--primary)'
            }}
          ></div>
          <p style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}