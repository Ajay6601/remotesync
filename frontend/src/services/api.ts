import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const response = await this.api.post('/auth/refresh', {
                refresh_token: refreshToken,
              });
              const { access_token, refresh_token: newRefreshToken } = response.data;
              localStorage.setItem('access_token', access_token);
              localStorage.setItem('refresh_token', newRefreshToken);
              
              // Retry original request
              error.config.headers.Authorization = `Bearer ${access_token}`;
              return this.api.request(error.config);
            } catch (refreshError) {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }
          } else {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async register(userData: {
    email: string;
    username: string;
    full_name: string;
    password: string;
  }) {
    const response = await this.api.post('/auth/register', userData);
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Workspace methods
  async getWorkspaces() {
    const response = await this.api.get('/workspaces/');
    return response.data;
  }

  async createWorkspace(workspaceData: {
    name: string;
    description?: string;
    is_private: boolean;
  }) {
    const response = await this.api.post('/workspaces/', workspaceData);
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    const response = await this.api.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async getWorkspaceChannels(workspaceId: string) {
    const response = await this.api.get(`/workspaces/${workspaceId}/channels`);
    return response.data;
  }

  async createChannel(workspaceId: string, channelData: {
    name: string;
    description?: string;
    type: 'text' | 'voice' | 'video';
    is_private: boolean;
  }) {
    const response = await this.api.post(`/workspaces/${workspaceId}/channels`, channelData);
    return response.data;
  }

  // Chat methods
  async getChannelMessages(channelId: string, limit = 50, before?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (before) params.append('before', before);
    
    const response = await this.api.get(`/chat/${channelId}/messages?${params}`);
    return response.data;
  }

  async sendMessage(channelId: string, messageData: {
    content: string;
    encrypted_content?: string;
    message_type?: 'text' | 'image' | 'file';
    parent_message_id?: string;
  }) {
    const response = await this.api.post(`/chat/${channelId}/messages`, messageData);
    return response.data;
  }

  async updateMessage(messageId: string, messageData: {
    content: string;
    encrypted_content?: string;
  }) {
    const response = await this.api.put(`/chat/messages/${messageId}`, messageData);
    return response.data;
  }

  async deleteMessage(messageId: string) {
    const response = await this.api.delete(`/chat/messages/${messageId}`);
    return response.data;
  }

  async addReaction(messageId: string, emoji: string) {
    const response = await this.api.post(`/chat/messages/${messageId}/reactions`, { emoji });
    return response.data;
  }

  // Document methods
  async getWorkspaceDocuments(workspaceId: string) {
    const response = await this.api.get(`/documents/${workspaceId}/documents`);
    return response.data;
  }

  async createDocument(workspaceId: string, documentData: {
    title: string;
    content?: string;
    encrypted_content?: string;
    is_public: boolean;
  }) {
    const response = await this.api.post(`/documents/${workspaceId}/documents`, documentData);
    return response.data;
  }

  async getDocument(documentId: string) {
    const response = await this.api.get(`/documents/documents/${documentId}`);
    return response.data;
  }

  async updateDocument(documentId: string, documentData: {
    title?: string;
    content?: string;
    encrypted_content?: string;
    is_public?: boolean;
  }) {
    const response = await this.api.put(`/documents/documents/${documentId}`, documentData);
    return response.data;
  }

  async applyDocumentOperation(documentId: string, operationData: {
    operation_type: string;
    position: number;
    content?: string;
    length?: number;
    document_version: number;
  }) {
    const response = await this.api.post(`/documents/documents/${documentId}/operations`, operationData);
    return response.data;
  }

  async getDocumentOperations(documentId: string, sinceVersion = 0) {
    const response = await this.api.get(`/documents/documents/${documentId}/operations?since_version=${sinceVersion}`);
    return response.data;
  }

  // Task methods
  async getWorkspaceTasks(workspaceId: string, status?: string, assignedTo?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (assignedTo) params.append('assigned_to', assignedTo);
    
    const response = await this.api.get(`/tasks/${workspaceId}/tasks?${params}`);
    return response.data;
  }

  async createTask(workspaceId: string, taskData: {
    title: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'in_review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigned_to?: string;
    due_date?: string;
    tags?: string[];
  }) {
    const response = await this.api.post(`/tasks/${workspaceId}/tasks`, taskData);
    return response.data;
  }

  async updateTask(workspaceId: string, taskId: string, taskData: {
    title?: string;
    description?: string;
    status?: 'todo' | 'in_progress' | 'in_review' | 'done';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigned_to?: string;
    due_date?: string;
    tags?: string[];
  }) {
    const response = await this.api.put(`/tasks/${workspaceId}/tasks/${taskId}`, taskData);
    return response.data;
  }

  async deleteTask(workspaceId: string, taskId: string) {
    const response = await this.api.delete(`/tasks/${workspaceId}/tasks/${taskId}`);
    return response.data;
  }

  // User methods
  async searchUsers(query: string) {
    const response = await this.api.post('/users/search', { query });
    return response.data;
  }

  async updateCurrentUser(userData: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
  }) {
    const response = await this.api.put('/users/me', userData);
    return response.data;
  }
}

export const apiService = new ApiService();