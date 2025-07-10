import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  Avatar,
  Tooltip,
  Badge,
  Typography,
} from '@mui/material';
import {
  Circle as CircleIcon,
  VideocamOutlined as VideoIcon,
  PhoneOutlined as PhoneIcon,
  PersonOutlined as PersonIcon,
} from '@mui/icons-material';
import { useRealtime } from '../../contexts/RealtimeContext';

interface UserStatusIndicatorProps {
  userId: string;
  userName?: string;
  avatar?: string;
  showName?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'avatar' | 'chip' | 'dot';
}

export const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  userId,
  userName,
  avatar,
  showName = false,
  size = 'medium',
  variant = 'avatar',
}) => {
  const { userStatuses, onUserStatusChange } = useRealtime();
  const [userStatus, setUserStatus] = useState<{
    status: 'online' | 'offline' | 'busy' | 'away';
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    // Get initial status
    const status = userStatuses.get(userId);
    if (status) {
      setUserStatus(status);
    }

    // Listen for status changes
    const unsubscribe = onUserStatusChange((statusUpdate) => {
      if (statusUpdate.userId === userId) {
        setUserStatus(statusUpdate);
      }
    });

    return unsubscribe;
  }, [userId, userStatuses, onUserStatusChange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'busy':
        return 'error';
      case 'away':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CircleIcon sx={{ fontSize: 8, color: 'success.main' }} />;
      case 'busy':
        return <CircleIcon sx={{ fontSize: 8, color: 'error.main' }} />;
      case 'away':
        return <CircleIcon sx={{ fontSize: 8, color: 'warning.main' }} />;
      default:
        return <CircleIcon sx={{ fontSize: 8, color: 'grey.400' }} />;
    }
  };

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getTooltipText = () => {
    if (!userStatus) return 'Status unknown';
    
    const statusText = userStatus.status.charAt(0).toUpperCase() + userStatus.status.slice(1);
    const timeText = userStatus.status === 'offline' 
      ? `Last seen ${formatLastSeen(userStatus.timestamp)}`
      : formatLastSeen(userStatus.timestamp);
    
    return `${statusText} • ${timeText}`;
  };

  if (variant === 'dot') {
    return (
      <Tooltip title={getTooltipText()}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
          {getStatusIcon(userStatus?.status || 'offline')}
        </Box>
      </Tooltip>
    );
  }

  if (variant === 'chip') {
    return (
      <Tooltip title={getTooltipText()}>
        <Chip
          icon={getStatusIcon(userStatus?.status || 'offline')}
          label={userStatus?.status || 'offline'}
          size={size}
          color={getStatusColor(userStatus?.status || 'offline') as any}
          variant="outlined"
        />
      </Tooltip>
    );
  }

  // Avatar variant (default)
  const avatarSize = size === 'small' ? 32 : size === 'large' ? 56 : 40;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Tooltip title={getTooltipText()}>
        <Badge
          overlap="circular"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          badgeContent={
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: userStatus?.status === 'online' ? 'success.main' :
                         userStatus?.status === 'busy' ? 'error.main' :
                         userStatus?.status === 'away' ? 'warning.main' : 'grey.400',
                border: 2,
                borderColor: 'background.paper',
              }}
            />
          }
        >
          <Avatar
            src={avatar}
            sx={{ width: avatarSize, height: avatarSize }}
          >
            {userName ? userName.charAt(0).toUpperCase() : <PersonIcon />}
          </Avatar>
        </Badge>
      </Tooltip>
      
      {showName && (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {userName || `User ${userId.substring(0, 8)}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {userStatus?.status || 'offline'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

// Session status indicator for live sessions
interface SessionStatusIndicatorProps {
  sessionId: string;
  sessionType?: 'video' | 'phone' | 'in_person';
  isLive?: boolean;
  participantCount?: number;
}

export const SessionStatusIndicator: React.FC<SessionStatusIndicatorProps> = ({
  sessionId,
  sessionType = 'video',
  isLive = false,
  participantCount = 0,
}) => {
  const { onSessionUpdate } = useRealtime();
  const [sessionStatus, setSessionStatus] = useState<string>('inactive');

  useEffect(() => {
    const unsubscribe = onSessionUpdate((update) => {
      if (update.sessionId === sessionId && update.status) {
        setSessionStatus(update.status);
      }
    });

    return unsubscribe;
  }, [sessionId, onSessionUpdate]);

  const getSessionIcon = () => {
    switch (sessionType) {
      case 'video':
        return <VideoIcon fontSize="small" />;
      case 'phone':
        return <PhoneIcon fontSize="small" />;
      default:
        return <PersonIcon fontSize="small" />;
    }
  };

  const getStatusColor = () => {
    if (isLive || sessionStatus === 'in_progress') return 'success';
    if (sessionStatus === 'confirmed') return 'warning';
    return 'default';
  };

  return (
    <Tooltip title={`Session ${sessionStatus} • ${participantCount} participant${participantCount !== 1 ? 's' : ''}`}>
      <Chip
        icon={getSessionIcon()}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isLive && (
              <CircleIcon sx={{ fontSize: 8, color: 'error.main', animation: 'pulse 1.5s infinite' }} />
            )}
            {isLive ? 'LIVE' : sessionStatus.toUpperCase()}
            {participantCount > 0 && (
              <Typography variant="caption" sx={{ ml: 0.5 }}>
                ({participantCount})
              </Typography>
            )}
          </Box>
        }
        size="small"
        color={getStatusColor() as any}
        variant={isLive ? 'filled' : 'outlined'}
        sx={{
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.5 },
            '100%': { opacity: 1 },
          },
        }}
      />
    </Tooltip>
  );
}; 