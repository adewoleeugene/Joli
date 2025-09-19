import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { usePlatform, getPlatformClasses } from './utils/platform';

// Registration pages
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ConfirmationPage from './pages/ConfirmationPage';
import StatusPage from './pages/StatusPage';
// removed: import DashboardPage from './pages/DashboardPage';
import AccountInfoPage from './pages/AccountInfoPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import RegistrationPage from './pages/RegistrationPage';

// Organizer pages
import HomePage from './pages/HomePage';
import SimplifiedDashboard from './pages/SimplifiedDashboard';
import MissionsDashboard from './pages/MissionsDashboard';
import GameCreate from './pages/GameCreate';
import GameManage from './pages/GameManage';
import GameAnalytics from './pages/GameAnalytics';
import GamePreview from './pages/GamePreview';
import GamePage from './pages/GamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Layout
import Layout from './components/layout/Layout';

// Import test utilities in development
if (import.meta.env.DEV) {
  import('./utils/testJoinCodeCache');
}

function AppContent() {
  const { user, loading } = useAuth();
  const platform = usePlatform();

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background ${getPlatformClasses()}`}>
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground transition-colors">Loading Joli...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background text-foreground ${getPlatformClasses()}`}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          user ? <Navigate to="/" replace /> : <LoginPage />
        } />
        <Route path="/signup" element={
          user ? <Navigate to="/" replace /> : <SignUpPage />
        } />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/register" element={
          user ? <Navigate to="/" replace /> : <RegistrationPage />
        } />
        <Route path="/confirmation" element={<ConfirmationPage />} />
        <Route path="/status" element={<StatusPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          user ? (
            user.role === 'organizer' ? (
              <Navigate to="/organizer/dashboard" replace />
            ) : (
              <Layout>
                <HomePage />
              </Layout>
            )
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        
        <Route path="/account-info" element={
          <ProtectedRoute>
            <AccountInfoPage />
          </ProtectedRoute>
        } />
        
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
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
          <ProtectedRoute>
            {user && user.role === 'organizer' ? (
              <Layout>
                <SimplifiedDashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            {user && user.role === 'organizer' ? (
              <Layout>
                <MissionsDashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        } />
        
        <Route path="/games/create" element={
          <ProtectedRoute>
            {user && user.role === 'organizer' ? (
              <Layout>
                <GameCreate />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        } />
        
        <Route path="/games/:gameId/manage" element={
          <ProtectedRoute>
            {user && user.role === 'organizer' ? (
              <Layout>
                <GameManage />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        } />
        
        <Route path="/games/:gameId/analytics" element={
          <ProtectedRoute>
            {user && user.role === 'organizer' ? (
              <Layout>
                <GameAnalytics />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        } />
        
        <Route path="/games/:gameId/preview" element={
          <ProtectedRoute>
            {user && user.role === 'organizer' ? (
              <Layout>
                <GamePreview />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        } />
        
        <Route path="/missions/:gameId" element={
          <ProtectedRoute>
            {user && user.role === 'organizer' ? (
              <Layout>
                <MissionsDashboard />
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )}
          </ProtectedRoute>
        } />
        

        
        {/* 404 page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <AppContent />
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;