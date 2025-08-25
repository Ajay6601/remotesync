import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  UsersIcon, 
  DocumentTextIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { getWorkspaces, createWorkspace } from '../../store/slices/workspaceSlice.ts';
import { logout } from '../../store/slices/authSlice.ts';
import Button from '../ui/Button.tsx';
import Input from '../ui/Input.tsx';
import Modal from '../ui/Modal.tsx';
import UserSearch from '../connections/UserSearch.tsx';
import ConnectionRequests from '../connections/ConnectionRequests.tsx';
import FriendsList from '../connections/FriendsList.tsx';

const Dashboard: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { workspaces, loading } = useAppSelector((state) => state.workspace);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getWorkspaces());
    loadPendingRequests();
  }, [dispatch]);

  const loadPendingRequests = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/connections/requests?type=received', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPendingRequestsCount(result.length);
      }
    } catch (error) {
      console.error('Failed to load pending requests');
    }
  };

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
        is_private: true,
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with connection features */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">RemoteSync</h1>
              
              {/* Connection features */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowUserSearch(true)}
                  className="flex items-center space-x-1"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>Find People</span>
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRequests(true)}
                  className="flex items-center space-x-1 relative"
                >
                  <BellIcon className="h-4 w-4" />
                  <span>Requests</span>
                  {pendingRequestsCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingRequestsCount}
                    </span>
                  )}
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFriends(true)}
                  className="flex items-center space-x-1"
                >
                  <UserGroupIcon className="h-4 w-4" />
                  <span>Friends</span>
                </Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  className="h-8 w-8 rounded-full"
                  src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
                  alt={user?.full_name}
                />
                <span className="text-sm font-medium text-gray-700">
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
              <h2 className="text-3xl font-bold text-gray-900">
                Your Workspaces
              </h2>
              <p className="mt-2 text-gray-600">
                Collaborate with your team in organized workspaces
              </p>
            </div>
            
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              New Workspace
            </Button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowUserSearch(true)}
              className="p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <MagnifyingGlassIcon className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-blue-900">Find People</h3>
              <p className="text-sm text-blue-700 mt-1">
                Search and connect with colleagues
              </p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowRequests(true)}
              className="p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left relative"
            >
              <BellIcon className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-semibold text-green-900">Connection Requests</h3>
              <p className="text-sm text-green-700 mt-1">
                Manage incoming and outgoing requests
              </p>
              {pendingRequestsCount > 0 && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setShowFriends(true)}
              className="p-6 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left"
            >
              <UserGroupIcon className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-semibold text-purple-900">Your Connections</h3>
              <p className="text-sm text-purple-700 mt-1">
                Chat and collaborate with friends
              </p>
            </motion.button>
          </div>

          {/* Workspaces grid */}
          {workspaces.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No workspaces yet
              </h3>
              <p className="mt-2 text-gray-600">
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
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {workspace.name}
                    </h3>
                    {workspace.is_private && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Private
                      </span>
                    )}
                  </div>
                  
                  {workspace.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
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

      {/* Modals */}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={workspaceDescription}
              onChange={(e) => setWorkspaceDescription(e.target.value)}
              placeholder="Describe your workspace"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
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

      <UserSearch isOpen={showUserSearch} onClose={() => setShowUserSearch(false)} />
      <ConnectionRequests isOpen={showRequests} onClose={() => setShowRequests(false)} />
      <FriendsList isOpen={showFriends} onClose={() => setShowFriends(false)} />
    </div>
  );
};

export default Dashboard;