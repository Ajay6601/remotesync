import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Task } from '../../types';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

const initialState: TaskState = {
  tasks: [],
  loading: false,
  error: null,
};

// Async thunks
export const getWorkspaceTasks = createAsyncThunk(
  'task/getWorkspaceTasks',
  async ({ workspaceId, status, assignedTo }: {
    workspaceId: string;
    status?: string;
    assignedTo?: string;
  }) => {
    const response = await apiService.getWorkspaceTasks(workspaceId, status, assignedTo);
    return response;
  }
);

export const createTask = createAsyncThunk(
  'task/createTask',
  async ({ workspaceId, taskData }: {
    workspaceId: string;
    taskData: {
      title: string;
      description?: string;
      status?: 'todo' | 'in_progress' | 'in_review' | 'done';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assigned_to?: string;
      due_date?: string;
      tags?: string[];
    };
  }) => {
    const response = await apiService.createTask(workspaceId, taskData);
    return response;
  }
);

export const updateTask = createAsyncThunk(
  'task/updateTask',
  async ({ workspaceId, taskId, taskData }: {
    workspaceId: string;
    taskId: string;
    taskData: {
      title?: string;
      description?: string;
      status?: 'todo' | 'in_progress' | 'in_review' | 'done';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assigned_to?: string;
      due_date?: string;
      tags?: string[];
    };
  }) => {
    const response = await apiService.updateTask(workspaceId, taskId, taskData);
    return response;
  }
);

export const deleteTask = createAsyncThunk(
  'task/deleteTask',
  async ({ workspaceId, taskId }: {
    workspaceId: string;
    taskId: string;
  }) => {
    await apiService.deleteTask(workspaceId, taskId);
    return taskId;
  }
);

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    // WebSocket task handlers
    addTask: (state, action) => {
      state.tasks.push(action.payload);
    },
    updateTaskInState: (state, action) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    removeTask: (state, action) => {
      state.tasks = state.tasks.filter(task => task.id !== action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get tasks
      .addCase(getWorkspaceTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getWorkspaceTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks = action.payload;
      })
      .addCase(getWorkspaceTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load tasks';
      })
      // Create task
      .addCase(createTask.fulfilled, (state, action) => {
        state.tasks.push(action.payload);
      })
      // Update task
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      // Delete task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(task => task.id !== action.payload);
      });
  },
});

export const {
  addTask,
  updateTaskInState,
  removeTask,
  clearError,
} = taskSlice.actions;

export default taskSlice.reducer;