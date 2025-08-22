import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon, PaperClipIcon, FaceSmileIcon } from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { getChannelMessages, sendMessage, addMessage, setTyping } from '../../store/slices/chatSlice';
import { setCurrentChannel } from '../../store/slices/workspaceSlice';
import { websocketService } from '../../services/websocket';
import { encryptionService } from '../../services/encryption';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import Button from '../ui/Button';
import { WebSocketMessage } from '../../types';

const ChatView: React.FC = () => {
  const { workspaceId, channelId } = useParams<{ workspaceId: string; channelId?: string }>();
  const [messageContent, setMessageContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const dispatch = useAppDispatch();
  const { channels, currentChannel } = useAppSelector((state) => state.workspace);
  const { messages, typing } = useAppSelector((state) => state.chat);
  const { user } = useAppSelector((state) => state.auth);

  // Get current channel or default to first channel
  const activeChannel = channelId ? 
    channels.find(ch => ch.id === channelId) : 
    channels.find(ch => ch.name === 'general') || channels[0];

  useEffect(() => {
    if (activeChannel) {
      dispatch(setCurrentChannel(activeChannel));
      dispatch(getChannelMessages({ channelId: activeChannel.id }));
    }
  }, [activeChannel, dispatch]);

  // Set up WebSocket message handler
  useEffect(() => {
    const handleWebSocketMessage = (message: WebSocketMessage) => {
      switch (message.type) {
        case 'chat_message':
          if (message.user_id !== user?.id) {
            dispatch(addMessage({
              channelId: message.channel_id,
              message: {
                id: message.id,
                content: message.content,
                encrypted_content: message.encrypted_content,
                message_type: message.message_type || 'text',
                channel_id: message.channel_id,
                user_id: message.user_id,
                user_name: message.user_name,
                user_avatar: message.user_avatar,
                parent_message_id: message.parent_message_id,
                is_edited: false,
                attachments: message.attachments,
                reactions: message.reactions || {},
                created_at: message.timestamp,
                updated_at: message.timestamp,
                reply_count: 0,
              }
            }));
          }
          break;
        
        case 'typing':
          if (message.user_id !== user?.id) {
            dispatch(setTyping({
              channelId: message.channel_id,
              userId: message.user_id,
              isTyping: message.is_typing,
            }));
          }
          break;
      }
    };

    websocketService.onMessage(handleWebSocketMessage);
    
    return () => {
      websocketService.offMessage(handleWebSocketMessage);
    };
  }, [dispatch, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageContent.trim() || !activeChannel) return;

    const content = messageContent.trim();
    setMessageContent('');
    
    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      websocketService.sendTyping(activeChannel.id, false);
    }

    try {
      // Encrypt message for end-to-end encryption
      const encryptedContent = encryptionService.encryptMessage(content);
      
      await dispatch(sendMessage({
        channelId: activeChannel.id,
        messageData: {
          content,
          encrypted_content: encryptedContent || undefined,
          message_type: 'text',
        },
      })).unwrap();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message content on error
      setMessageContent(content);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(e.target.value);
    
    // Handle typing indicator
    if (!isTyping && e.target.value.trim() && activeChannel) {
      setIsTyping(true);
      websocketService.sendTyping(activeChannel.id, true);
    }
    
    // Clear typing timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && activeChannel) {
        setIsTyping(false);
        websocketService.sendTyping(activeChannel.id, false);
      }
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-dark-900">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No channel selected
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select a channel from the sidebar to start chatting
          </p>
        </div>
      </div>
    );
  }

  const channelMessages = messages[activeChannel.id] || [];
  const typingUsers = typing[activeChannel.id] || [];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-dark-900">
      {/* Channel header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-gray-500 dark:text-gray-400 text-xl">
              {activeChannel.type === 'voice' ? '🔊' : 
               activeChannel.type === 'video' ? '📹' : '#'}
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {activeChannel.name}
            </h2>
            {activeChannel.is_private && (
              <span className="text-xs text-gray-500 dark:text-gray-400">🔒</span>
            )}
          </div>
          
          {activeChannel.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {activeChannel.description}
            </p>
          )}
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <MessageList messages={channelMessages} currentUserId={user?.id || ''} />
          <TypingIndicator users={typingUsers} />
        </div>

        {/* Message input */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
          <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  ref={messageInputRef}
                  value={messageContent}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message #${activeChannel.name}`}
                  rows={1}
                  className="input-field resize-none max-h-32 pr-20"
                  style={{ minHeight: '44px' }}
                />
                
                {/* Emoji and attachment buttons */}
                <div className="absolute right-2 bottom-2 flex space-x-1">
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  >
                    <PaperClipIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
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
        </div>
      </div>
    </div>
  );
};

export default ChatView;