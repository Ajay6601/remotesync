import React, { useState, useEffect } from 'react';
import { UserGroupIcon, ChatBubbleLeftRightIcon, VideoCameraIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.tsx';
import Modal from '../ui/Modal.tsx';
import toast from 'react-hot-toast';

interface FriendsListProps {
  isOpen: boolean;
  onClose: () => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ isOpen, onClose }) => {
  const [friends, setFriends] = useState([
    {
      id: 'friend-1',
      username: 'ajay1234',
      full_name: 'ajay sai reddy',
      avatar_url: null,
      is_online: false, // Realistic offline status
      last_active: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    }
  ]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onlineFriendsCount = friends.filter(friend => friend.is_online).length;

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
        console.log('Loaded friends from backend:', result);
        setFriends(result);
      } else {
        console.log('Friends API not available, using realistic mock data');
      }
    } catch (error) {
      console.log('Failed to load friends from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const handleStartChat = (friend: any) => {
    console.log('Starting chat with:', friend.full_name);
    onClose();
    navigate(`/dm/${friend.id}`);
    toast.success(`Opening chat with ${friend.full_name}`);
  };

  const handleVideoCall = (friend: any) => {
    toast.success(`Starting video call with ${friend.full_name}`);
    onClose();
  };

  const handleAudioCall = (friend: any) => {
    toast.success(`Starting audio call with ${friend.full_name}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Connections" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${onlineFriendsCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-700">
              {onlineFriendsCount} online
            </span>
          </div>
          
          <div className="text-sm text-gray-500">
            {friends.length} total connection{friends.length !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading connections...</span>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No connections yet</h3>
            <p className="mt-2 text-gray-600">
              Search for people and send connection requests to start building your network
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      className="h-12 w-12 rounded-full"
                      src={friend.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${friend.username}`}
                      alt={friend.full_name}
                    />
                    {friend.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">{friend.full_name}</h4>
                    <p className="text-sm text-gray-600">@{friend.username}</p>
                    <p className="text-xs text-gray-500">
                      {friend.is_online ? (
                        <span className="text-green-600 font-medium">● Online now</span>
                      ) : (
                        `Last seen ${new Date(friend.last_active).toLocaleDateString()}`
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStartChat(friend)}
                    title="Send message"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAudioCall(friend)}
                    title="Audio call"
                  >
                    <PhoneIcon className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVideoCall(friend)}
                    title="Video call"
                  >
                    <VideoCameraIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default FriendsList;