import { io, Socket } from 'socket.io-client';
import { WebSocketMessage } from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private currentWorkspaceId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

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
      
      this.socket = new WebSocket(`${WS_URL}/ws/${workspaceId}?token=${token}`);
      this.currentWorkspaceId = workspaceId;

      this.socket.onopen = () => {
        console.log(`Connected to workspace ${workspaceId}`);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        this.handleReconnection();
        if (this.reconnectAttempts === 0) {
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.reason);
        this.cleanup();
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
        30000
      ); // Max 30 seconds
      
      this.reconnectTimeout = setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.reconnectAttempts++;
        if (this.currentWorkspaceId) {
          this.connect(this.currentWorkspaceId);
        }
      }, delay);
    }
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  disconnect(): void {
    this.cleanup();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.currentWorkspaceId = null;
      this.reconnectAttempts = 0;
    }
  }

  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];

  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.messageHandlers.push(callback);
  }

  offMessage(callback?: (message: WebSocketMessage) => void): void {
    if (callback) {
      const index = this.messageHandlers.indexOf(callback);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    } else {
      this.messageHandlers = [];
    }
  }

  private sendMessage(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  // Chat methods
  sendChatMessage(channelId: string, content: string, encryptedContent?: string, messageType = 'text'): void {
    this.sendMessage({
      type: 'chat_message',
      channel_id: channelId,
      content,
      encrypted_content: encryptedContent,
      message_type: messageType
    });
  }

  sendTyping(channelId: string, isTyping = true): void {
    this.sendMessage({
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
  }): void {this.sendMessage({
      type: 'document_operation',
      document_id: documentId,
      ...operation
    });
  }

  sendCursorPosition(documentId: string, position: number, selection?: { start: number; end: number }): void {
    this.sendMessage({
      type: 'cursor_position',
      document_id: documentId,
      position,
      selection
    });
  }

  // WebRTC methods
  sendWebRTCSignal(targetUserId: string, signalType: string, signalData: any, callId: string): void {
    this.sendMessage({
      type: 'webrtc_signal',
      target_user_id: targetUserId,
      signal_type: signalType,
      signal_data: signalData,
      call_id: callId
    });
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  getCurrentWorkspaceId(): string | null {
    return this.currentWorkspaceId;
  }

  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

export const websocketService = new WebSocketService();