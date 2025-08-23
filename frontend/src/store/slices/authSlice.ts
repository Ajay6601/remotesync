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