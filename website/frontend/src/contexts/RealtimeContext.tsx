import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  sessionId?: string;
  content: string;
  messageType: 'text' | 'file' | 'system';
  timestamp: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  timestamp: string;
}

interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'busy' | 'away';
  timestamp: string;
}

interface SessionUpdate {
  sessionId?: string;
  status?: string;
  message?: string;
  data?: any;
  timestamp: string;
}

interface RealtimeContextType {
  // Connection status
  isConnected: boolean;
  socket: Socket | null;

  // User management
  connectedUsers: string[];
  userStatuses: Map<string, UserStatus>;

  // Messages
  messages: Message[];
  sendMessage: (content: string, recipientId?: string, sessionId?: string, messageType?: 'text' | 'file') => void;

  // Notifications
  notifications: Notification[];
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;

  // Session management
  joinSession: (sessionId: string) => void;
  leaveSession: (sessionId: string) => void;
  currentSessions: Set<string>;

  // Event listeners
  onMessage: (callback: (message: Message) => void) => () => void;
  onNotification: (callback: (notification: Notification) => void) => () => void;
  onSessionUpdate: (callback: (update: SessionUpdate) => void) => () => void;
  onUserStatusChange: (callback: (status: UserStatus) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export const RealtimeProvider: React.FC<RealtimeProviderProps> = ({ children }) => {
  const { getToken, userId } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentSessions, setCurrentSessions] = useState<Set<string>>(new Set());

  // Event listeners storage
  const messageListeners = useRef<((message: Message) => void)[]>([]);
  const notificationListeners = useRef<((notification: Notification) => void)[]>([]);
  const sessionUpdateListeners = useRef<((update: SessionUpdate) => void)[]>([]);
  const userStatusListeners = useRef<((status: UserStatus) => void)[]>([]);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;

    const initializeSocket = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const socketInstance = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
          auth: {
            token,
          },
          transports: ['websocket'],
        });

        socketInstance.on('connect', () => {
          console.log('Connected to real-time server');
          setIsConnected(true);
          toast.success('Connected to real-time updates');
        });

        socketInstance.on('disconnect', () => {
          console.log('Disconnected from real-time server');
          setIsConnected(false);
          toast.error('Disconnected from real-time updates');
        });

        socketInstance.on('error', (error) => {
          console.error('Socket error:', error);
          toast.error('Real-time connection error');
        });

        // Message events
        socketInstance.on('message:received', (message: Message) => {
          setMessages(prev => [...prev, message]);
          messageListeners.current.forEach(listener => listener(message));
          
          // Show toast for new messages (except from current user)
          if (message.senderId !== userId) {
            toast.success(`New message: ${message.content.substring(0, 50)}...`);
          }
        });

        socketInstance.on('message:sent', (message: Message) => {
          setMessages(prev => [...prev, message]);
        });

        // Notification events
        socketInstance.on('notification:new', (notification: Notification) => {
          setNotifications(prev => [notification, ...prev]);
          notificationListeners.current.forEach(listener => listener(notification));
          
          // Show toast notification
          const toastOptions = {
            duration: 5000,
            action: notification.actionUrl ? {
              label: 'View',
              onClick: () => window.location.href = notification.actionUrl!,
            } : undefined,
          };

          switch (notification.type) {
            case 'success':
              toast.success(notification.message, toastOptions);
              break;
            case 'warning':
              toast.error(notification.message, toastOptions);
              break;
            case 'error':
              toast.error(notification.message, toastOptions);
              break;
            default:
              toast(notification.message, toastOptions);
          }
        });

        socketInstance.on('notification:read', ({ notificationId }) => {
          setNotifications(prev => 
            prev.map(notif => 
              notif.id === notificationId 
                ? { ...notif, isRead: true }
                : notif
            )
          );
        });

        socketInstance.on('notifications:all-read', () => {
          setNotifications(prev => 
            prev.map(notif => ({ ...notif, isRead: true }))
          );
        });

        // Session events
        socketInstance.on('session:joined', ({ sessionId }) => {
          setCurrentSessions(prev => new Set(prev).add(sessionId));
          console.log(`Joined session: ${sessionId}`);
        });

        socketInstance.on('session:user-joined', ({ userId: joinedUserId, sessionId }) => {
          console.log(`User ${joinedUserId} joined session ${sessionId}`);
        });

        socketInstance.on('session:user-left', ({ userId: leftUserId, sessionId }) => {
          console.log(`User ${leftUserId} left session ${sessionId}`);
        });

        socketInstance.on('session:updated', (update: SessionUpdate) => {
          sessionUpdateListeners.current.forEach(listener => listener(update));
          if (update.message) {
            toast(update.message);
          }
        });

        socketInstance.on('session:notification', ({ message, type }) => {
          switch (type) {
            case 'success':
              toast.success(message);
              break;
            case 'warning':
              toast.error(message);
              break;
            case 'error':
              toast.error(message);
              break;
            default:
              toast(message);
          }
        });

        // User status events
        socketInstance.on('user:status', (status: UserStatus) => {
          setUserStatuses(prev => new Map(prev).set(status.userId, status));
          userStatusListeners.current.forEach(listener => listener(status));
        });

        socketInstance.on('connected', ({ message }) => {
          console.log('Connection confirmed:', message);
        });

        setSocket(socketInstance);

      } catch (error) {
        console.error('Failed to initialize socket:', error);
        toast.error('Failed to connect to real-time server');
      }
    };

    initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId, getToken]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const sendMessage = useCallback((
    content: string,
    recipientId?: string,
    sessionId?: string,
    messageType: 'text' | 'file' = 'text'
  ) => {
    if (!socket || !isConnected) {
      toast.error('Not connected to real-time server');
      return;
    }

    socket.emit('message:send', {
      content,
      recipientId,
      sessionId,
      messageType,
    });
  }, [socket, isConnected]);

  const joinSession = useCallback((sessionId: string) => {
    if (!socket || !isConnected) {
      toast.error('Not connected to real-time server');
      return;
    }

    socket.emit('join:session', { sessionId });
  }, [socket, isConnected]);

  const leaveSession = useCallback((sessionId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('leave:session', { sessionId });
    setCurrentSessions(prev => {
      const newSet = new Set(prev);
      newSet.delete(sessionId);
      return newSet;
    });
  }, [socket, isConnected]);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    // TODO: Call API to mark as read
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    // TODO: Call API to mark all as read
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  }, []);

  // Event listener registration
  const onMessage = useCallback((callback: (message: Message) => void) => {
    messageListeners.current.push(callback);
    return () => {
      messageListeners.current = messageListeners.current.filter(l => l !== callback);
    };
  }, []);

  const onNotification = useCallback((callback: (notification: Notification) => void) => {
    notificationListeners.current.push(callback);
    return () => {
      notificationListeners.current = notificationListeners.current.filter(l => l !== callback);
    };
  }, []);

  const onSessionUpdate = useCallback((callback: (update: SessionUpdate) => void) => {
    sessionUpdateListeners.current.push(callback);
    return () => {
      sessionUpdateListeners.current = sessionUpdateListeners.current.filter(l => l !== callback);
    };
  }, []);

  const onUserStatusChange = useCallback((callback: (status: UserStatus) => void) => {
    userStatusListeners.current.push(callback);
    return () => {
      userStatusListeners.current = userStatusListeners.current.filter(l => l !== callback);
    };
  }, []);

  const value: RealtimeContextType = {
    isConnected,
    socket,
    connectedUsers: [], // This will be updated by the backend
    userStatuses,
    messages,
    sendMessage,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    joinSession,
    leaveSession,
    currentSessions,
    onMessage,
    onNotification,
    onSessionUpdate,
    onUserStatusChange,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}; 