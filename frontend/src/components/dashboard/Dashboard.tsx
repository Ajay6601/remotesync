import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon, UsersIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { getWorkspaces, createWorkspace } from '../../store/slices/workspaceSlice';
import { logout } from '../../store/slices/authSlice';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';

const Dashboard: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { workspaces, loading } = useAppSelector((state) => state.workspace);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getWorkspaces());
  }, [dispatch]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      toast.error('Workspace name is required');
      return;
    }

    try {
      const newWorkspace = await dispatch(createWorkspace({
        name: workspaceName.trim(),
        description: workspaceDescription.trim() || undefined,
        is_private: isPrivate,
      })).unwrap();
      
      toast.success('Workspace created successfully!');
      setShowCreateModal(false);
      setWorkspaceName('');
      setWorkspaceDescription('');
      navigate(`/workspace/${newWorkspace.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create workspace');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Logged out successfully');
  };

  if (loading && workspaces.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Header */}
      <header className="bg-white dark:bg-dark-800 shadow-sm border-b border-gray-200 dark:border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                RemoteSync
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  className="h-8 w-8 rounded-full"
                  src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
                  alt={user?.full_name}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.full_name}
                </span>
              </div>
              
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Workspaces
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Collaborate with your team in organized workspaces
              </p>
            </div>
            
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              New Workspace
            </Button>
          </div>

          {/* Workspaces grid */}
          {workspaces.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                No workspaces yet
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Create your first workspace to start collaborating with your team
              </p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Workspace
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace, index) => (
                <motion.div
                  key={workspace.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card p-6 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {workspace.name}
                    </h3>
                    {workspace.is_private && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-dark-700 dark:text-gray-300">
                        Private
                      </span>
                    )}
                  </div>
                  
                  {workspace.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      {workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}
                    </div>
                    <span>
                      {new Date(workspace.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create workspace modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Workspace"
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Workspace Name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Enter workspace name"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={workspaceDescription}
              onChange={(e) => setWorkspaceDescription(e.target.value)}
              placeholder="Describe your workspace"
              rows={3}
              className="input-field resize-none"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isPrivate" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Make this workspace private
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;

