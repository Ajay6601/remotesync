import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  UserPlusIcon, 
  CheckIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../../hooks/redux.ts';
import Button from '../ui/Button.tsx';
import Input from '../ui/Input.tsx';
import Modal from '../ui/Modal.tsx';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  is_online: boolean;
  connection_status?: string;
  mutual_connections: number;
}

interface UserSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const searchUsers = async () => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/connections/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        toast.error('Failed to search users');
      }
    } catch (error) {
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const sendConnectionRequest = async (userId: string, userName: string) => {
    setSendingRequest(userId);
    try {
      const response = await fetch('http://localhost:8000/api/connections/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          receiver_id: userId,
          message: `Hi ${userName}, I'd like to connect with you on RemoteSync!`
        }),
      });

      if (response.ok) {
        toast.success(`Connection request sent to ${userName}!`);
        setSearchResults(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, connection_status: 'pending' }
              : user
          )
        );
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to send connection request');
      }
    } catch (error) {
      toast.error('Failed to send connection request');
    } finally {
      setSendingRequest(null);
    }
  };

  const getConnectionButton = (user: User) => {
    switch (user.connection_status) {
      case 'accepted':
        return (
          <Button variant="secondary" size="sm" disabled>
            <CheckIcon className="h-4 w-4 mr-1" />
            Connected
          </Button>
        );
      case 'pending':
        return (
          <Button variant="secondary" size="sm" disabled>
            <ClockIcon className="h-4 w-4 mr-1" />
            Pending
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            onClick={() => sendConnectionRequest(user.id, user.full_name)}
            loading={sendingRequest === user.id}
          >
            <UserPlusIcon className="h-4 w-4 mr-1" />
            Connect
          </Button>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Find People" size="lg">
      <div className="space-y-6">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people by name, username, or email..."
            className="pl-10"
          />
        </div>

        {searchQuery.length === 0 && (
          <div className="text-center py-8">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Find People to Connect</h3>
            <p className="mt-2 text-gray-600">
              Search for colleagues, friends, or team members
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && searchQuery.length >= 2 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No users found matching "{searchQuery}"</p>
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      className="h-12 w-12 rounded-full"
                      src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
                      alt={user.full_name}
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{user.full_name}</h4>
                      <p className="text-sm text-gray-600">@{user.username}</p>
                    </div>
                  </div>
                  {getConnectionButton(user)}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default UserSearch;