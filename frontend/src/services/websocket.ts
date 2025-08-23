import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private currentWorkspaceId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(workspaceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.currentWorkspaceId === workspaceId) {
        resolve();
        return;
      }

      if (this.socket) {
        this.disconnect();
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        reject(new Error('No authentication token found'));
        return;
      }

      const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
      
      this.socket = io(WS_URL, {
        path: `/ws/${workspaceId}`,
        auth: {
          token: token
        },
        transports: ['websocket'],
        upgrade: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      this.currentWorkspaceId = workspaceId;

      this.socket.on('connect', () => {
        console.log(`Connected to workspace ${workspaceId}`);
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected, attempt to reconnect
          this.socket?.connect();
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentWorkspaceId = null;
    }
  }

  // Message handling
  onMessage(callback: (message: WebSocketMessage) => void): void {
    if (!this.socket) return;
    
    this.socket.on('message', callback);
  }

  offMessage(callback?: (message: WebSocketMessage) => void): void {
    if (!this.socket) return;
    
    if (callback) {
      this.socket.off('message', callback);
    } else {
      this.socket.off('message');
    }
  }

  // Chat methods
  sendChatMessage(channelId: string, content: string, encryptedContent?: string, messageType = 'text'): void {
    if (!this.socket) return;
    
    this.socket.emit('message', {
      type: 'chat_message',
      channel_id: channelId,
      content,
      encrypted_content: encryptedContent,
      message_type: messageType
    });
  }

  sendTyping(channelId: string, isTyping = true): void {
    if (!this.socket) return;
    
    this.socket.emit('message', {
      type: 'typing',
      channel_id: channelId,
      is_typing: isTyping
    });
  }

  // Document collaboration methods
  sendDocumentOperation(documentId: string, operation: {
    operation_type: string;
    position: number;
    content?: string;
    length?: number;
    version: number;
  }): void {
    if (!this.socket) return;
    
    this.socket.emit('message', {
      type: 'document_operation',
      document_id: documentId,
      ...operation
    });
  }

  sendCursorPosition(documentId: string, position: number, selection?: { start: number; end: number }): void {
    if (!this.socket) return;
    
    this.socket.emit('message', {
      type: 'cursor_position',
      document_id: documentId,
      position,
      selection
    });
  }

  // WebRTC methods
  sendWebRTCSignal(targetUserId: string, signalType: string, signalData: any, callId: string): void {
    if (!this.socket) return;
    
    this.socket.emit('message', {
      type: 'webrtc_signal',
      target_user_id: targetUserId,
      signal_type: signalType,
      signal_data: signalData,
      call_id: callId
    });
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getCurrentWorkspaceId(): string | null {
    return this.currentWorkspaceId;
  }
}

export const websocketService = new WebSocketService();


