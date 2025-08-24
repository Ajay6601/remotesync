import React, { useEffect } from 'react';
import { useParams, Routes, Route, Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { getWorkspace, getWorkspaceChannels, setCurrentWorkspace } from '../../store/slices/workspaceSlice.ts';
import { websocketService } from '../../services/websocket.ts';
import Sidebar from './Sidebar.tsx';
import ChatView from '../chat/ChatView.tsx';
import DocumentsView from '../documents/DocumentsView.tsx';
import TasksView from '../tasks/TasksView.tsx';
import LoadingSpinner from '../ui/LoadingSpinner.tsx';

const WorkspaceView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const dispatch = useAppDispatch();
  const { currentWorkspace, channels, loading } = useAppSelector((state) => state.workspace);

  useEffect(() => {
    if (workspaceId) {
      // Load workspace data
      dispatch(getWorkspace(workspaceId));
      dispatch(getWorkspaceChannels(workspaceId));
      
      // Connect to WebSocket
      websocketService.connect(workspaceId).catch(console.error);
    }

    return () => {
      websocketService.disconnect();
    };
  }, [workspaceId, dispatch]);

  useEffect(() => {
    if (currentWorkspace?.id !== workspaceId) {
      dispatch(setCurrentWorkspace(null));
    }
  }, [workspaceId, currentWorkspace, dispatch]);

  if (loading || !currentWorkspace) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-dark-900">
      {/* Sidebar */}
      <Sidebar workspace={currentWorkspace} channels={channels} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to={`/workspace/${workspaceId}/chat`} />} />
          <Route path="/chat" element={<ChatView />} />
          <Route path="/chat/:channelId" element={<ChatView />} />
          <Route path="/documents" element={<DocumentsView />} />
          <Route path="/documents/:documentId" element={<DocumentsView />} />
          <Route path="/tasks" element={<TasksView />} />
        </Routes>
      </div>
    </div>
  );
};

export default WorkspaceView;