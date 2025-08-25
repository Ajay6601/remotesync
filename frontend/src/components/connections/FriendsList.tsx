import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  VideoCameraIcon,
  PhoneIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.tsx';
import Modal from '../ui/Modal.tsx';
import toast from 'react-hot-toast';

interface Friend {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  is_online: boolean;
  last_active?: string;
  connected_at?: string;
}

interface FriendsListProps {
  isOpen: boolean;
  onClose: () => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ isOpen, onClose }) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const loadFriends = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/connections/friends', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFriends(result);
      } else {
        toast.error('Failed to load friends');
      }
    } catch (error) {
      toast.error('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const startDirectMessage = (friendId: string, friendName: string) => {
    onClose();
    navigate(`/dm/${friendId}`);
    toast.success(`Starting conversation with ${friendName}`);
  };

  const startVideoCall = (friendId: string, friendName: string) => {
    toast.success(`Starting video call with ${friendName}`);
    // Implement video call logic
  };

  const startAudioCall = (friendId: string, friendName: string) => {
    toast.success(`Starting audio call with ${friendName}`);
    // Implement audio call logic
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Connections" size="lg">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading friends...</span>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No connections yet</h3>
            <p className="mt-2 text-gray-600">
              Search for people and send connection requests to start collaborating
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {friends.length} connection{friends.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs">
                  {friends.filter(f => f.is_online).length} online
                </span>
              </div>
            </div>

            {friends.map((friend, index) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      className="h-12 w-12 rounded-full"
                      src={friend.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.username}`}
                      alt={friend.full_name}
                    />
                    {friend.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900">{friend.full_name}</h4>
                    <p className="text-sm text-gray-600">@{friend.username}</p>
                    <p className="text-xs text-gray-500">
                      {friend.is_online ? (
                        <span className="text-green-600 font-medium">Online now</span>
                      ) : (
                        `Last seen ${friend.last_active ? new Date(friend.last_active).toLocaleDateString() : 'Never'}`
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startDirectMessage(friend.id, friend.full_name)}
                    title="Send message"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startAudioCall(friend.id, friend.full_name)}
                    title="Audio call"
                  >
                    <PhoneIcon className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => startVideoCall(friend.id, friend.full_name)}
                    title="Video call"
                  >
                    <VideoCameraIcon className="h-4 w-4" />
                  </Button>
                  
                  <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <EllipsisHorizontalIcon className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FriendsList;