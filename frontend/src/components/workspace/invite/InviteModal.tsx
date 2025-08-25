import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  UserPlusIcon, 
  LinkIcon, 
  EnvelopeIcon,
  ClipboardDocumentIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux.ts';
import Button from '../../ui/Button.tsx';
import Input from '../../ui/Input.tsx';
import Modal from '../../ui/Modal.tsx';
import toast from 'react-hot-toast';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

const InviteModal: React.FC<InviteModalProps> = ({ 
  isOpen, 
  onClose, 
  workspaceId, 
  workspaceName 
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'link'>('email');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviteLink, setInviteLink] = useState('');
  const [linkExpiry, setLinkExpiry] = useState(7);
  const [maxUses, setMaxUses] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { user } = useAppSelector((state) => state.auth);

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Invitation sent to ${inviteEmail}!`);
        setInviteEmail('');
        
        // If user exists, they're added immediately
        if (result.status === 'accepted') {
          toast.success(`${inviteEmail} has been added to the workspace!`);
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInviteLink = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/workspaces/${workspaceId}/invite-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          expires_in_days: linkExpiry,
          max_uses: maxUses ? parseInt(maxUses) : null
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setInviteLink(result.invite_url);
        toast.success('Invite link created!');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create invite link');
      }
    } catch (error) {
      toast.error('Failed to create invite link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite People" size="lg">
      <div className="space-y-6">
        {/* Tab navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'email'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <EnvelopeIcon className="h-4 w-4" />
            <span>Send Email Invite</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'link'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            <span>Create Invite Link</span>
          </button>
        </div>

        {/* Email invite tab */}
        {activeTab === 'email' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <UserPlusIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Invite by Email</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Send an invitation directly to someone's email address
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleEmailInvite} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="member">Member - Can participate in conversations</option>
                  <option value="admin">Admin - Can manage workspace and invite others</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Invite link tab */}
        {activeTab === 'link' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <LinkIcon className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-green-900">Create Invite Link</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Generate a shareable link that anyone can use to join
                  </p>
                </div>
              </div>
            </div>

            {!inviteLink ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expires in (days)
                    </label>
                    <select
                      value={linkExpiry}
                      onChange={(e) => setLinkExpiry(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1 day</option>
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={365}>1 year</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max uses (optional)
                    </label>
                    <Input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      placeholder="Unlimited"
                      min="1"
                    />
                  </div>
                </div>
                
                <Button
                  onClick={handleCreateInviteLink}
                  loading={loading}
                  className="w-full"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Generate Invite Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invite Link
                  </label>
                  <div className="flex space-x-2">
                    <div className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-900">
                      {inviteLink}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={copyToClipboard}
                      className="flex-shrink-0"
                    >
                      {copied ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">
                    📅 Expires in {linkExpiry} day{linkExpiry !== 1 ? 's' : ''}
                    {maxUses && ` • 🔢 Max ${maxUses} uses`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Anyone with this link can join "{workspaceName}" as a member
                  </p>
                </div>
                
                <Button
                  variant="secondary"
                  onClick={() => setInviteLink('')}
                  className="w-full"
                >
                  Create New Link
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Modal>
  );
};

export default InviteModal;