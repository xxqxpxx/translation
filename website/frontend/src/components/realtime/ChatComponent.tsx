import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar,
  Divider,
} from '@mui/material';
import { Send as SendIcon, Circle as CircleIcon } from '@mui/icons-material';
import { useRealtime } from '../../contexts/RealtimeContext';

interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  sessionId?: string;
  content: string;
  messageType: 'text' | 'file' | 'system';
  timestamp: string;
}

interface ChatComponentProps {
  sessionId?: string;
  recipientId?: string;
  title?: string;
  height?: string | number;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  sessionId,
  recipientId,
  title = 'Chat',
  height = 400,
}) => {
  const { isConnected, sendMessage, onMessage } = useRealtime();
  const [messageText, setMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Listen for messages
  useEffect(() => {
    const unsubscribe = onMessage((message: Message) => {
      // Only show messages for this chat (session or private conversation)
      const isForThisChat = sessionId 
        ? message.sessionId === sessionId
        : (message.recipientId === recipientId || message.senderId === recipientId);

      if (isForThisChat) {
        setChatMessages(prev => [...prev, message]);
      }
    });

    return unsubscribe;
  }, [onMessage, sessionId, recipientId]);

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    sendMessage(messageText, recipientId, sessionId);
    setMessageText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageSender = (message: Message) => {
    // In a real app, you'd fetch user details from your user service
    return message.senderId.substring(0, 8); // Show first 8 chars of user ID
  };

  return (
    <Paper elevation={2} sx={{ height, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{title}</Typography>
          <Chip 
            icon={<CircleIcon sx={{ fontSize: 8 }} />}
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            size="small"
          />
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <List dense>
          {chatMessages.map((message) => (
            <ListItem 
              key={message.id}
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                py: 0.5,
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: '100%',
                mb: 0.5,
              }}>
                <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                  {getMessageSender(message).charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="caption" color="text.secondary">
                  {getMessageSender(message)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {formatTime(message.timestamp)}
                </Typography>
              </Box>
              
              <Box sx={{ 
                bgcolor: message.messageType === 'system' ? 'grey.100' : 'background.paper',
                p: 1,
                borderRadius: 1,
                width: '100%',
                border: message.messageType === 'system' ? '1px dashed' : 'none',
                borderColor: 'grey.300',
              }}>
                <Typography 
                  variant="body2"
                  sx={{ 
                    fontStyle: message.messageType === 'system' ? 'italic' : 'normal',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {message.content}
                </Typography>
              </Box>
            </ListItem>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* Input */}
      <Divider />
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            variant="outlined"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
            size="small"
          />
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!isConnected || !messageText.trim()}
          >
            <SendIcon />
          </IconButton>
        </Box>
        {!isConnected && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Not connected to real-time server
          </Typography>
        )}
      </Box>
    </Paper>
  );
}; 