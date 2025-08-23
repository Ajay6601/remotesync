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