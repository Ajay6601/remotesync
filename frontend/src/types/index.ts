export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
  created_at: string;
  last_active?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  is_private: boolean;
  invite_code?: string;
  owner_id: string;
  member_count: number;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'text' | 'voice' | 'video';
  is_private: boolean;
  workspace_id: string;
  created_by: string;
  created_at: string;
}

export interface Message {
  id: string;
  content: string;
  encrypted_content?: string;
  message_type: 'text' | 'image' | 'file' | 'video' | 'audio' | 'system';
  channel_id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  parent_message_id?: string;
  is_edited: boolean;
  attachments?: any;
  reactions?: Record<string, string[]>;
  created_at: string;
  updated_at?: string;
  reply_count: number;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  encrypted_content?: string;
  version: number;
  is_public: boolean;
  is_archived: boolean;
  workspace_id: string;
  created_by: string;
  creator_name: string;
  created_at: string;
  updated_at?: string;
  collaborators: string[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  workspace_id: string;
  created_by: string;
  creator_name: string;
  assigned_to?: string;
  assignee_name?: string;
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}