import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/api.ts';
import { Document } from '../../types';

interface CollaborativeOperation {
  id: string;
  operation_type: 'insert' | 'delete' | 'replace';
  position: number;
  content?: string;
  length?: number;
  document_version: number;
  user_id: string;
  user_name: string;
  timestamp: string;
}

interface DocumentCollaborator {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  cursor_position?: number;
  is_active: boolean;
}

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  collaborativeOperations: CollaborativeOperation[];
  collaborators: DocumentCollaborator[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSaved: string | null;
  unsavedChanges: boolean;
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  collaborativeOperations: [],
  collaborators: [],
  loading: false,
  saving: false,
  error: null,
  lastSaved: null,
  unsavedChanges: false,
};

// Async thunks
export const getWorkspaceDocuments = createAsyncThunk(
  'document/getWorkspaceDocuments',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getWorkspaceDocuments(workspaceId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load documents');
    }
  }
);

export const createDocument = createAsyncThunk(
  'document/createDocument',
  async ({ 
    workspaceId, 
    documentData 
  }: {
    workspaceId: string;
    documentData: {
      title: string;
      content?: string;
      encrypted_content?: string;
      is_public: boolean;
      template_id?: string;
    };
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.createDocument(workspaceId, documentData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create document');
    }
  }
);

export const getDocument = createAsyncThunk(
  'document/getDocument',
  async (documentId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getDocument(documentId);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load document');
    }
  }
);

export const updateDocument = createAsyncThunk(
  'document/updateDocument',
  async ({ 
    documentId, 
    documentData 
  }: {
    documentId: string;
    documentData: {
      title?: string;
      content?: string;
      encrypted_content?: string;
      is_public?: boolean;
      version?: number;
    };
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateDocument(documentId, documentData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update document');
    }
  }
);

export const deleteDocument = createAsyncThunk(
  'document/deleteDocument',
  async (documentId: string, { rejectWithValue }) => {
    try {
      await apiService.deleteDocument(documentId);
      return documentId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete document');
    }
  }
);

export const applyDocumentOperation = createAsyncThunk(
  'document/applyDocumentOperation',
  async ({ 
    documentId, 
    operationData 
  }: {
    documentId: string;
    operationData: {
      operation_type: 'insert' | 'delete' | 'replace';
      position: number;
      content?: string;
      length?: number;
      document_version: number;
    };
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.applyDocumentOperation(documentId, operationData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to apply operation');
    }
  }
);

export const duplicateDocument = createAsyncThunk(
  'document/duplicateDocument',
  async ({ 
    documentId, 
    title 
  }: {
    documentId: string;
    title: string;
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.duplicateDocument(documentId, { title });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to duplicate document');
    }
  }
);

export const shareDocument = createAsyncThunk(
  'document/shareDocument',
  async ({ 
    documentId, 
    shareData 
  }: {
    documentId: string;
    shareData: {
      user_email?: string;
      permission: 'view' | 'edit' | 'admin';
      expires_at?: string;
    };
  }, { rejectWithValue }) => {
    try {
      const response = await apiService.shareDocument(documentId, shareData);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to share document');
    }
  }
);

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setCurrentDocument: (state, action: PayloadAction<Document | null>) => {
      state.currentDocument = action.payload;
      state.unsavedChanges = false;
      state.collaborativeOperations = [];
      state.collaborators = [];
    },

    addCollaborativeOperation: (state, action: PayloadAction<CollaborativeOperation>) => {
      state.collaborativeOperations.push(action.payload);
    },

    removeCollaborativeOperation: (state, action: PayloadAction<string>) => {
      state.collaborativeOperations = state.collaborativeOperations.filter(
        op => op.id !== action.payload
      );
    },

    clearCollaborativeOperations: (state) => {
      state.collaborativeOperations = [];
    },

    updateDocumentContent: (state, action: PayloadAction<{
      content: string;
      version: number;
      save?: boolean;
    }>) => {
      if (state.currentDocument) {
        state.currentDocument.content = action.payload.content;
        state.currentDocument.version = action.payload.version;
        state.unsavedChanges = !action.payload.save;
        
        if (action.payload.save) {
          state.lastSaved = new Date().toISOString();
        }
      }
    },

    updateCollaborators: (state, action: PayloadAction<DocumentCollaborator[]>) => {
      state.collaborators = action.payload;
    },

    addCollaborator: (state, action: PayloadAction<DocumentCollaborator>) => {
      const existingIndex = state.collaborators.findIndex(
        c => c.user_id === action.payload.user_id
      );
      
      if (existingIndex >= 0) {
        state.collaborators[existingIndex] = action.payload;
      } else {
        state.collaborators.push(action.payload);
      }
    },

    removeCollaborator: (state, action: PayloadAction<string>) => {
      state.collaborators = state.collaborators.filter(
        c => c.user_id !== action.payload
      );
    },

    updateCollaboratorCursor: (state, action: PayloadAction<{
      user_id: string;
      cursor_position: number;
    }>) => {
      const collaborator = state.collaborators.find(
        c => c.user_id === action.payload.user_id
      );
      if (collaborator) {
        collaborator.cursor_position = action.payload.cursor_position;
      }
    },

    setUnsavedChanges: (state, action: PayloadAction<boolean>) => {
      state.unsavedChanges = action.payload;
    },

    setSaving: (state, action: PayloadAction<boolean>) => {
      state.saving = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    resetDocumentState: (state) => {
      state.currentDocument = null;
      state.collaborativeOperations = [];
      state.collaborators = [];
      state.unsavedChanges = false;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Get workspace documents
      .addCase(getWorkspaceDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getWorkspaceDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload;
      })
      .addCase(getWorkspaceDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to load documents';
      })

      // Create document
      .addCase(createDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents.push(action.payload);
      })
      .addCase(createDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to create document';
      })

      // Get document
      .addCase(getDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDocument = action.payload;
        state.unsavedChanges = false;
        state.lastSaved = action.payload.updated_at;
      })
      .addCase(getDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to load document';
      })

      // Update document
      .addCase(updateDocument.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.saving = false;
        state.currentDocument = action.payload;
        state.unsavedChanges = false;
        state.lastSaved = action.payload.updated_at;
        
        // Update in documents list
        const index = state.documents.findIndex(doc => doc.id === action.payload.id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(updateDocument.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string || 'Failed to update document';
      })

      // Delete document
      .addCase(deleteDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = state.documents.filter(doc => doc.id !== action.payload);
        
        // Clear current document if it was deleted
        if (state.currentDocument?.id === action.payload) {
          state.currentDocument = null;
          state.collaborativeOperations = [];
          state.collaborators = [];
          state.unsavedChanges = false;
        }
      })
      .addCase(deleteDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to delete document';
      })

      // Apply document operation
      .addCase(applyDocumentOperation.pending, (state) => {
        state.error = null;
      })
      .addCase(applyDocumentOperation.fulfilled, (state, action) => {
        // Operation applied, update will come via WebSocket
        // But we can update version if provided
        if (state.currentDocument && action.payload?.version) {
          state.currentDocument.version = action.payload.version;
        }
      })
      .addCase(applyDocumentOperation.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to apply operation';
      })

      // Duplicate document
      .addCase(duplicateDocument.fulfilled, (state, action) => {
        state.documents.push(action.payload);
      })
      .addCase(duplicateDocument.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to duplicate document';
      })

      // Share document
      .addCase(shareDocument.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to share document';
      });
  },
});

export const {
  setCurrentDocument,
  addCollaborativeOperation,
  removeCollaborativeOperation,
  clearCollaborativeOperations,
  updateDocumentContent,
  updateCollaborators,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorCursor,
  setUnsavedChanges,
  setSaving,
  clearError,
  resetDocumentState,
} = documentSlice.actions;

export default documentSlice.reducer;