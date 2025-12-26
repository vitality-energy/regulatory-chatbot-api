import WebSocket from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger';
import { ChatService, ChatRequest } from './chatService';
import { getResearchResult } from '../utils/researchHelper';
import { MessageType } from '../utils/types';
import { AuthService } from './authService';

type AuthenticatedWebSocket = WebSocket & {
  userId?: string;
  sessionId?: string;
  roomId?: string;
  isAuthenticated: boolean;
  conversationHistory: Array<{role: 'user' | 'assistant', content: string}>;
  lastActivity: Date;
}

interface UserRoom {
  roomId: string;
  userId: string;
  sessions: Set<AuthenticatedWebSocket>;
  createdAt: Date;
  lastActivity: Date;
}

interface WebSocketMessage {
  type: MessageType | 'auth' | 'research_update' | 'session_terminated';
  content?: string;
  timestamp: string;
  message_id?: string;
  error?: string;
  citations?: any[];
  research_pending?: boolean;
  token?: string;
  key_developments?: any[];
}

export class WebSocketService {
  private wss: WebSocket.Server;
  private clients: Map<string, AuthenticatedWebSocket> = new Map(); // sessionId -> WebSocket
  private userRooms: Map<string, UserRoom> = new Map(); // userId -> UserRoom
  
  constructor(server: Server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: AuthenticatedWebSocket, request) => {
      this.handleConnection(ws, request);
    });

    // Cleanup inactive rooms every 30 minutes
    setInterval(() => this.cleanupInactiveRooms(), 30 * 60 * 1000);

    logger.info('WebSocket server initialized on path /ws');
  }

  private async authenticateConnection(ws: AuthenticatedWebSocket, token: string): Promise<boolean> {
    try {
      const decoded = AuthService.verifyToken(token);
      ws.userId = decoded.userId || decoded.sub;
      
      // Use sessionId from token, fallback to jti or a portion of the token signature
      ws.sessionId = decoded.sessionId || decoded.jti || 
        token.split('.').pop()?.substring(0, 16) || 'anonymous';
        
      ws.roomId = `room_${ws.userId}`;
      ws.isAuthenticated = true;
      ws.conversationHistory = [];
      ws.lastActivity = new Date();
      
      // Store the authenticated connection
      if (ws.sessionId) {
        this.clients.set(ws.sessionId, ws);
      }
      
      // Create or join user room
      this.joinUserRoom(ws);
      
      logger.info(`WebSocket client authenticated: ${ws.userId} joined room: ${ws.roomId}`);
      return true;
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, _request: any) {
    ws.isAuthenticated = false;
    ws.conversationHistory = [];
    
    logger.info('New WebSocket connection established');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Error parsing WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      logger.info(`WebSocket connection closed for session: ${ws.sessionId}`);
      if (ws.sessionId) {
        this.clients.delete(ws.sessionId);
      }
      // Remove from user room
      this.leaveUserRoom(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      // Remove from user room on error
      this.leaveUserRoom(ws);
    });
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    try {
      // Handle authentication
      if (message.type === 'auth' && message.token) {
        const isAuthenticated = await this.authenticateConnection(ws, message.token);
        if (isAuthenticated) {
          // Send to user's room since they're now authenticated
          this.sendToUserRoom(ws.userId!, {
            type: MessageType.BOT_MESSAGE,
            content: 'WebSocket authenticated successfully',
            timestamp: new Date().toISOString()
          });
        } else {
          this.sendError(ws, 'Authentication failed');
          ws.close();
        }
        return;
      }

      // Require authentication for other message types
      if (!ws.isAuthenticated) {
        this.sendError(ws, 'Please authenticate first');
        return;
      }

      // Update room activity for authenticated messages
      this.updateRoomActivity(ws);

      // Handle chat messages
      if (message.type === 'user_message' && message.content) {
        await this.handleChatMessage(ws, message);
      } else {
        this.sendErrorToRoom(ws, 'Invalid message type or missing content');
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      this.sendErrorToRoom(ws, 'Error processing message');
    }
  }

  private updateRoomActivity(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      const room = this.userRooms.get(ws.userId);
      if (room) {
        room.lastActivity = new Date();
      }
    }
    ws.lastActivity = new Date();
  }

  private async handleChatMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    try {
      // Send typing indicator to user's room (all their sessions)
      this.sendToUserRoom(ws.userId!, {
        type: MessageType.AI_TYPING,
        content: '',
        timestamp: new Date().toISOString()
      });

      // Add user message to conversation history
      ws.conversationHistory.push({
        role: 'user',
        content: message.content!
      });

      // Prepare chat request with full conversation history
      const chatRequest: ChatRequest = {
        messages: [...ws.conversationHistory],
        userLocation: 'Unknown' // Can be enhanced later
      };

      // Ensure userId and sessionId are available
      if (!ws.userId || !ws.sessionId) {
        logger.error('Missing userId or sessionId in authenticated WebSocket connection');
        this.sendError(ws, 'Authentication error: missing user or session ID');
        return;
      }

      // Process chat request
      const response = await ChatService.processChatRequest(
        chatRequest,
        ws.userId,
        ws.sessionId
      );

      // Add assistant response to conversation history
      const responseContent = typeof response.response === 'string'
        ? response.response 
        : response.response.response;
      
      ws.conversationHistory.push({
        role: 'assistant',
        content: responseContent
      });


      const messageToSend = {
        content: responseContent,
        timestamp: response.timestamp,
        message_id: response.message_id,
      }
      

      // Send bot response to user's room (all their sessions)
      this.sendToUserRoom(ws.userId!, {
        type: MessageType.BOT_MESSAGE,
        citations: typeof response.response === 'object' ? response.response.citations || [] : [],
        ...messageToSend,
      });

      // If research is pending, start polling for results
      if (response.research_pending && response.message_id) {
        //send a research update event to user's room
        this.sendToUserRoom(ws.userId!, {
          type: 'research_update',
          ...messageToSend,
          research_pending: response.research_pending,
        });
        this.startResearchPolling(ws, response.message_id);
      }

    } catch (error) {
      logger.error('Error handling chat message:', error);
      this.sendErrorToRoom(ws, 'Error processing your message');
    }
  }

  private async startResearchPolling(ws: AuthenticatedWebSocket, messageId: string) {
    const maxAttempts = 300; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      attempts++;
      
      try {
        const result = getResearchResult(messageId);
        
        if (result && result.status === 'completed') {
          const newMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          //send a research update event to user's room
          this.sendResearchUpdateToUserRoom(ws.userId!, {
            type: 'research_update',
            // content: result.research_results || '',
            timestamp: new Date().toISOString(),
            research_pending: false,
            message_id: messageId,
            // citations: result.citations || [],
          });

          //send event to start typing animation
          this.sendToUserRoom(ws.userId!, {
            type: MessageType.AI_TYPING,
            content: '',
            timestamp: new Date().toISOString()
          });

          this.sendToUserRoom(ws.userId!, {
            type: MessageType.BOT_MESSAGE,
            content: result.research_results || '',
            timestamp: new Date().toISOString(),
            message_id: newMessageId,
            citations: result.citations || [],
            key_developments: result.key_developments || []
          });
          
          // Update conversation history with the final result
          if (ws.conversationHistory.length > 0) {
            ws.conversationHistory[ws.conversationHistory.length - 1].content = result.research_results || '';
          }
          return;
        } else if (result && result.status === 'failed') {
          const newMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          this.sendToUserRoom(ws.userId!, {
            type: MessageType.BOT_MESSAGE,
            content: 'Additional research could not be completed.',
            timestamp: new Date().toISOString(),
            message_id: newMessageId,
            error: result.error
          });
          return;
        }

        // Still pending, continue polling
        if (attempts < maxAttempts && ws.readyState === WebSocket.OPEN) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          logger.warn(`Research polling timed out for message ${messageId}`);
        }
      } catch (error) {
        logger.error(`Error polling research for ${messageId}:`, error);
      }
    };

    // Start polling after 2 seconds
    setTimeout(poll, 2000);
  }

  private sendMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: AuthenticatedWebSocket, error: string) {
    this.sendMessage(ws, {
      type: MessageType.BOT_MESSAGE,
      error,
      timestamp: new Date().toISOString()
    });
  }

  private sendErrorToRoom(ws: AuthenticatedWebSocket, error: string) {
    if (ws.userId) {
      this.sendToUserRoom(ws.userId, {
        type: MessageType.BOT_MESSAGE,
        error,
        timestamp: new Date().toISOString()
      });
    } else {
      // Fallback to direct send if no userId (unauthenticated)
      this.sendError(ws, error);
    }
  }

  // Room Management Methods
  private joinUserRoom(ws: AuthenticatedWebSocket) {
    if (!ws.userId || !ws.roomId) return;

    let room = this.userRooms.get(ws.userId);
    
    if (!room) {
      // Create new room for user
      room = {
        roomId: ws.roomId,
        userId: ws.userId,
        sessions: new Set(),
        createdAt: new Date(),
        lastActivity: new Date()
      };
      this.userRooms.set(ws.userId, room);
      logger.info(`Created new room ${ws.roomId} for user ${ws.userId}`);
    }
    
    // Add WebSocket to room
    room.sessions.add(ws);
    room.lastActivity = new Date();
    
    logger.info(`Session ${ws.sessionId} joined room ${ws.roomId}`);
  }

  private leaveUserRoom(ws: AuthenticatedWebSocket) {
    if (!ws.userId || !ws.roomId) return;

    const room = this.userRooms.get(ws.userId);
    if (room) {
      room.sessions.delete(ws);
      logger.info(`Session ${ws.sessionId} left room ${ws.roomId}`);
      
      // If no more sessions in room, schedule cleanup
      if (room.sessions.size === 0) {
        setTimeout(() => {
          const currentRoom = this.userRooms.get(ws.userId!);
          if (currentRoom && currentRoom.sessions.size === 0) {
            this.userRooms.delete(ws.userId!);
            logger.info(`Cleaned up empty room ${ws.roomId} for user ${ws.userId}`);
          }
        }, 5000); // 5 second delay to allow for reconnections
      }
    }
  }

  private cleanupInactiveRooms() {
    const now = new Date();
    const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours

    for (const [userId, room] of this.userRooms.entries()) {
      const inactiveTime = now.getTime() - room.lastActivity.getTime();
      
      if (inactiveTime > maxInactiveTime) {
        // Close all sessions in the room
        room.sessions.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
        
        this.userRooms.delete(userId);
        logger.info(`Cleaned up inactive room ${room.roomId} for user ${userId}`);
      }
    }
  }

  // Method to send message to all sessions in a user's room
  public sendToUserRoom(userId: string, message: WebSocketMessage) {
    const room = this.userRooms.get(userId);
    if (room) {
      room.sessions.forEach(ws => {
        if (ws.isAuthenticated && ws.readyState === WebSocket.OPEN) {
          this.sendMessage(ws, message);
        }
      });
      room.lastActivity = new Date();
      logger.debug(`Sent message to room ${room.roomId} with ${room.sessions.size} sessions`);
    }
  }

  //send research update to user's room
  public sendResearchUpdateToUserRoom(userId: string, message: WebSocketMessage) {
    const room = this.userRooms.get(userId);
    if (room) {
      room.sessions.forEach(ws => {
        if (ws.isAuthenticated && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  // Method to broadcast to all authenticated clients (admin use only)
  public broadcast(message: WebSocketMessage) {
    let sentCount = 0;
    this.clients.forEach((client) => {
      if (client.isAuthenticated) {
        this.sendMessage(client, message);
        sentCount++;
      }
    });
    logger.info(`Broadcasted message to ${sentCount} clients`);
  }

  // Method to send message to specific session
  public sendToSession(sessionId: string, message: WebSocketMessage) {
    const client = this.clients.get(sessionId);
    if (client && client.isAuthenticated) {
      this.sendMessage(client, message);
      // Update room activity
      if (client.userId) {
        const room = this.userRooms.get(client.userId);
        if (room) {
          room.lastActivity = new Date();
        }
      }
    }
  }

  // Get connected clients count
  public getConnectedClientsCount(): number {
    return Array.from(this.clients.values()).filter(client => client.isAuthenticated).length;
  }

  // Get active rooms count
  public getActiveRoomsCount(): number {
    return this.userRooms.size;
  }

  // Get room info for a user
  public getUserRoomInfo(userId: string) {
    const room = this.userRooms.get(userId);
    if (room) {
      return {
        roomId: room.roomId,
        userId: room.userId,
        sessionCount: room.sessions.size,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity
      };
    }
    return null;
  }

  // Get all active rooms (admin use)
  public getAllRoomsInfo() {
    return Array.from(this.userRooms.values()).map(room => ({
      roomId: room.roomId,
      userId: room.userId,
      sessionCount: room.sessions.size,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity
    }));
  }

  // Close specific session (called when session is invalidated)
  public closeSession(sessionId: string, reason: string = 'Session invalidated') {
    const client = this.clients.get(sessionId);
    console.log('closing session', sessionId, client);
    
    if (client) {
      // Send session termination message before closing
      this.sendMessage(client, {
        type: 'session_terminated',
        content: `Your session has been terminated: ${reason}`,
        timestamp: new Date().toISOString(),
        error: 'SESSION_TERMINATED'
      });
      
      // Close the connection after a short delay to ensure message is sent
      setTimeout(() => {
        client.close();
        logger.info(`Closed WebSocket session ${sessionId}: ${reason}`);
      }, 100);
    }
  }

  // Close all sessions for a user (called when user logs in from another location)
  public closeUserSessions(userId: string, exceptSessionId?: string, reason: string = 'New login detected') {
    const room = this.userRooms.get(userId);
    if (room) {
      let closedCount = 0;
      room.sessions.forEach(ws => {
        if (ws.sessionId && ws.sessionId !== exceptSessionId) {
          this.closeSession(ws.sessionId, reason);
          closedCount++;
        }
      });
      logger.info(`Closed ${closedCount} WebSocket sessions for user ${userId}: ${reason}`);
    }
  }

  // Cleanup on server shutdown
  public close() {
    // Close all client connections
    this.clients.forEach((client) => {
      client.close();
    });
    
    // Clear all rooms
    this.userRooms.clear();
    
    this.wss.close();
    logger.info('WebSocket server closed - all rooms and connections cleaned up');
  }
}
