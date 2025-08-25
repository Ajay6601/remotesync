import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  VideoCameraIcon,
  PhoneIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../../hooks/redux.ts';
import Button from '../ui/Button.tsx';
import toast from 'react-hot-toast';

interface DirectMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  is_read: boolean;
  created_at: string;
}

const DirectMessages: React.FC = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [friendInfo, setFriendInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (friendId) {
      loadMessages();
      loadFriendInfo();
    }
  }, [friendId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/dm/${friendId}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(result);
      } else {
        toast.error('Failed to load messages');
      }
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadFriendInfo = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/${friendId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setFriendInfo(result);
      }
    } catch (error) {
      console.error('Failed to load friend info');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !friendId) return;

    const content = messageContent.trim();
    setMessageContent('');

    try {
      const response = await fetch(`http://localhost:8000/api/dm/${friendId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          receiver_id: friendId,
          content,
          message_type: 'text'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(prev => [...prev, result]);
      } else {
        toast.error('Failed to send message');
        setMessageContent(content);
      }
    } catch (error) {
      toast.error('Failed to send message');
      setMessageContent(content);
    }
  };

  if (!friendInfo) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white max-h-screen">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.history.back()}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            
            <img
              className="h-10 w-10 rounded-full"
              src={friendInfo.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${friendInfo.username}`}
              alt={friendInfo.full_name}
            />
            
            <div>
              <h2 className="text-lg font-bold text-gray-900">{friendInfo.full_name}</h2>
              <p className="text-sm text-gray-600">@{friendInfo.username}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm">
              <PhoneIcon className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm">
              <VideoCameraIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-scroll px-6 py-4" style={{maxHeight: 'calc(100vh - 200px)'}}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">Start your conversation</h3>
                <p className="mt-2 text-gray-600">
                  Send a message to {friendInfo.full_name} to begin chatting
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                    message.sender_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <img
                      className="h-8 w-8 rounded-full"
                      src={message.sender_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${message.sender_name}`}
                      alt={message.sender_name}
                    />
                    
                    <div className={`px-4 py-2 rounded-lg ${
                      message.sender_id === user?.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                        {message.sender_id === user?.id && message.is_read && ' • Read'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={sendMessage} className="flex items-center space-x-3">
          <div className="flex-1">
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(e);
                }
              }}
              placeholder={`Message ${friendInfo.full_name}...`}
              rows={1}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ minHeight: '48px' }}
            />
          </div>
          
          <Button
            type="submit"
            disabled={!messageContent.trim()}
            className="h-12"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DirectMessages;