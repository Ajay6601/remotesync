import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice.ts';
import workspaceSlice from './slices/workspaceSlice.ts';
import chatSlice from './slices/chatSlice.ts';
import documentSlice from './slices/documentSlice.ts';
import taskSlice from './slices/taskSlice.ts';
import uiSlice from './slices/uiSlice.ts';

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