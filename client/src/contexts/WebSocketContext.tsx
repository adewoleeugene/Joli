import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

interface WebSocketContextType {
  connectionStatus: ConnectionStatus
  sendMessage: (type: string, data: any) => void
  subscribe: (type: string, callback: (data: any) => void) => () => void
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

interface WebSocketProviderProps {
  children: ReactNode
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
const RECONNECT_INTERVAL = 3000
const MAX_RECONNECT_ATTEMPTS = 5

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [subscribers, setSubscribers] = useState<Map<string, Set<(data: any) => void>>>(new Map())
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isManualDisconnectRef = useRef(false)

  const connect = () => {
    if (!user || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    setConnectionStatus('connecting')
    
    try {
      const token = localStorage.getItem('token')
      const wsUrl = `${WS_URL}?token=${encodeURIComponent(token || '')}`
      
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0
        console.log('WebSocket connected')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      wsRef.current.onclose = (event) => {
        setConnectionStatus('disconnected')
        console.log('WebSocket disconnected:', event.code, event.reason)
        
        // Attempt to reconnect if not manually disconnected
        if (!isManualDisconnectRef.current && user && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++
          console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, RECONNECT_INTERVAL) as unknown as number
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setConnectionStatus('error')
          toast.error('Connection lost. Please refresh the page.')
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionStatus('error')
    }
  }

  const disconnect = () => {
    isManualDisconnectRef.current = true
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnectionStatus('disconnected')
  }

  const handleMessage = (message: WebSocketMessage) => {
    const typeSubscribers = subscribers.get(message.type)
    if (typeSubscribers) {
      typeSubscribers.forEach(callback => {
        try {
          callback(message.data)
        } catch (error) {
          console.error('Error in WebSocket message handler:', error)
        }
      })
    }
  }

  const sendMessage = (type: string, data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      }
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected. Message not sent:', { type, data })
    }
  }

  const subscribe = (type: string, callback: (data: any) => void) => {
    setSubscribers(prev => {
      const newSubscribers = new Map(prev)
      if (!newSubscribers.has(type)) {
        newSubscribers.set(type, new Set())
      }
      newSubscribers.get(type)!.add(callback)
      return newSubscribers
    })

    // Return unsubscribe function
    return () => {
      setSubscribers(prev => {
        const newSubscribers = new Map(prev)
        const typeSubscribers = newSubscribers.get(type)
        if (typeSubscribers) {
          typeSubscribers.delete(callback)
          if (typeSubscribers.size === 0) {
            newSubscribers.delete(type)
          }
        }
        return newSubscribers
      })
    }
  }

  // Connect when user is available
  useEffect(() => {
    if (user) {
      isManualDisconnectRef.current = false
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [user])

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, don't disconnect but stop reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      } else {
        // Page is visible, reconnect if needed
        if (user && connectionStatus === 'disconnected' && !isManualDisconnectRef.current) {
          connect()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, connectionStatus])

  const value: WebSocketContextType = {
    connectionStatus,
    sendMessage,
    subscribe,
    isConnected: connectionStatus === 'connected',
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}