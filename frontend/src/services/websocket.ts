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

// frontend/src/services/encryption.ts
import CryptoJS from 'crypto-js';

class EncryptionService {
  private userKey: string | null = null;

  setUserKey(password: string, salt: string): void {
    // Derive key from password and salt using PBKDF2
    this.userKey = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 100000
    }).toString();
  }

  encryptMessage(message: string): string | null {
    if (!this.userKey) return null;
    
    try {
      const encrypted = CryptoJS.AES.encrypt(message, this.userKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  decryptMessage(encryptedMessage: string): string | null {
    if (!this.userKey) return null;
    
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, this.userKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  generateKeyPair(): { publicKey: string; privateKey: string } {
    // Simplified key generation for demo - in production use proper asymmetric encryption
    const privateKey = CryptoJS.lib.WordArray.random(256/8).toString();
    const publicKey = CryptoJS.SHA256(privateKey).toString();
    
    return { publicKey, privateKey };
  }

  clearKeys(): void {
    this.userKey = null;
  }
}

export const encryptionService = new EncryptionService();

// frontend/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import workspaceSlice from './slices/workspaceSlice';
import chatSlice from './slices/chatSlice';
import documentSlice from './slices/documentSlice';
import taskSlice from './slices/taskSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    workspace: workspaceSlice,
    chat: chatSlice,
    document: documentSlice,
    task: taskSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// frontend/src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { User } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await apiService.login(email, password);
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    return response;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: {
    email: string;
    username: string;
    full_name: string;
    password: string;
  }) => {
    const response = await apiService.register(userData);
    return response;
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    const response = await apiService.getCurrentUser();
    return response;
  }
);

export const updateCurrentUser = createAsyncThunk(
  'auth/updateCurrentUser',
  async (userData: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  }) => {
    const response = await apiService.updateCurrentUser(userData);
    return response;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    setTokens: (state, action) => {
      const { access_token, refresh_token } = action.payload;
      state.token = access_token;
      state.refreshToken = refresh_token;
      state.isAuthenticated = true;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      // Get current user
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      // Update current user
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout, clearError, setTokens } = authSlice.actions;
export default authSlice.reducer;

// frontend/src/store/slices/workspaceSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Workspace, Channel } from '../../types';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  channels: Channel[];
  currentChannel: Channel | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  currentWorkspace: null,
  channels: [],
  currentChannel: null,
  loading: false,
  error: null,
};

// Async thunks
export const getWorkspaces = createAsyncThunk(
  'workspace/getWorkspaces',
  async () => {
    const response = await apiService.getWorkspaces();
    return response;
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/createWorkspace',
  async (workspaceData: {
    name: string;
    description?: string;
    is_private: boolean;
  }) => {
    const response = await apiService.createWorkspace(workspaceData);
    return response;
  }
);

export const getWorkspace = createAsyncThunk(
  'workspace/getWorkspace',
  async (workspaceId: string) => {
    const response = await apiService.getWorkspace(workspaceId);
    return response;
  }
);

export const getWorkspaceChannels = createAsyncThunk(
  'workspace/getWorkspaceChannels',
  async (workspaceId: string) => {
    const response = await apiService.getWorkspaceChannels(workspaceId);
    return response;
  }
);

export const createChannel = createAsyncThunk(
  'workspace/createChannel',
  async ({ workspaceId, channelData }: {
    workspaceId: string;
    channelData: {
      name: string;
      description?: string;
      type: 'text' | 'voice' | 'video';
      is_private: boolean;
    };
  }) => {
    const response = await apiService.createChannel(workspaceId, channelData);
    return response;
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action) => {
      state.currentWorkspace = action.payload;
    },
    setCurrentChannel: (state, action) => {
      state.currentChannel = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get workspaces
      .addCase(getWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload;
      })
      .addCase(getWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load workspaces';
      })
      // Create workspace
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.push(action.payload);
      })
      // Get workspace
      .addCase(getWorkspace.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      // Get channels
      .addCase(getWorkspaceChannels.fulfilled, (state, action) => {
        state.channels = action.payload;
      })
      // Create channel
      .addCase(createChannel.fulfilled, (state, action) => {
        state.channels.push(action.payload);
      });
  },
});

export const { setCurrentWorkspace, setCurrentChannel, clearError } = workspaceSlice.actions;
export default workspaceSlice.reducer;

// frontend/src/store/slices/chatSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Message } from '../../types';

interface ChatState {
  messages: Record<string, Message[]>; // channelId -> messages
  typing: Record<string, string[]>; // channelId -> userIds typing
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: {},
  typing: {},
  loading: false,
  error: null,
};

// Async thunks
export const getChannelMessages = createAsyncThunk(
  'chat/getChannelMessages',
  async ({ channelId, limit = 50, before }: {
    channelId: string;
    limit?: number;
    before?: string;
  }) => {
    const response = await apiService.getChannelMessages(channelId, limit, before);
    return { channelId, messages: response };
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ channelId, messageData }: {
    channelId: string;
    messageData: {
      content: string;
      encrypted_content?: string;
      message_type?: 'text' | 'image' | 'file';
      parent_message_id?: string;
    };
  }) => {
    const response = await apiService.sendMessage(channelId, messageData);
    return { channelId, message: response };
  }
);

export const updateMessage = createAsyncThunk(
  'chat/updateMessage',
  async ({ messageId, messageData }: {
    messageId: string;
    messageData: {
      content: string;
      encrypted_content?: string;
    };
  }) => {
    const response = await apiService.updateMessage(messageId, messageData);
    return response;
  }
);

export const deleteMessage = createAsyncThunk(
  'chat/deleteMessage',
  async (messageId: string) => {
    await apiService.deleteMessage(messageId);
    return messageId;
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // WebSocket message handlers
    addMessage: (state, action) => {
      const { channelId, message } = action.payload;
      if (!state.messages[channelId]) {
        state.messages[channelId] = [];
      }
      state.messages[channelId].push(message);
    },
    updateMessageInState: (state, action) => {
      const { message } = action.payload;
      // Find and update message across all channels
      Object.keys(state.messages).forEach(channelId => {
        const messageIndex = state.messages[channelId].findIndex(m => m.id === message.id);
        if (messageIndex !== -1) {
          state.messages[channelId][messageIndex] = message;
        }
      });
    },
    removeMessage: (state, action) => {
      const { messageId } = action.payload;
      Object.keys(state.messages).forEach(channelId => {
        state.messages[channelId] = state.messages[channelId].filter(m => m.id !== messageId);
      });
    },
    setTyping: (state, action) => {
      const { channelId, userId, isTyping } = action.payload;
      if (!state.typing[channelId]) {
        state.typing[channelId] = [];
      }
      
      if (isTyping) {
        if (!state.typing[channelId].includes(userId)) {
          state.typing[channelId].push(userId);
        }
      } else {
        state.typing[channelId] = state.typing[channelId].filter(id => id !== userId);
      }
    },
    updateReaction: (state, action) => {
      const { messageId, reactions } = action.payload;
      Object.keys(state.messages).forEach(channelId => {
        const messageIndex = state.messages[channelId].findIndex(m => m.id === messageId);
        if (messageIndex !== -1) {
          state.messages[channelId][messageIndex].reactions = reactions;
        }
      });
    },
    clearChannelMessages: (state, action) => {
      const channelId = action.payload;
      delete state.messages[channelId];
    },
  },
  extraReducers: (builder) => {
    builder
      // Get messages
      .addCase(getChannelMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getChannelMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { channelId, messages } = action.payload;
        state.messages[channelId] = messages;
      })
      .addCase(getChannelMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load messages';
      })
      // Send message
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { channelId, message } = action.payload;
        if (!state.messages[channelId]) {
          state.messages[channelId] = [];
        }
        // Don't add here since WebSocket will handle it
      })
      // Update message
      .addCase(updateMessage.fulfilled, (state, action) => {
        const message = action.payload;
        Object.keys(state.messages).forEach(channelId => {
          const messageIndex = state.messages[channelId].findIndex(m => m.id === message.id);
          if (messageIndex !== -1) {
            state.messages[channelId][messageIndex] = message;
          }
        });
      });
  },
});

export const {
  addMessage,
  updateMessageInState,
  removeMessage,
  setTyping,
  updateReaction,
  clearChannelMessages,
} = chatSlice.actions;

export default chatSlice.reducer;