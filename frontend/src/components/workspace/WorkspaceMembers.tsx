import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  UserPlusIcon, 
  UserIcon, 
  StarIcon , 
  ShieldCheckIcon,
  EllipsisHorizontalIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAppSelector } from '../../hooks/redux.ts';
import Button from '../ui/Button.tsx';
import Modal from '../ui/Modal.tsx';
import InviteModal from './invite/InviteModal.tsx';
import toast from 'react-hot-toast';

interface Member {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  joined_at: string;
  last_active?: string;
  is_online: boolean;
}

interface WorkspaceMembersProps {
  workspaceId: string;
  workspaceName: string;
}

const WorkspaceMembers: React.FC<WorkspaceMembersProps> = ({ workspaceId, workspaceName }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user } = useAppSelector((state) => state.auth);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/workspaces/${workspaceId}/members`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setMembers(result);
      } else {
        toast.error('Failed to load members');
      }
    } catch (error) {
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadMembers();
    }
  }, [workspaceId]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <StarIcon  className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <ShieldCheckIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || colors.member}`}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </span>
    );
  };

  const currentUserRole = members.find(m => m.id === user?.id)?.role;
  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <>
      {/* Members trigger button */}
      <div className="flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowMembersModal(true)}
          className="flex items-center space-x-1"
        >
          <UserIcon className="h-4 w-4" />
          <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
        </Button>
        
        {canInvite && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-1"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Invite</span>
          </Button>
        )}
      </div>

      {/* Members list modal */}
      <Modal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        title={`${workspaceName} Members`}
        size="lg"
      >
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
                </p>
                {canInvite && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowMembersModal(false);
                      setShowInviteModal(true);
                    }}
                  >
                    <UserPlusIcon className="h-4 w-4 mr-1" />
                    Invite People
                  </Button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.username}`}
                          alt={member.full_name}
                        />
                        {member.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{member.full_name}</h4>
                          {member.id === user?.id && (
                            <span className="text-xs text-gray-500">(You)</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">@{member.username}</p>
                        <p className="text-xs text-gray-500">
                          {member.is_online ? 'Online' : `Last seen ${member.last_active ? new Date(member.last_active).toLocaleDateString() : 'Never'}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {getRoleBadge(member.role)}
                      
                      {canInvite && member.id !== user?.id && (
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <EllipsisHorizontalIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Invite modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />
    </>
  );
};

export default WorkspaceMembers;