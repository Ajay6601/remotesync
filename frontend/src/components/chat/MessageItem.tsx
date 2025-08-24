import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { EllipsisHorizontalIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  showAvatar: boolean;
  isOwnMessage: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, showAvatar, isOwnMessage }) => {
  const [showActions, setShowActions] = useState(false);

  const handleReaction = (emoji: string) => {
    // TODO: Implement reaction functionality
    console.log('Add reaction:', emoji, 'to message:', message.id);
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group relative ${showAvatar ? 'mt-4' : 'mt-1'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {showAvatar ? (
            <img
              className="h-10 w-10 rounded-full"
              src={message.user_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${message.user_name}`}
              alt={message.user_name}
            />
          ) : (
            <div className="h-10 w-10" /> /* Placeholder for alignment */
          )}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {showAvatar && (
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {message.user_name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(message.created_at)}
              </span>
              {message.is_edited && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  (edited)
                </span>
              )}
            </div>
          )}

          {/* Message text */}
          <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* Attachments */}
          {message.attachments && (
            <div className="mt-2">
              {message.message_type === 'image' && (
                <img
                  src={message.attachments.url}
                  alt={message.attachments.filename}
                  className="max-w-sm rounded-lg"
                />
              )}
              {message.message_type === 'file' && (
                <div className="flex items-center space-x-2 p-3 bg-gray-100 dark:bg-dark-700 rounded-lg max-w-sm">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {message.attachments.filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {message.attachments.size && `${Math.round(message.attachments.size / 1024)} KB`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-dark-700 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors duration-200"
                >
                  <span>{emoji}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {userIds.length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Reply count */}
          {message.reply_count > 0 && (
            <button className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1">
              <ArrowUturnLeftIcon className="h-4 w-4" />
              <span>{message.reply_count} repl{message.reply_count === 1 ? 'y' : 'ies'}</span>
            </button>
          )}
        </div>

        {/* Message actions */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-0 right-0 flex items-center space-x-1 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg shadow-lg px-2 py-1"
          >
            <button
              onClick={() => handleReaction('👍')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-dark-600 rounded text-sm"
            >
              👍
            </button>
            <button
              onClick={() => handleReaction('❤️')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-dark-600 rounded text-sm"
            >
              ❤️
            </button>
            <button
              onClick={() => handleReaction('😂')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-dark-600 rounded text-sm"
            >
              😂
            </button>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-dark-600 rounded">
              <ArrowUturnLeftIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            {isOwnMessage && (
              <button className="p-1 hover:bg-gray-100 dark:hover:bg-dark-600 rounded">
                <EllipsisHorizontalIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageItem;