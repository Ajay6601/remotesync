import React from 'react';
import { motion } from 'framer-motion';
import { PhoneIcon, PhoneXMarkIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button';

interface CallNotificationProps {
  callerName: string;
  callType: 'video' | 'audio';
  onAccept: () => void;
  onDecline: () => void;
}

const CallNotification: React.FC<CallNotificationProps> = ({
  callerName,
  callType,
  onAccept,
  onDecline,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}
      className="fixed top-4 right-4 z-50 bg-white dark:bg-dark-800 rounded-lg shadow-xl border border-gray-200 dark:border-dark-700 p-6 min-w-80"
    >
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-lg">
            {callerName.charAt(0).toUpperCase()}
          </span>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Incoming {callType} call
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {callerName} is calling you
          </p>
        </div>
      </div>

      <div className="flex space-x-3">
        <Button
          onClick={onAccept}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <PhoneIcon className="h-5 w-5 mr-2" />
          Accept
        </Button>
        
        <Button
          variant="danger"
          onClick={onDecline}
          className="flex-1"
        >
          <PhoneXMarkIcon className="h-5 w-5 mr-2" />
          Decline
        </Button>
      </div>
    </motion.div>
  );
};

export default CallNotification;