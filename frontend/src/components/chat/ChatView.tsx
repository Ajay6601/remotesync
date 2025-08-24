import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  FaceSmileIcon,
  HashtagIcon,
  VideoCameraIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { getChannelMessages, sendMessage } from '../../store/slices/chatSlice.ts';
import { setCurrentChannel } from '../../store/slices/workspaceSlice.ts';
import Button from '../ui/Button.tsx';
import VideoCall from '../video/VideoCall.tsx';
import toast from 'react-hot-toast';

const ChatView: React.FC = () => {
  const { workspaceId, channelId } = useParams<{ workspaceId: string; channelId?: string }>();
  const [messageContent, setMessageContent] = useState('');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const dispatch = useAppDispatch();
  const { channels, currentChannel } = useAppSelector((state) => state.workspace);
  const { messages } = useAppSelector((state) => state.chat);
  const { user } = useAppSelector((state) => state.auth);

  const activeChannel = channelId ? 
    channels.find(ch => ch.id === channelId) : 
    channels.find(ch => ch.name === 'general') || channels[0];

  useEffect(() => {
    if (activeChannel) {
      dispatch(setCurrentChannel(activeChannel));
      dispatch(getChannelMessages({ channelId: activeChannel.id }));
    }
  }, [activeChannel, dispatch]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageContent.trim() || !activeChannel) return;

    const content = messageContent.trim();
    setMessageContent('');

    try {
      await dispatch(sendMessage({
        channelId: activeChannel.id,
        messageData: {
          content,
          message_type: 'text',
        },
      })).unwrap();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setMessageContent(content);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChannel) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:8000/api/chat/${activeChannel.id}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success('File uploaded successfully!');
      } else {
        toast.error('Failed to upload file');
      }
    } catch (error) {
      toast.error('Failed to upload file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startVideoCall = () => {
    setShowVideoCall(true);
    toast.success('Video call started!');
  };

  const startAudioCall = () => {
    toast.success('Audio call started!');
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No channel selected
          </h3>
          <p className="text-gray-600">
            Select a channel from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  const channelMessages = messages[activeChannel.id] || [];

  return (
    <>
      <div className="flex-1 flex flex-col bg-white">
        {/* Channel header with VIDEO CALL BUTTONS */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HashtagIcon className="h-5 w-5 text-gray-500" />
              <h2 className="text-xl font-bold text-gray-900">
                {activeChannel.name}
              </h2>
            </div>
            
            {/* VIDEO CALL BUTTONS - ADDED HERE */}
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={startAudioCall}
                className="flex items-center space-x-1"
              >
                <PhoneIcon className="h-4 w-4" />
                <span>Call</span>
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={startVideoCall}
                className="flex items-center space-x-1"
              >
                <VideoCameraIcon className="h-4 w-4" />
                <span>Video</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Messages container */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {channelMessages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No messages yet
                  </h3>
                  <p className="text-gray-600">
                    Start the conversation by sending the first message!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {channelMessages.map((message) => (
                  <div key={message.id} className="flex items-start space-x-3">
                    <img
                      className="h-10 w-10 rounded-full"
                      src={message.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${message.user_name}`}
                      alt={message.user_name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {message.user_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-900 whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message input */}
          <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
              <div className="flex-1">
                <div className="relative">
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder={`Message #${activeChannel.name}`}
                    rows={1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none pr-20"
                    style={{ minHeight: '44px' }}
                  />
                  
                  <div className="absolute right-2 bottom-2 flex space-x-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <PaperClipIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    >
                      <FaceSmileIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={!messageContent.trim()}
                className="h-11"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </Button>
            </form>
            
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileUpload}
              accept="image/*,application/pdf,.doc,.docx,.txt"
            />
          </div>
        </div>
      </div>

      {/* Video Call Modal */}
      {showVideoCall && (
        <VideoCall
          participants={['user1', 'user2']}
          onEndCall={() => setShowVideoCall(false)}
        />
      )}
    </>
  );
};

export default ChatView;