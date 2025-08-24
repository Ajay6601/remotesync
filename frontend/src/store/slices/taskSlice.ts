// import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
// import { apiService } from '../../services/api.ts';
// import { Task } from '../../types';

// interface TaskFilters {
//   status?: string[];
//   priority?: string[];
//   assignedTo?: string[];
//   dueDateRange?: {
//     start?: string;
//     end?: string;
//   };
//   tags?: string[];
//   search?: string;
// }

// interface TaskState {
//   tasks: Task[];
//   currentTask: Task | null;
//   filters: TaskFilters;
//   loading: boolean;
//   creating: boolean;
//   updating: boolean;
//   deleting: string | null; // ID of task being deleted
//   error: string | null;
//   lastUpdated: string | null;
//   totalCount: number;
//   hasMore: boolean;
//   page: number;
// }

// const initialState: TaskState = {
//   tasks: [],
//   currentTask: null,
//   filters: {},
//   loading: false,
//   creating: false,
//   updating: false,
//   deleting: null,
//   error: null,
//   lastUpdated: null,
//   totalCount: 0,
//   hasMore: false,
//   page: 1,
// };

// // Async thunks
// // export const getWorkspaceTasks = createAsyncThunk(
// //   'task/getWorkspaceTasks',
// //   async ({ 
// //     workspaceId, 
// //     status, 
// //     assignedTo, 
// //     priority,
// //     page = 1,
// //     limit = 50,
// //     search,
// //     tags 
// //   }: {
// //     workspaceId: string;
// //     status?: string;
// //     assignedTo?: string;
// //     priority?: string;
// //     page?: number;
// //     limit?: number;
// //     search?: string;
// //     tags?: string[];
// //   }, { rejectWithValue }) => {
// //     try {
// //       const response = await apiService.getWorkspaceTasks(workspaceId, {
// //         status,
// //         assignedTo,
// //         priority,
// //         page,
// //         limit,
// //         search,
// //         tags: tags?.join(','),
// //       });
// //       return { ...response, page };
// //     } catch (error: any) {
// //       return rejectWithValue(error.response?.data?.message || 'Failed to load tasks');
// //     }
// //   }
// // );

// export const getWorkspaceTasks = createAsyncThunk(
//   "task/getWorkspaceTasks",
//   async ({ workspaceId }: {
//     workspaceId: string;
//   }) => {
//     console.log("TaskSlice: Loading tasks for workspace:", workspaceId);
//     const response = await apiService.getWorkspaceTasks(workspaceId);
//     console.log("TaskSlice: Received tasks:", response);
//     return response;
//   }
// );

// export const getTask = createAsyncThunk(
//   'task/getTask',
//   async ({ workspaceId, taskId }: {
//     workspaceId: string;
//     taskId: string;
//   }, { rejectWithValue }) => {
//     try {
//       const response = await apiService.getTask(workspaceId, taskId);
//       return response;
//     } catch (error: any) {
//       return rejectWithValue(error.response?.data?.message || 'Failed to load task');
//     }
//   }
// );

// export const createTask = createAsyncThunk(
//   'task/createTask',
//   async ({ workspaceId, taskData }: {
//     workspaceId: string;
//     taskData: {
//       title: string;
//       description?: string;
//       status?: 'todo' | 'in_progress' | 'in_review' | 'done';
//       priority?: 'low' | 'medium' | 'high' | 'urgent';
//       assigned_to?: string;
//       due_date?: string;
//       tags?: string[];
//       parent_task_id?: string;
//       estimated_hours?: number;
//     };
//   }, { rejectWithValue }) => {
//     try {
//       const response = await apiService.createTask(workspaceId, taskData);
//       return response;
//     } catch (error: any) {
//       return rejectWithValue(error.response?.data?.message || 'Failed to create task');
//     }
//   }
// );

// export const updateTask = createAsyncThunk(
//   'task/updateTask',
//   async ({ workspaceId, taskId, taskData }: {
//     workspaceId: string;
//     taskId: string;
//     taskData: {
//       title?: string;
//       description?: string;
//       status?: 'todo' | 'in_progress' | 'in_review' | 'done';
//       priority?: 'low' | 'medium' | 'high' | 'urgent';
//       assigned_to?: string;
//       due_date?: string;
//       tags?: string[];
//       estimated_hours?: number;
//       actual_hours?: number;
//       completed_at?: string;
//     };
//   }, { rejectWithValue }) => {
//     try {
//       const response = await apiService.updateTask(workspaceId, taskId, taskData);
//       return response;
//     } catch (error: any) {
//       return rejectWithValue(error.response?.data?.message || 'Failed to update task');
//     }
//   }
// );

// export const deleteTask = createAsyncThunk(
//   'task/deleteTask',
//   async ({ workspaceId, taskId }: {
//     workspaceId: string;
//     taskId: string;
//   }, { rejectWithValue }) => {
//     try {
//       await apiService.deleteTask(workspaceId, taskId);
//       return taskId;
//     } catch (error: any) {
//       return rejectWithValue(error.response?.data?.message || 'Failed to delete task');
//     }
//   }
// );

// export const bulkUpdateTasks = createAsyncThunk(
//   'task/bulkUpdateTasks',
//   async ({ workspaceId, taskIds, updates }: {
//     workspaceId: string;
//     taskIds: string[];
//     updates: {
//       status?: string;
//       priority?: string;
//       assigned_to?: string;
//       tags?: string[];
//     };
//   }, { rejectWithValue }) => {
//     try {
//       const response = await apiService.bulkUpdateTasks(workspaceId, taskIds, updates);
//       return response;
//     } catch (error: any) {
//       return rejectWithValue(error.response?.data?.message || 'Failed to update tasks');
//     }
//   }
// );

// export const duplicateTask = createAsyncThunk(
//   'task/duplicateTask',
//   async ({ workspaceId, taskId, title }: {
//     workspaceId: string;
//     taskId: string;
//     title?: string;
//   }, { rejectWithValue }) => {
//     try {
//       const response = await apiService.duplicateTask(workspaceId, taskId, { title });
//       return response;
//     } catch (error: any) {
//       return rejectWithValue(error.response?.data?.message || 'Failed to duplicate task');
//     }
//   }
// );

// export const addTaskComment = createAsyncThunk(
//   'task/addTaskComment',
//   async ({ workspaceId, taskId, comment }: {
//     workspaceId: string;
//     taskId: string;
//     comment: string;
//   }, { rejectWithValue }) => {
//     try {
//       const response = await apiService.addTaskComment(workspaceId, taskId, { comment });
//       return response;
//     } catch (error: any) {
//       return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
//     }
//   }
// );

// const taskSlice = createSlice({
//   name: 'task',
//   initialState,
//   reducers: {
//     // Current task management
//     setCurrentTask: (state, action: PayloadAction<Task | null>) => {
//       state.currentTask = action.payload;
//     },

//     // Filter management
//     setFilters: (state, action: PayloadAction<TaskFilters>) => {
//       state.filters = action.payload;
//     },

//     updateFilter: (state, action: PayloadAction<Partial<TaskFilters>>) => {
//       state.filters = { ...state.filters, ...action.payload };
//     },

//     clearFilters: (state) => {
//       state.filters = {};
//     },

//     // WebSocket real-time updates
//     addTask: (state, action: PayloadAction<Task>) => {
//       // Check if task already exists to avoid duplicates
//       const exists = state.tasks.some(task => task.id === action.payload.id);
//       if (!exists) {
//         state.tasks.unshift(action.payload); // Add to beginning
//         state.totalCount += 1;
//       }
//     },

//     updateTaskInState: (state, action: PayloadAction<Task>) => {
//       const index = state.tasks.findIndex(task => task.id === action.payload.id);
//       if (index !== -1) {
//         state.tasks[index] = action.payload;
//       }
      
//       // Update current task if it's the same
//       if (state.currentTask?.id === action.payload.id) {
//         state.currentTask = action.payload;
//       }
//     },

//     removeTask: (state, action: PayloadAction<string>) => {
//       state.tasks = state.tasks.filter(task => task.id !== action.payload);
//       state.totalCount = Math.max(0, state.totalCount - 1);
      
//       // Clear current task if it was removed
//       if (state.currentTask?.id === action.payload) {
//         state.currentTask = null;
//       }
//     },

//     // Optimistic updates
//     optimisticUpdateTask: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
//       const { id, updates } = action.payload;
//       const index = state.tasks.findIndex(task => task.id === id);
//       if (index !== -1) {
//         state.tasks[index] = { ...state.tasks[index], ...updates };
//       }
      
//       if (state.currentTask?.id === id) {
//         state.currentTask = { ...state.currentTask, ...updates };
//       }
//     },

//     // Bulk operations
//     bulkSelectTasks: (state, action: PayloadAction<string[]>) => {
//       state.tasks.forEach(task => {
//         task.selected = action.payload.includes(task.id);
//       });
//     },

//     clearSelection: (state) => {
//       state.tasks.forEach(task => {
//         task.selected = false;
//       });
//     },

//     // State management
//     clearError: (state) => {
//       state.error = null;
//     },

//     resetTaskState: (state) => {
//       state.currentTask = null;
//       state.filters = {};
//       state.error = null;
//       state.page = 1;
//     },

//     setPage: (state, action: PayloadAction<number>) => {
//       state.page = action.payload;
//     },
//   },

//   extraReducers: (builder) => {
//     builder
//       // Get workspace tasks
//       .addCase(getWorkspaceTasks.pending, (state, action) => {
//         state.loading = true;
//         state.error = null;
        
//         // If it's page 1, clear existing tasks
//         if (action.meta.arg.page === 1) {
//           state.tasks = [];
//         }
//       })
//       .addCase(getWorkspaceTasks.fulfilled, (state, action) => {
//         state.loading = false;
//         const { tasks, totalCount, hasMore, page } = action.payload;
        
//         if (page === 1) {
//           state.tasks = tasks;
//         } else {
//           // Append to existing tasks for pagination
//           state.tasks = [...state.tasks, ...tasks];
//         }
        
//         state.totalCount = totalCount || tasks.length;
//         state.hasMore = hasMore || false;
//         state.lastUpdated = new Date().toISOString();
//         state.page = page;
//       })
//       .addCase(getWorkspaceTasks.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload as string || 'Failed to load tasks';
//       })

//       // Get single task
//       .addCase(getTask.pending, (state) => {
//         state.loading = true;
//         state.error = null;
//       })
//       .addCase(getTask.fulfilled, (state, action) => {
//         state.loading = false;
//         state.currentTask = action.payload;
//       })
//       .addCase(getTask.rejected, (state, action) => {
//         state.loading = false;
//         state.error = action.payload as string || 'Failed to load task';
//       })

//       // Create task
//       .addCase(createTask.pending, (state) => {
//         state.creating = true;
//         state.error = null;
//       })
//       .addCase(createTask.fulfilled, (state, action) => {
//         state.creating = false;
//         state.tasks.unshift(action.payload); // Add to beginning
//         state.totalCount += 1;
//       })
//       .addCase(createTask.rejected, (state, action) => {
//         state.creating = false;
//         state.error = action.payload as string || 'Failed to create task';
//       })

//       // Update task
//       .addCase(updateTask.pending, (state) => {
//         state.updating = true;
//         state.error = null;
//       })
//       .addCase(updateTask.fulfilled, (state, action) => {
//         state.updating = false;
//         const index = state.tasks.findIndex(task => task.id === action.payload.id);
//         if (index !== -1) {
//           state.tasks[index] = action.payload;
//         }
        
//         if (state.currentTask?.id === action.payload.id) {
//           state.currentTask = action.payload;
//         }
//       })
//       .addCase(updateTask.rejected, (state, action) => {
//         state.updating = false;
//         state.error = action.payload as string || 'Failed to update task';
//       })

//       // Delete task
//       .addCase(deleteTask.pending, (state, action) => {
//         state.deleting = action.meta.arg.taskId;
//         state.error = null;
//       })
//       .addCase(deleteTask.fulfilled, (state, action) => {
//         state.deleting = null;
//         state.tasks = state.tasks.filter(task => task.id !== action.payload);
//         state.totalCount = Math.max(0, state.totalCount - 1);
        
//         if (state.currentTask?.id === action.payload) {
//           state.currentTask = null;
//         }
//       })
//       .addCase(deleteTask.rejected, (state, action) => {
//         state.deleting = null;
//         state.error = action.payload as string || 'Failed to delete task';
//       })

//       // Bulk update tasks
//       .addCase(bulkUpdateTasks.fulfilled, (state, action) => {
//         const updatedTasks = action.payload;
//         updatedTasks.forEach((updatedTask: Task) => {
//           const index = state.tasks.findIndex(task => task.id === updatedTask.id);
//           if (index !== -1) {
//             state.tasks[index] = updatedTask;
//           }
//         });
//       })
//       .addCase(bulkUpdateTasks.rejected, (state, action) => {
//         state.error = action.payload as string || 'Failed to update tasks';
//       })

//       // Duplicate task
//       .addCase(duplicateTask.fulfilled, (state, action) => {
//         state.tasks.unshift(action.payload);
//         state.totalCount += 1;
//       })
//       .addCase(duplicateTask.rejected, (state, action) => {
//         state.error = action.payload as string || 'Failed to duplicate task';
//       })

//       // Add comment
//       .addCase(addTaskComment.fulfilled, (state, action) => {
//         if (state.currentTask?.id === action.payload.task_id) {
//           state.currentTask.comments = state.currentTask.comments || [];
//           state.currentTask.comments.push(action.payload);
//         }
//       })
//       .addCase(addTaskComment.rejected, (state, action) => {
//         state.error = action.payload as string || 'Failed to add comment';
//       });
//   },
// });

// export const {
//   setCurrentTask,
//   setFilters,
//   updateFilter,
//   clearFilters,
//   addTask,
//   updateTaskInState,
//   removeTask,
//   optimisticUpdateTask,
//   bulkSelectTasks,
//   clearSelection,
//   clearError,
//   resetTaskState,
//   setPage,
// } = taskSlice.actions;

// export default taskSlice.reducer;



import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api.ts';
import { Task } from '../../types';

interface TaskFilters {
  status?: string[];
  priority?: string[];
  assignedTo?: string[];
  dueDateRange?: {
    start?: string;
    end?: string;
  };
  tags?: string[];
  search?: string;
}

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  filters: TaskFilters;
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: string | null; // ID of task being deleted
  error: string | null;
  lastUpdated: string | null;
  totalCount: number;
  hasMore: boolean;
  page: number;
}

const initialState: TaskState = {
  tasks: [],
  currentTask: null,
  filters: {},
  loading: false,
  creating: false,
  updating: false,
  deleting: null,
  error: null,
  lastUpdated: null,
  totalCount: 0,
  hasMore: false,
  page: 1,
};

// Simple version to match your current API
export const getWorkspaceTasks = createAsyncThunk(
  "task/getWorkspaceTasks",
  async ({ workspaceId }: {
    workspaceId: string;
  }, { rejectWithValue }) => {
    try {
      console.log("TaskSlice: Loading tasks for workspace:", workspaceId);
      const response = await apiService.getWorkspaceTasks(workspaceId);
      console.log("TaskSlice: Received tasks:", response);
      
      // Handle different response formats
      if (Array.isArray(response)) {
        // If response is directly an array of tasks
        return {
          tasks: response,
          totalCount: response.length,
          hasMore: false,
          page: 1
        };
      } else if (response && Array.isArray(response.tasks)) {
        // If response has tasks property
        return {
          tasks: response.tasks,
          totalCount: response.totalCount || response.tasks.length,
          hasMore: response.hasMore || false,
          page: response.page || 1
        };
      } else if (response && response.data && Array.isArray(response.data)) {
        // If response has data property
        return {
          tasks: response.data,
          totalCount: response.totalCount || response.data.length,
          hasMore: response.hasMore || false,
          page: response.page || 1
        };
      } else {
        // Fallback: treat response as empty
        console.warn("Unexpected API response format:", response);
        return {
          tasks: [],
          totalCount: 0,
          hasMore: false,
          page: 1
        };
      }
    } catch (error: any) {
      console.error("TaskSlice: Failed to load tasks:", error);
      return rejectWithValue(error.response?.data?.message || 'Failed to load tasks');
    }
  }
);

// Enhanced version with full parameters (commented out - use when your API supports it)
export const getWorkspaceTasksAdvanced = createAsyncThunk(
  'task/getWorkspaceTasksAdvanced',
  async ({ 
    workspaceId, 
    status, 
    assignedTo, 
    priority,
    page = 1,
    limit = 50,
    search,
    tags 
  }: {
    workspaceId: string;
    status?: string;
    assignedTo?: string;
    priority?: string;
    page?: number;
    limit?: number;
    search?: string;
    tags?: string[];
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.getWorkspaceTasks(workspaceId, {
        status,
        assignedTo,
        priority,
        page,
        limit,
        search,
        tags: tags?.join(','),
      });
      
      return { 
        tasks: Array.isArray(response) ? response : response.tasks || [],
        totalCount: response.totalCount || (Array.isArray(response) ? response.length : 0),
        hasMore: response.hasMore || false,
        page 
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load tasks');
    }
  }
);

export const getTask = createAsyncThunk(
  'task/getTask',
  async ({ workspaceId, taskId }: {
    workspaceId: string;
    taskId: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.getTask(workspaceId, taskId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load task');
    }
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
      parent_task_id?: string;
      estimated_hours?: number;
    };
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.createTask(workspaceId, taskData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create task');
    }
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
      estimated_hours?: number;
      actual_hours?: number;
      completed_at?: string;
    };
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateTask(workspaceId, taskId, taskData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update task');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'task/deleteTask',
  async ({ workspaceId, taskId }: {
    workspaceId: string;
    taskId: string;
  }, { rejectWithValue }) => {
    try {
      await apiService.deleteTask(workspaceId, taskId);
      return taskId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete task');
    }
  }
);

export const bulkUpdateTasks = createAsyncThunk(
  'task/bulkUpdateTasks',
  async ({ workspaceId, taskIds, updates }: {
    workspaceId: string;
    taskIds: string[];
    updates: {
      status?: string;
      priority?: string;
      assigned_to?: string;
      tags?: string[];
    };
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.bulkUpdateTasks(workspaceId, taskIds, updates);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update tasks');
    }
  }
);

export const duplicateTask = createAsyncThunk(
  'task/duplicateTask',
  async ({ workspaceId, taskId, title }: {
    workspaceId: string;
    taskId: string;
    title?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.duplicateTask(workspaceId, taskId, { title });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to duplicate task');
    }
  }
);

export const addTaskComment = createAsyncThunk(
  'task/addTaskComment',
  async ({ workspaceId, taskId, comment }: {
    workspaceId: string;
    taskId: string;
    comment: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.addTaskComment(workspaceId, taskId, { comment });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add comment');
    }
  }
);

const taskSlice = createSlice({
  name: 'task',
  initialState,
  reducers: {
    // Current task management
    setCurrentTask: (state, action: PayloadAction<Task | null>) => {
      state.currentTask = action.payload;
    },

    // Filter management
    setFilters: (state, action: PayloadAction<TaskFilters>) => {
      state.filters = action.payload;
    },

    updateFilter: (state, action: PayloadAction<Partial<TaskFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters: (state) => {
      state.filters = {};
    },

    // WebSocket real-time updates
    addTask: (state, action: PayloadAction<Task>) => {
      // Check if task already exists to avoid duplicates
      const exists = state.tasks.some(task => task.id === action.payload.id);
      if (!exists) {
        state.tasks.unshift(action.payload); // Add to beginning
        state.totalCount += 1;
      }
    },

    updateTaskInState: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex(task => task.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      
      // Update current task if it's the same
      if (state.currentTask?.id === action.payload.id) {
        state.currentTask = action.payload;
      }
    },

    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(task => task.id !== action.payload);
      state.totalCount = Math.max(0, state.totalCount - 1);
      
      // Clear current task if it was removed
      if (state.currentTask?.id === action.payload) {
        state.currentTask = null;
      }
    },

    // Optimistic updates
    optimisticUpdateTask: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
      const { id, updates } = action.payload;
      const index = state.tasks.findIndex(task => task.id === id);
      if (index !== -1) {
        state.tasks[index] = { ...state.tasks[index], ...updates };
      }
      
      if (state.currentTask?.id === id) {
        state.currentTask = { ...state.currentTask, ...updates };
      }
    },

    // Bulk operations
    bulkSelectTasks: (state, action: PayloadAction<string[]>) => {
      state.tasks.forEach(task => {
        // Note: task.selected might not exist on Task type - add it if needed
        (task as any).selected = action.payload.includes(task.id);
      });
    },

    clearSelection: (state) => {
      state.tasks.forEach(task => {
        (task as any).selected = false;
      });
    },

    // State management
    clearError: (state) => {
      state.error = null;
    },

    resetTaskState: (state) => {
      state.currentTask = null;
      state.filters = {};
      state.error = null;
      state.page = 1;
    },

    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      // Get workspace tasks - FIXED
      .addCase(getWorkspaceTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getWorkspaceTasks.fulfilled, (state, action) => {
        state.loading = false;
        
        // The action.payload now always has the correct structure
        const { tasks, totalCount, hasMore, page } = action.payload;
        
        // Ensure tasks is an array
        state.tasks = Array.isArray(tasks) ? tasks : [];
        state.totalCount = totalCount || state.tasks.length;
        state.hasMore = hasMore || false;
        state.lastUpdated = new Date().toISOString();
        state.page = page || 1;
      })
      .addCase(getWorkspaceTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to load tasks';
        // Set empty array on error
        state.tasks = [];
        state.totalCount = 0;
      })

      // Get single task
      .addCase(getTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTask.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTask = action.payload;
      })
      .addCase(getTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to load task';
      })

      // Create task
      .addCase(createTask.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.creating = false;
        state.tasks.unshift(action.payload); // Add to beginning
        state.totalCount += 1;
      })
      .addCase(createTask.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string || 'Failed to create task';
      })

      // Update task
      .addCase(updateTask.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.tasks.findIndex(task => task.id === action.payload.id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
        
        if (state.currentTask?.id === action.payload.id) {
          state.currentTask = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string || 'Failed to update task';
      })

      // Delete task
      .addCase(deleteTask.pending, (state, action) => {
        state.deleting = action.meta.arg.taskId;
        state.error = null;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.deleting = null;
        state.tasks = state.tasks.filter(task => task.id !== action.payload);
        state.totalCount = Math.max(0, state.totalCount - 1);
        
        if (state.currentTask?.id === action.payload) {
          state.currentTask = null;
        }
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.deleting = null;
        state.error = action.payload as string || 'Failed to delete task';
      })

      // Bulk update tasks
      .addCase(bulkUpdateTasks.fulfilled, (state, action) => {
        const updatedTasks = Array.isArray(action.payload) ? action.payload : [];
        updatedTasks.forEach((updatedTask: Task) => {
          const index = state.tasks.findIndex(task => task.id === updatedTask.id);
          if (index !== -1) {
            state.tasks[index] = updatedTask;
          }
        });
      })
      .addCase(bulkUpdateTasks.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to update tasks';
      })

      // Duplicate task
      .addCase(duplicateTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(duplicateTask.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to duplicate task';
      })

      // Add comment
      .addCase(addTaskComment.fulfilled, (state, action) => {
        if (state.currentTask?.id === action.payload.task_id) {
          state.currentTask.comments = state.currentTask.comments || [];
          state.currentTask.comments.push(action.payload);
        }
      })
      .addCase(addTaskComment.rejected, (state, action) => {
        state.error = action.payload as string || 'Fa iled to add comment';
      });
  },
});

export const {
  setCurrentTask,
  setFilters,
  updateFilter,
  clearFilters,
  addTask,
  updateTaskInState,
  removeTask,
  optimisticUpdateTask,
  bulkSelectTasks,
  clearSelection,
  clearError,
  resetTaskState,
  setPage,
} = taskSlice.actions;

export default taskSlice.reducer;