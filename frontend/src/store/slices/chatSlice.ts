import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api.ts';
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
    console.log('📥 Loading messages for channel:', channelId);
    const response = await apiService.getChannelMessages(channelId, limit, before);
    console.log('📥 Messages loaded:', response.length);
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
    console.log('📤 Sending message to channel:', channelId);
    const response = await apiService.sendMessage(channelId, messageData);
    console.log('📤 Message sent:', response);
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

export const addReaction = createAsyncThunk(
  'chat/addReaction',
  async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
    const response = await apiService.addReaction(messageId, emoji);
    return { messageId, emoji, reactions: response.reactions };
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // WebSocket message handlers
    addMessage: (state, action) => {
      const { channelId, message } = action.payload;
      console.log('➕ Adding message to state:', message);
      if (!state.messages[channelId]) {
        state.messages[channelId] = [];
      }
      // Check if message already exists to avoid duplicates
      const exists = state.messages[channelId].find(m => m.id === message.id);
      if (!exists) {
        state.messages[channelId].push(message);
        console.log('✅ Message added, total messages:', state.messages[channelId].length);
      }
    },
    updateMessageInState: (state, action) => {
      const { message } = action.payload;
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
      console.log('⌨️ Typing indicator:', { channelId, userId, isTyping });
      
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
    clearError: (state) => {
      state.error = null;
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
        console.log('📥 Messages loaded into state:', messages.length);
      })
      .addCase(getChannelMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load messages';
      })
      // Send message
      .addCase(sendMessage.fulfilled, (state, action) => {
        const { channelId, message } = action.payload;
        console.log('📤 Message sent successfully:', message);
        // Don't add here since WebSocket will handle it to avoid duplicates
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to send message';
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
      })
      // Delete message
      .addCase(deleteMessage.fulfilled, (state, action) => {
        const messageId = action.payload;
        Object.keys(state.messages).forEach(channelId => {
          state.messages[channelId] = state.messages[channelId].filter(m => m.id !== messageId);
        });
      })
      // Add reaction
      .addCase(addReaction.fulfilled, (state, action) => {
        const { messageId, reactions } = action.payload;
        Object.keys(state.messages).forEach(channelId => {
          const messageIndex = state.messages[channelId].findIndex(m => m.id === messageId);
          if (messageIndex !== -1) {
            state.messages[channelId][messageIndex].reactions = reactions;
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
  clearError,
} = chatSlice.actions;

export default chatSlice.reducer;