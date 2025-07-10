import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
})
@Injectable()
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedUsers = new Map<string, string>(); // userId -> socketId
  private userSessions = new Map<string, Set<string>>(); // userId -> Set of sessionIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      
      // Allow test connections in development mode
      if (!token && process.env.NODE_ENV === 'development') {
        const isTestConnection = client.handshake.auth?.isTest || client.handshake.query?.test;
        if (isTestConnection) {
          client.userId = 'test-user-id';
          client.userRole = 'admin';
          
          // Join test rooms
          await client.join(`user:test-user-id`);
          await client.join(`role:admin`);
          
          this.logger.log(`Test connection established with socket ${client.id}`);
          
          client.emit('connected', {
            message: 'Successfully connected to real-time server (test mode)',
            timestamp: new Date().toISOString(),
          });
          
          return;
        }
      }
      
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      client.userId = payload.sub;
      client.userRole = payload.role;

      // Store user connection
      this.connectedUsers.set(payload.sub, client.id);

      // Join user-specific room
      await client.join(`user:${payload.sub}`);

      // Join role-specific room
      await client.join(`role:${payload.role}`);

      this.logger.log(`User ${payload.sub} connected with socket ${client.id}`);

      // Notify user is online
      this.server.emit('user:status', {
        userId: payload.sub,
        status: 'online',
        timestamp: new Date().toISOString(),
      });

      // Send connection confirmation
      client.emit('connected', {
        message: 'Successfully connected to real-time server',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.warn(`Connection rejected: Invalid token - ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      
      // Clean up user sessions
      this.userSessions.delete(client.userId);

      this.logger.log(`User ${client.userId} disconnected`);

      // Notify user is offline
      this.server.emit('user:status', {
        userId: client.userId,
        status: 'offline',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('join:session')
  async handleJoinSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { sessionId } = data;
    
    // Join session-specific room
    await client.join(`session:${sessionId}`);
    
    // Track user sessions
    if (!this.userSessions.has(client.userId)) {
      this.userSessions.set(client.userId, new Set());
    }
    this.userSessions.get(client.userId)!.add(sessionId);

    this.logger.log(`User ${client.userId} joined session ${sessionId}`);

    // Notify others in the session
    client.to(`session:${sessionId}`).emit('session:user-joined', {
      userId: client.userId,
      sessionId,
      timestamp: new Date().toISOString(),
    });

    client.emit('session:joined', {
      sessionId,
      message: 'Successfully joined session',
    });
  }

  @SubscribeMessage('leave:session')
  async handleLeaveSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const { sessionId } = data;
    
    // Leave session-specific room
    await client.leave(`session:${sessionId}`);
    
    // Remove from user sessions tracking
    if (this.userSessions.has(client.userId)) {
      this.userSessions.get(client.userId)!.delete(sessionId);
    }

    this.logger.log(`User ${client.userId} left session ${sessionId}`);

    // Notify others in the session
    client.to(`session:${sessionId}`).emit('session:user-left', {
      userId: client.userId,
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      recipientId?: string;
      sessionId?: string;
      content: string;
      messageType: 'text' | 'file' | 'system';
    },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      senderId: client.userId,
      content: data.content,
      messageType: data.messageType,
      timestamp: new Date().toISOString(),
      recipientId: data.recipientId,
      sessionId: data.sessionId,
    };

    if (data.sessionId) {
      // Send to session participants
      this.server.to(`session:${data.sessionId}`).emit('message:received', message);
      this.logger.log(`Message sent to session ${data.sessionId} by user ${client.userId}`);
    } else if (data.recipientId) {
      // Send to specific user
      this.server.to(`user:${data.recipientId}`).emit('message:received', message);
      // Also send back to sender for confirmation
      client.emit('message:sent', message);
      this.logger.log(`Private message sent from ${client.userId} to ${data.recipientId}`);
    } else {
      client.emit('error', { message: 'Message must have either sessionId or recipientId' });
    }
  }

  // Public methods for other services to emit events
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  emitToSession(sessionId: string, event: string, data: any) {
    this.server.to(`session:${sessionId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  emitToRole(role: string, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  emitNotification(userId: string, notification: {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    actionUrl?: string;
  }) {
    this.emitToUser(userId, 'notification:new', notification);
  }

  emitSessionUpdate(sessionId: string, update: {
    status?: string;
    message?: string;
    data?: any;
  }) {
    this.emitToSession(sessionId, 'session:updated', update);
  }

  broadcastUserStatus(userId: string, status: 'online' | 'offline' | 'busy' | 'away') {
    this.server.emit('user:status', {
      userId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  private extractTokenFromSocket(client: Socket): string | null {
    const token = client.handshake.auth?.token || 
                 client.handshake.headers?.authorization?.replace('Bearer ', '') ||
                 client.handshake.query?.token;
    
    return Array.isArray(token) ? token[0] : token;
  }
} 