import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RealtimeGateway } from './realtime.gateway';

export interface Message {
  id: string;
  senderId: string;
  recipientId?: string;
  sessionId?: string;
  content: string;
  messageType: 'text' | 'file' | 'system';
  timestamp: Date;
  isRead?: boolean;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private messageHistory = new Map<string, Message[]>(); // sessionId/conversationId -> messages
  private notifications = new Map<string, Notification[]>(); // userId -> notifications

  constructor(
    private readonly realtimeGateway: RealtimeGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {
    // Listen to system events and broadcast them
    this.setupEventListeners();
  }

  // === MESSAGE MANAGEMENT ===

  async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const fullMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    // Store message in memory (in production, this should be in database)
    const conversationKey = message.sessionId || `private_${[message.senderId, message.recipientId].sort().join('_')}`;
    
    if (!this.messageHistory.has(conversationKey)) {
      this.messageHistory.set(conversationKey, []);
    }
    this.messageHistory.get(conversationKey)!.push(fullMessage);

    // Emit via WebSocket
    if (message.sessionId) {
      this.realtimeGateway.emitToSession(message.sessionId, 'message:received', fullMessage);
    } else if (message.recipientId) {
      this.realtimeGateway.emitToUser(message.recipientId, 'message:received', fullMessage);
      this.realtimeGateway.emitToUser(message.senderId, 'message:sent', fullMessage);
    }

    this.logger.log(`Message sent: ${fullMessage.id}`);
    return fullMessage;
  }

  async getMessageHistory(sessionId?: string, userId1?: string, userId2?: string): Promise<Message[]> {
    const conversationKey = sessionId || `private_${[userId1, userId2].sort().join('_')}`;
    return this.messageHistory.get(conversationKey) || [];
  }

  async markMessagesAsRead(conversationKey: string, userId: string): Promise<void> {
    const messages = this.messageHistory.get(conversationKey);
    if (messages) {
      messages
        .filter(msg => msg.recipientId === userId && !msg.isRead)
        .forEach(msg => {
          msg.isRead = true;
        });
    }
  }

  // === NOTIFICATION MANAGEMENT ===

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const fullNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      isRead: false,
    };

    // Store notification
    if (!this.notifications.has(notification.userId)) {
      this.notifications.set(notification.userId, []);
    }
    this.notifications.get(notification.userId)!.push(fullNotification);

    // Emit real-time notification
    this.realtimeGateway.emitNotification(notification.userId, fullNotification);

    this.logger.log(`Notification created for user ${notification.userId}: ${fullNotification.title}`);
    return fullNotification;
  }

  async getUserNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    
    if (unreadOnly) {
      return userNotifications.filter(notif => !notif.isRead);
    }
    
    return userNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(notif => notif.id === notificationId);
    
    if (notification && !notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      
      this.realtimeGateway.emitToUser(userId, 'notification:read', {
        notificationId,
        readAt: notification.readAt,
      });
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const userNotifications = this.notifications.get(userId) || [];
    const unreadNotifications = userNotifications.filter(notif => !notif.isRead);
    
    unreadNotifications.forEach(notif => {
      notif.isRead = true;
      notif.readAt = new Date();
    });

    if (unreadNotifications.length > 0) {
      this.realtimeGateway.emitToUser(userId, 'notifications:all-read', {
        count: unreadNotifications.length,
        timestamp: new Date(),
      });
    }
  }

  // === SESSION MANAGEMENT ===

  async updateSessionStatus(sessionId: string, status: string, data?: any): Promise<void> {
    this.realtimeGateway.emitSessionUpdate(sessionId, {
      status,
      data,
      message: `Session status updated to ${status}`,
    });

    this.logger.log(`Session ${sessionId} status updated to: ${status}`);
  }

  async notifySessionParticipants(sessionId: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): Promise<void> {
    this.realtimeGateway.emitToSession(sessionId, 'session:notification', {
      message,
      type,
    });
  }

  // === USER STATUS MANAGEMENT ===

  async updateUserStatus(userId: string, status: 'online' | 'offline' | 'busy' | 'away'): Promise<void> {
    this.realtimeGateway.broadcastUserStatus(userId, status);
    this.logger.log(`User ${userId} status updated to: ${status}`);
  }

  getConnectedUsers(): string[] {
    return this.realtimeGateway.getConnectedUsers();
  }

  isUserOnline(userId: string): boolean {
    return this.realtimeGateway.isUserConnected(userId);
  }

  // === TRANSLATION COLLABORATION ===

  async notifyTranslationUpdate(translationId: string, update: {
    type: 'progress' | 'completed' | 'review' | 'comment';
    message: string;
    progress?: number;
    data?: any;
  }): Promise<void> {
    // Emit to all users associated with the translation
    this.realtimeGateway.emitToRole('admin', 'translation:updated', {
      translationId,
      ...update,
    });

    // TODO: In production, emit to specific users (client, translator, reviewer)
    // based on translation entity relationships
  }

  async shareTranslationProgress(translationId: string, progress: number, message?: string): Promise<void> {
    await this.notifyTranslationUpdate(translationId, {
      type: 'progress',
      message: message || `Translation is ${progress}% complete`,
      progress,
    });
  }

  // === INTERPRETATION SESSION REAL-TIME FEATURES ===

  async startSessionLiveUpdates(sessionId: string): Promise<void> {
    this.realtimeGateway.emitToSession(sessionId, 'session:live-started', {
      message: 'Live session tracking started',
    });
  }

  async endSessionLiveUpdates(sessionId: string): Promise<void> {
    this.realtimeGateway.emitToSession(sessionId, 'session:live-ended', {
      message: 'Live session tracking ended',
    });
  }

  async broadcastToInterpreters(message: string, data?: any): Promise<void> {
    this.realtimeGateway.emitToRole('interpreter', 'interpreter:broadcast', {
      message,
      data,
    });
  }

  async broadcastToClients(message: string, data?: any): Promise<void> {
    this.realtimeGateway.emitToRole('client', 'client:broadcast', {
      message,
      data,
    });
  }

  // === EVENT LISTENERS ===

  private setupEventListeners(): void {
    // Listen to translation events
    this.eventEmitter.on('translation.created', (payload) => {
      this.notifyTranslationUpdate(payload.id, {
        type: 'progress',
        message: 'New translation request created',
        data: payload,
      });
    });

    this.eventEmitter.on('translation.assigned', (payload) => {
      this.createNotification({
        userId: payload.translatorId,
        title: 'New Translation Assignment',
        message: `You have been assigned a new translation: ${payload.title}`,
        type: 'info',
        actionUrl: `/translations/${payload.id}`,
      });
    });

    this.eventEmitter.on('translation.completed', (payload) => {
      this.createNotification({
        userId: payload.clientId,
        title: 'Translation Completed',
        message: `Your translation "${payload.title}" has been completed`,
        type: 'success',
        actionUrl: `/translations/${payload.id}`,
      });
    });

    // Listen to session events
    this.eventEmitter.on('session.created', (payload) => {
      this.createNotification({
        userId: payload.interpreterId,
        title: 'New Session Request',
        message: `You have a new interpretation session scheduled`,
        type: 'info',
        actionUrl: `/sessions/${payload.id}`,
      });
    });

    this.eventEmitter.on('session.confirmed', (payload) => {
      this.createNotification({
        userId: payload.clientId,
        title: 'Session Confirmed',
        message: `Your interpretation session has been confirmed`,
        type: 'success',
        actionUrl: `/sessions/${payload.id}`,
      });

      this.updateSessionStatus(payload.id, 'confirmed');
    });

    this.eventEmitter.on('session.started', (payload) => {
      this.updateSessionStatus(payload.id, 'in_progress');
      this.startSessionLiveUpdates(payload.id);
    });

    this.eventEmitter.on('session.completed', (payload) => {
      this.updateSessionStatus(payload.id, 'completed');
      this.endSessionLiveUpdates(payload.id);
      
      this.createNotification({
        userId: payload.clientId,
        title: 'Session Completed',
        message: 'Your interpretation session has been completed',
        type: 'success',
        actionUrl: `/sessions/${payload.id}`,
      });
    });

    this.eventEmitter.on('session.cancelled', (payload) => {
      this.updateSessionStatus(payload.id, 'cancelled');
      
      // Notify all participants
      [payload.clientId, payload.interpreterId].filter(Boolean).forEach(userId => {
        this.createNotification({
          userId,
          title: 'Session Cancelled',
          message: `Session has been cancelled: ${payload.reason || 'No reason provided'}`,
          type: 'warning',
          actionUrl: `/sessions/${payload.id}`,
        });
      });
    });

    // Listen to user events
    this.eventEmitter.on('user.login', (payload) => {
      this.updateUserStatus(payload.userId, 'online');
    });

    this.eventEmitter.on('user.logout', (payload) => {
      this.updateUserStatus(payload.userId, 'offline');
    });

    this.logger.log('Real-time event listeners configured');
  }
} 