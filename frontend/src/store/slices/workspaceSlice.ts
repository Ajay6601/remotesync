import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api.ts';
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

// ADD THE MISSING ASYNC THUNKS
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
      .addCase(getWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.push(action.payload);
      })
      .addCase(getWorkspace.fulfilled, (state, action) => {
        state.currentWorkspace = action.payload;
      })
      .addCase(getWorkspaceChannels.fulfilled, (state, action) => {
        state.channels = action.payload;
      });
  },
});

export const { setCurrentWorkspace, setCurrentChannel, clearError } = workspaceSlice.actions;
export default workspaceSlice.reducer;