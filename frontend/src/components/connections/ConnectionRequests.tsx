import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserGroupIcon, 
  CheckIcon, 
  XMarkIcon,
  ClockIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../../hooks/redux.ts';
import Button from '../ui/Button.tsx';
import Modal from '../ui/Modal.tsx';
import toast from 'react-hot-toast';

interface ConnectionRequest {
  id: string;
  other_user: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  message?: string;
  created_at: string;
  type: 'sent' | 'received';
}

interface ConnectionRequestsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConnectionRequests: React.FC<ConnectionRequestsProps> = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadRequests = async (type: 'received' | 'sent') => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/connections/requests?type=${type}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setRequests(result);
      } else {
        toast.error('Failed to load connection requests');
      }
    } catch (error) {
      toast.error('Failed to load connection requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRequests(activeTab);
    }
  }, [isOpen, activeTab]);

  const handleAcceptRequest = async (requestId: string, userName: string) => {
    setActionLoading(requestId);
    try {
      const response = await fetch(`http://localhost:8000/api/connections/${requestId}/accept`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        toast.success(`You're now connected with ${userName}!`);
        loadRequests(activeTab);
      } else {
        toast.error('Failed to accept request');
      }
    } catch (error) {
      toast.error('Failed to accept request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (requestId: string, userName: string) => {
    setActionLoading(requestId);
    try {
      const response = await fetch(`http://localhost:8000/api/connections/${requestId}/decline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        toast.success(`Connection request from ${userName} declined`);
        loadRequests(activeTab);
      } else {
        toast.error('Failed to decline request');
      }
    } catch (error) {
      toast.error('Failed to decline request');
    } finally {
      setActionLoading(null);
    }
  };

  const receivedRequests = requests.filter(r => r.type === 'received');
  const sentRequests = requests.filter(r => r.type === 'sent');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Connection Requests" size="lg">
      <div className="space-y-6">
        {/* Tab navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'received'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BellIcon className="h-4 w-4" />
            <span>Received ({receivedRequests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ClockIcon className="h-4 w-4" />
            <span>Sent ({sentRequests.length})</span>
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading requests...</span>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {(activeTab === 'received' ? receivedRequests : sentRequests).length === 0 ? (
                <div className="text-center py-12">
                  {activeTab === 'received' ? (
                    <>
                      <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No pending requests</h3>
                      <p className="mt-2 text-gray-600">
                        When people send you connection requests, they'll appear here
                      </p>
                    </>
                  ) : (
                    <>
                      <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No sent requests</h3>
                      <p className="mt-2 text-gray-600">
                        Connection requests you send will appear here
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {(activeTab === 'received' ? receivedRequests : sentRequests).map((request, index) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          className="h-12 w-12 rounded-full"
                          src={request.other_user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${request.other_user.username}`}
                          alt={request.other_user.full_name}
                        />
                        
                        <div>
                          <h4 className="font-medium text-gray-900">{request.other_user.full_name}</h4>
                          <p className="text-sm text-gray-600">@{request.other_user.username}</p>
                          {request.message && (
                            <p className="text-sm text-gray-500 mt-1 italic">"{request.message}"</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {activeTab === 'received' ? (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDeclineRequest(request.id, request.other_user.full_name)}
                              loading={actionLoading === request.id}
                              disabled={actionLoading !== null}
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleAcceptRequest(request.id, request.other_user.full_name)}
                              loading={actionLoading === request.id}
                              disabled={actionLoading !== null}
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center space-x-1 text-gray-500">
                            <ClockIcon className="h-4 w-4" />
                            <span className="text-sm">Pending</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};

export default ConnectionRequests;