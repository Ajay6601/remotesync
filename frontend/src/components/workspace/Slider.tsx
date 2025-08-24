import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PlusIcon,
  HashtagIcon,
  SpeakerWaveIcon,
  VideoCameraIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { logout } from '../../store/slices/authSlice.ts';
import { createChannel } from '../../store/slices/workspaceSlice.ts';
import { Workspace, Channel } from '../../types';
import Button from '../ui/Button.tsx';
import Modal from '../ui/Modal.tsx';
import Input from '../ui/Input.tsx';
import toast from 'react-hot-toast';

interface SidebarProps {
  workspace: Workspace;
  channels: Channel[];
}

const Sidebar: React.FC<SidebarProps> = ({ workspace, channels }) => {
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice' | 'video'>('text');
  const [isPrivate, setIsPrivate] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId } = useParams();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { loading } = useAppSelector((state) => state.workspace);

  const isActive = (path: string) => location.pathname.includes(path);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channelName.trim() || !workspaceId) {
      toast.error('Channel name is required');
      return;
    }

    try {
      await dispatch(createChannel({
        workspaceId,
        channelData: {
          name: channelName.trim().toLowerCase().replace(/\s+/g, '-'),
          type: channelType,
          is_private: isPrivate,
        },
      })).unwrap();
      
      toast.success('Channel created successfully!');
      setShowCreateChannel(false);
      setChannelName('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create channel');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'voice':
        return <SpeakerWaveIcon className="h-4 w-4" />;
      case 'video':
        return <VideoCameraIcon className="h-4 w-4" />;
      default:
        return <HashtagIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-64 bg-dark-800 flex flex-col">
      {/* Workspace header */}
      <div className="px-4 py-4 border-b border-dark-700">
        <h1 className="text-white font-bold text-lg truncate">
          {workspace.name}
        </h1>
        <p className="text-dark-300 text-sm truncate">
          {workspace.member_count} member{workspace.member_count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-4 space-y-1">
          {/* Main navigation */}
          <nav className="space-y-1">
            <motion.button
              whileHover={{ x: 4 }}
              onClick={() => navigate(`/workspace/${workspaceId}/chat`)}
              className={`sidebar-item w-full text-left ${isActive('/chat') ? 'active' : ''}`}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              <span>Chat</span>
            </motion.button>

            <motion.button
              whileHover={{ x: 4 }}
              onClick={() => navigate(`/workspace/${workspaceId}/documents`)}
              className={`sidebar-item w-full text-left ${isActive('/documents') ? 'active' : ''}`}
            >
              <DocumentTextIcon className="h-5 w-5" />
              <span>Documents</span>
            </motion.button>

            <motion.button
              whileHover={{ x: 4 }}
              onClick={() => navigate(`/workspace/${workspaceId}/tasks`)}
              className={`sidebar-item w-full text-left ${isActive('/tasks') ? 'active' : ''}`}
            >
              <CheckCircleIcon className="h-5 w-5" />
              <span>Tasks</span>
            </motion.button>
          </nav>

          {/* Channels section */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-dark-300 text-xs font-semibold uppercase tracking-wider">
                Channels
              </h3>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="text-dark-400 hover:text-dark-200 transition-colors duration-200"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {channels.map((channel) => (
                <motion.button
                  key={channel.id}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`/workspace/${workspaceId}/chat/${channel.id}`)}
                  className={`sidebar-item w-full text-left ${
                    location.pathname.includes(channel.id) ? 'active' : ''
                  }`}
                >
                  {getChannelIcon(channel.type)}
                  <span className="truncate">{channel.name}</span>
                  {channel.is_private && (
                    <span className="ml-auto text-xs text-dark-400">🔒</span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* User section */}
      <div className="px-4 py-4 border-t border-dark-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              className="h-8 w-8 rounded-full"
              src={user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
              alt={user?.full_name}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.full_name}
              </p>
              <p className="text-dark-300 text-xs truncate">
                @{user?.username}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-1">
            <button className="p-1 text-dark-400 hover:text-dark-200 transition-colors duration-200">
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1 text-dark-400 hover:text-red-400 transition-colors duration-200"
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Create channel modal */}
      <Modal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        title="Create New Channel"
      >
        <form onSubmit={handleCreateChannel} className="space-y-4">
          <Input
            label="Channel Name"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="e.g. general, random, announcements"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channel Type
            </label>
            <div className="space-y-2">
              {[
                { value: 'text', label: 'Text Channel', icon: HashtagIcon },
                { value: 'voice', label: 'Voice Channel', icon: SpeakerWaveIcon },
                { value: 'video', label: 'Video Channel', icon: VideoCameraIcon },
              ].map(({ value, label, icon: Icon }) => (
                <label key={value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="channelType"
                    value={value}
                    checked={channelType === value}
                    onChange={(e) => setChannelType(e.target.value as 'text' | 'voice' | 'video')}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <Icon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="channelPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="channelPrivate" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Make this channel private
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateChannel(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Channel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Sidebar;
