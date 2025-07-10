import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Divider,
  Alert,
} from '@mui/material';
import {
  OnlinePredicationOutlined as OnlineIcon,
  MessageOutlined as MessageIcon,
  NotificationsActiveOutlined as NotificationIcon,
  VideoCallOutlined as SessionIcon,
} from '@mui/icons-material';
import { useRealtime } from '../../contexts/RealtimeContext';
import { ChatComponent } from './ChatComponent';
import { UserStatusIndicator, SessionStatusIndicator } from './UserStatusIndicator';

export const RealtimeDashboard: React.FC = () => {
  const {
    isConnected,
    connectedUsers,
    messages,
    notifications,
    currentSessions,
    sendMessage,
    joinSession,
    onMessage,
    onNotification,
    onSessionUpdate,
    onUserStatusChange,
  } = useRealtime();

  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'message' | 'notification' | 'session' | 'user_status';
    content: string;
    timestamp: string;
  }>>([]);

  // Collect recent activity from all sources
  useEffect(() => {
    const unsubscribeMessage = onMessage((message) => {
      setRecentActivity(prev => [{
        id: `msg-${message.id}`,
        type: 'message',
        content: `New message: ${message.content.substring(0, 50)}...`,
        timestamp: message.timestamp,
      }, ...prev.slice(0, 9)]);
    });

    const unsubscribeNotification = onNotification((notification) => {
      setRecentActivity(prev => [{
        id: `notif-${notification.id}`,
        type: 'notification',
        content: `${notification.title}: ${notification.message.substring(0, 50)}...`,
        timestamp: notification.timestamp,
      }, ...prev.slice(0, 9)]);
    });

    const unsubscribeSession = onSessionUpdate((update) => {
      setRecentActivity(prev => [{
        id: `session-${Date.now()}`,
        type: 'session',
        content: update.message || `Session ${update.sessionId} updated`,
        timestamp: update.timestamp,
      }, ...prev.slice(0, 9)]);
    });

    const unsubscribeUserStatus = onUserStatusChange((status) => {
      setRecentActivity(prev => [{
        id: `status-${status.userId}-${Date.now()}`,
        type: 'user_status',
        content: `User ${status.userId.substring(0, 8)} is now ${status.status}`,
        timestamp: status.timestamp,
      }, ...prev.slice(0, 9)]);
    });

    return () => {
      unsubscribeMessage();
      unsubscribeNotification();
      unsubscribeSession();
      unsubscribeUserStatus();
    };
  }, [onMessage, onNotification, onSessionUpdate, onUserStatusChange]);

  const handleTestMessage = () => {
    sendMessage('Hello! This is a test message from the dashboard.', undefined, undefined, 'text');
  };

  const handleJoinTestSession = () => {
    const testSessionId = 'test-session-123';
    joinSession(testSessionId);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageIcon color="primary" fontSize="small" />;
      case 'notification':
        return <NotificationIcon color="warning" fontSize="small" />;
      case 'session':
        return <SessionIcon color="success" fontSize="small" />;
      case 'user_status':
        return <OnlineIcon color="info" fontSize="small" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Real-time Communication Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Monitor live updates, messages, and user activity
      </Typography>

      {/* Connection Status */}
      <Alert 
        severity={isConnected ? 'success' : 'error'} 
        sx={{ mb: 3 }}
        icon={<OnlineIcon />}
      >
        <Typography variant="body2">
          {isConnected 
            ? 'Connected to real-time server • Live updates active'
            : 'Disconnected from real-time server • Updates may be delayed'
          }
        </Typography>
      </Alert>

      <Grid container spacing={3}>
        {/* Statistics Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Connected Users
                  </Typography>
                  <Typography variant="h4">
                    {connectedUsers.length}
                  </Typography>
                </Box>
                <OnlineIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Messages
                  </Typography>
                  <Typography variant="h4">
                    {messages.length}
                  </Typography>
                </Box>
                <MessageIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Notifications
                  </Typography>
                  <Typography variant="h4">
                    {notifications.length}
                  </Typography>
                </Box>
                <NotificationIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Active Sessions
                  </Typography>
                  <Typography variant="h4">
                    {currentSessions.size}
                  </Typography>
                </Box>
                <SessionIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 400 }}>
            <CardHeader title="Recent Activity" />
            <CardContent sx={{ pt: 0, height: 300, overflow: 'auto' }}>
              {recentActivity.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
                  No recent activity
                </Typography>
              ) : (
                <List dense>
                  {recentActivity.map((activity) => (
                    <ListItem key={activity.id} sx={{ px: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
                        {getActivityIcon(activity.type)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" noWrap>
                            {activity.content}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(activity.timestamp)}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Chat Component */}
        <Grid item xs={12} md={8}>
          <ChatComponent
            title="Global Chat"
            height={400}
          />
        </Grid>

        {/* Connected Users */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Connected Users" />
            <CardContent>
              {connectedUsers.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No users currently connected
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {connectedUsers.map((userId) => (
                    <UserStatusIndicator
                      key={userId}
                      userId={userId}
                      showName
                      size="small"
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Testing Controls */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Testing Controls" />
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Test real-time functionality
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleTestMessage}
                  disabled={!isConnected}
                  startIcon={<MessageIcon />}
                >
                  Send Test Message
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={handleJoinTestSession}
                  disabled={!isConnected}
                  startIcon={<SessionIcon />}
                >
                  Join Test Session
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Sessions
              </Typography>
              {currentSessions.size === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No active sessions
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Array.from(currentSessions).map((sessionId) => (
                    <SessionStatusIndicator
                      key={sessionId}
                      sessionId={sessionId}
                      isLive={true}
                      participantCount={Math.floor(Math.random() * 5) + 1}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}; 