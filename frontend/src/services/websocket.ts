import { WebSocketMessage } from '../types';

class WebSocketService {
  private socket: WebSocket | null = null;
  private currentWorkspaceId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];

  connect(workspaceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.currentWorkspaceId === workspaceId && this.socket.readyState === WebSocket.OPEN) {
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

      const WS_URL = 'ws://localhost:8000';
      this.socket = new WebSocket(`${WS_URL}/ws/${workspaceId}?token=${token}`);
      this.currentWorkspaceId = workspaceId;

      this.socket.onopen = () => {
        console.log(`✅ WebSocket connected to workspace ${workspaceId}`);
        this.reconnectAttempts = 0;
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleReconnection();
        if (this.reconnectAttempts === 0) {
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.reason);
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnection();
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      this.reconnectTimeout = setTimeout(() => {
        console.log(`🔄 Reconnecting... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        this.reconnectAttempts++;
        if (this.currentWorkspaceId) {
          this.connect(this.currentWorkspaceId);
        }
      }, delay);
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.currentWorkspaceId = null;
      this.reconnectAttempts = 0;
    }
  }

  private sendMessage(message: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      console.log('📤 WebSocket message sent:', message);
    } else {
      console.warn('⚠️ WebSocket not connected, message not sent:', message);
    }
  }

  // Chat methods
  sendChatMessage(channelId: string, content: string, messageType = 'text'): void {
    this.sendMessage({
      type: 'chat_message',
      channel_id: channelId,
      content,
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

  sendReaction(messageId: string, emoji: string): void {
    this.sendMessage({
      type: 'reaction',
      message_id: messageId,
      emoji
    });
  }

  // Message handlers
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

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();