import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { GameProvider } from './contexts/GameContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { WebSocketProvider } from './contexts/WebSocketContext.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

// Register service worker for PWA functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}

// Prevent zoom on double tap (iOS Safari)
document.addEventListener('touchstart', (event) => {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
})

let lastTouchEnd = 0
document.addEventListener('touchend', (event) => {
  const now = new Date().getTime()
  if (now - lastTouchEnd <= 300) {
    event.preventDefault()
  }
  lastTouchEnd = now
}, false)

// Handle viewport height for mobile browsers
const setVH = () => {
  const vh = window.innerHeight * 0.01
  document.documentElement.style.setProperty('--vh', `${vh}px`)
}

setVH()
window.addEventListener('resize', setVH)
window.addEventListener('orientationchange', setVH)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>
            <AuthProvider>
              <WebSocketProvider>
                <GameProvider>
                  <App />
                  <Toaster
                    position="top-center"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: 'var(--card)',
                        color: 'var(--card-foreground)',
                        borderRadius: 'var(--radius)',
                        padding: '12px 16px',
                        fontSize: '14px',
                        maxWidth: '90vw',
                        border: '1px solid var(--border)',
                      },
                      success: {
                        iconTheme: {
                          primary: 'var(--chart-3)',
                          secondary: 'var(--card)',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: 'var(--destructive)',
                          secondary: 'var(--card)',
                        },
                      },
                    }}
                  />
                </GameProvider>
              </WebSocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)