import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '../hooks/redux.ts';
import Button from '../components/ui/Button.tsx';
import toast from 'react-hot-toast';

const JoinWorkspace: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const [loading, setLoading] = useState(false);
  const [workspaceInfo, setWorkspaceInfo] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  const handleJoinWorkspace = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in first');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/workspaces/join/${inviteCode}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setWorkspaceInfo(result.workspace);
        setJoined(true);
        toast.success('Successfully joined workspace!');
        
        setTimeout(() => {
          navigate(`/workspace/${result.workspace.id}`);
        }, 2000);
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to join workspace');
      }
    } catch (error) {
      toast.error('Failed to join workspace');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Workspace</h2>
          <p className="text-gray-600 mb-6">Please log in to join the workspace</p>
          <Button onClick={() => navigate('/login')}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center"
      >
        {!joined ? (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlusIcon className="h-8 w-8 text-blue-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Join Workspace
            </h2>
            
            <p className="text-gray-600 mb-6">
              You've been invited to join a workspace on RemoteSync
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                Joining as: <span className="font-medium">{user?.full_name}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {user?.email}
              </p>
            </div>
            
            <Button
              onClick={handleJoinWorkspace}
              loading={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Joining...' : 'Join Workspace'}
            </Button>
            
            <p className="text-xs text-gray-500 mt-4">
              By joining, you agree to collaborate respectfully with team members
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to {workspaceInfo?.name}!
            </h2>
            
            <p className="text-gray-600 mb-6">
              You've successfully joined the workspace. Redirecting...
            </p>
            
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default JoinWorkspace;