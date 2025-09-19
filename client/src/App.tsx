import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoadingSpinner } from './components/ui/LoadingSpinner'

// Pages
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import OrganizerRegistration from './pages/OrganizerRegistration'
import OrganizerDashboard from './pages/OrganizerDashboard'
import GamePage from './pages/GamePage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'

// Layout
import Layout from './components/layout/Layout'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Joli...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/register/organizer" element={
          user ? <Navigate to="/" replace /> : <OrganizerRegistration />
        } />
        
        {/* Protected routes */}
        <Route path="/" element={
          user ? (
            <Layout>
              <HomePage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="/game/:gameId" element={
          user ? (
            <Layout>
              <GamePage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="/leaderboard" element={
          user ? (
            <Layout>
              <LeaderboardPage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="/profile" element={
          user ? (
            <Layout>
              <ProfilePage />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="/organizer/dashboard" element={
          user && user.role === 'organizer' ? (
            <Layout>
              <OrganizerDashboard />
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        {/* 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default App