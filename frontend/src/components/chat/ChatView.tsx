import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  FaceSmileIcon,
  HashtagIcon,
  VideoCameraIcon,
  PhoneIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { 
  getChannelMessages, 
  sendMessage, 
  addMessage, 
  setTyping, 
  updateMessage,
  deleteMessage,
  addReaction 
} from '../../store/slices/chatSlice.ts';
import { setCurrentChannel } from '../../store/slices/workspaceSlice.ts';
import { websocketService } from '../../services/websocket.ts';
import Button from '../ui/Button.tsx';
import VideoCall from '../video/VideoCall.tsx';
import EmojiPicker from './EmojiPicker.tsx';
import MessageEditor from './MessageEditor.tsx';
import toast from 'react-hot-toast';
import { WebSocketMessage, Message } from '../../types';

const ChatView: React.FC = () => {
  const { workspaceId, channelId } = useParams<{ workspaceId: string; channelId?: string }>();
  const [messageContent, setMessageContent] = useState('');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const dispatch = useAppDispatch();
  const { channels } = useAppSelector((state) => state.workspace);
  const { messages, typing } = useAppSelector((state) => state.chat);
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

  useEffect(() => {
    if (workspaceId) {
      websocketService.connect(workspaceId).catch(console.error);
    }
    return () => websocketService.disconnect();
  }, [workspaceId]);

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
    return () => websocketService.offMessage(handleWebSocketMessage);
  }, [dispatch, user?.id]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [messages[activeChannel?.id || '']]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !activeChannel) return;

    const content = messageContent.trim();
    setMessageContent('');
    
    if (isTyping) {
      setIsTyping(false);
      websocketService.sendTyping(activeChannel.id, false);
    }

    try {
      await dispatch(sendMessage({
        channelId: activeChannel.id,
        messageData: { content, message_type: 'text' },
      })).unwrap();
      websocketService.sendChatMessage(activeChannel.id, content);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setMessageContent(content);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(e.target.value);
    
    if (!isTyping && e.target.value.trim() && activeChannel) {
      setIsTyping(true);
      websocketService.sendTyping(activeChannel.id, true);
    }
    
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(
      setTimeout(() => {
        if (isTyping && activeChannel) {
          setIsTyping(false);
          websocketService.sendTyping(activeChannel.id, false);
        }
      }, 1000)
    );
  };

  const handleFileUpload = async (file: File) => {
    if (!activeChannel) return;
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`http://localhost:8000/api/chat/${activeChannel.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`File "${file.name}" uploaded successfully!`);
        
        const fileMessage = {
          id: result.message_id || Date.now().toString(),
          content: `📎 Shared file: ${file.name}`,
          encrypted_content: undefined,
          message_type: "file" as const,
          channel_id: activeChannel.id,
          user_id: user?.id || "",
          user_name: user?.username || "",
          user_avatar: user?.avatar_url,
          parent_message_id: undefined,
          is_edited: false,
          attachments: result.attachment,
          reactions: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          reply_count: 0,
        };
        
        dispatch(addMessage({
          channelId: activeChannel.id,
          message: fileMessage
        }));
      }
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageContent(prev => prev + emoji);
    setShowEmojiPicker(false);
    messageInputRef.current?.focus();
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await dispatch(addReaction({ messageId, emoji })).unwrap();
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await dispatch(updateMessage({
        messageId,
        messageData: { content: newContent }
      })).unwrap();
      setEditingMessage(null);
      toast.success('Message updated');
    } catch (error) {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await dispatch(deleteMessage(messageId)).unwrap();
      toast.success('Message deleted');
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  if (!activeChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No channel selected</h3>
          <p className="text-gray-600">Select a channel to start chatting</p>
        </div>
      </div>
    );
  }

  const channelMessages = messages[activeChannel.id] || [];
  const typingUsers = typing[activeChannel.id] || [];

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Fixed header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HashtagIcon className="h-5 w-5 text-gray-500" />
            <h2 className="text-xl font-bold text-gray-900">{activeChannel.name}</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="secondary" size="sm" onClick={() => toast.success('Audio call started!')}>
              <PhoneIcon className="h-4 w-4 mr-1" />Call
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowVideoCall(true)}>
              <VideoCameraIcon className="h-4 w-4 mr-1" />Video
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{ height: 'calc(100vh - 180px)' }}
      >
        {channelMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-600">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {channelMessages.map((message, index) => {
              const prevMessage = index > 0 ? channelMessages[index - 1] : null;
              const showAvatar = !prevMessage || 
                prevMessage.user_id !== message.user_id ||
                new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 5 * 60 * 1000;

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  showAvatar={showAvatar}
                  isOwnMessage={message.user_id === user?.id}
                  onReaction={handleReaction}
                  onEdit={() => setEditingMessage(message)}
                  onDelete={() => handleDeleteMessage(message.id)}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="sticky bottom-0 bg-white py-2">
            <TypingIndicator users={typingUsers} />
          </div>
        )}
      </div>

      {/* Fixed input area */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={messageContent}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder={`Message #${activeChannel.name}`}
              rows={1}
              className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
              style={{ minHeight: '48px' }}
            />
            
            <div className="absolute right-2 bottom-2 flex space-x-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
              >
                <PaperClipIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-md hover:bg-gray-100"
              >
                <FaceSmileIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={!messageContent.trim()}
            className="h-12"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </Button>
        </form>
        
        <input
          ref={fileInputRef}
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFileUpload(file);
              e.target.value = '';
            }
          }}
          accept="image/*,application/pdf,.doc,.docx,.txt"
        />
      </div>

      {/* Floating components */}
      <AnimatePresence>
        {showEmojiPicker && (
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingMessage && (
          <MessageEditor
            message={editingMessage}
            onSave={handleEditMessage}
            onCancel={() => setEditingMessage(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVideoCall && (
          <VideoCall
            callId={`call-${Date.now()}`}
            participants={['participant1']}
            onEndCall={() => setShowVideoCall(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// MessageItem Component - COMPLETE
interface MessageItemProps {
  message: Message;
  showAvatar: boolean;
  isOwnMessage: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ 
  message, 
  showAvatar, 
  isOwnMessage, 
  onReaction, 
  onEdit, 
  onDelete 
}) => {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const quickReactions = ['👍', '❤️', '😂', '😮'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative ${showAvatar ? 'mt-4' : 'mt-1'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {showAvatar ? (
            <img
              className="h-10 w-10 rounded-full"
              src={message.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${message.user_name}`}
              alt={message.user_name}
            />
          ) : (
            <div className="h-10 w-10" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {showAvatar && (
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-gray-900">{message.user_name}</span>
              <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
              {message.is_edited && <span className="text-xs text-gray-400">(edited)</span>}
            </div>
          )}

          <div className="text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </div>

          {message.attachments && message.message_type === 'file' && (
            <div className="mt-2 p-3 bg-gray-100 rounded-lg max-w-sm">
              <div className="flex items-center space-x-2">
                <PaperClipIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{message.attachments.filename}</p>
                  <p className="text-xs text-gray-500">{message.attachments.size && `${Math.round(message.attachments.size / 1024)} KB`}</p>
                </div>
              </div>
            </div>
          )}

          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => onReaction(message.id, emoji)}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
                >
                  <span>{emoji}</span>
                  <span className="text-xs text-gray-600">{userIds.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-0 right-0 flex items-center space-x-1 bg-white border border-gray-200 rounded-lg shadow-lg px-2 py-1"
          >
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReaction(message.id, emoji)}
                className="p-1 hover:bg-gray-100 rounded text-sm"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            
            {isOwnMessage && (
              <>
                <button onClick={onEdit} className="p-1 hover:bg-gray-100 rounded" title="Edit">
                  <PencilIcon className="h-4 w-4 text-gray-600" />
                </button>
                <button onClick={onDelete} className="p-1 hover:bg-gray-100 rounded" title="Delete">
                  <TrashIcon className="h-4 w-4 text-red-600" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Typing Indicator
interface TypingIndicatorProps {
  users: string[];
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    return `${users[0]} and ${users.length - 1} others are typing...`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-2 text-sm text-gray-500"
    >
      <div className="flex space-x-1">
        {[0, 0.2, 0.4].map((delay, i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.6, delay }}
            className="w-2 h-2 bg-gray-400 rounded-full"
          />
        ))}
      </div>
      <span>{getTypingText()}</span>
    </motion.div>
  );
};

export default ChatView;