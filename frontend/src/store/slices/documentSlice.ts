import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiService } from '../../services/api';
import { Document } from '../../types';

interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  collaborativeOperations: any[];
  loading: boolean;
  error: string | null;
}

const initialState: DocumentState = {
  documents: [],
  currentDocument: null,
  collaborativeOperations: [],
  loading: false,
  error: null,
};

// Async thunks
export const getWorkspaceDocuments = createAsyncThunk(
  'document/getWorkspaceDocuments',
  async (workspaceId: string) => {
    const response = await apiService.getWorkspaceDocuments(workspaceId);
    return response;
  }
);

export const createDocument = createAsyncThunk(
  'document/createDocument',
  async ({ workspaceId, documentData }: {
    workspaceId: string;
    documentData: {
      title: string;
      content?: string;
      encrypted_content?: string;
      is_public: boolean;
    };
  }) => {
    const response = await apiService.createDocument(workspaceId, documentData);
    return response;
  }
);

export const getDocument = createAsyncThunk(
  'document/getDocument',
  async (documentId: string) => {
    const response = await apiService.getDocument(documentId);
    return response;
  }
);

export const updateDocument = createAsyncThunk(
  'document/updateDocument',
  async ({ documentId, documentData }: {
    documentId: string;
    documentData: {
      title?: string;
      content?: string;
      encrypted_content?: string;
      is_public?: boolean;
    };
  }) => {
    const response = await apiService.updateDocument(documentId, documentData);
    return response;
  }
);

export const applyDocumentOperation = createAsyncThunk(
  'document/applyDocumentOperation',
  async ({ documentId, operationData }: {
    documentId: string;
    operationData: {
      operation_type: string;
      position: number;
      content?: string;
      length?: number;
      document_version: number;
    };
  }) => {
    const response = await apiService.applyDocumentOperation(documentId, operationData);
    return response;
  }
);

const documentSlice = createSlice({
  name: 'document',
  initialState,
  reducers: {
    setCurrentDocument: (state, action) => {
      state.currentDocument = action.payload;
    },
    addCollaborativeOperation: (state, action) => {
      state.collaborativeOperations.push(action.payload);
    },
    clearCollaborativeOperations: (state) => {
      state.collaborativeOperations = [];
    },
    updateDocumentContent: (state, action) => {
      if (state.currentDocument) {
        state.currentDocument.content = action.payload.content;
        state.currentDocument.version = action.payload.version;
      }
    },
    clearError: (state) => {
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
        state.error = action.error.message || 'Failed to load documents';
      })
      // Create document
      .addCase(createDocument.fulfilled, (state, action) => {
        state.documents.push(action.payload);
      })
      // Get document
      .addCase(getDocument.fulfilled, (state, action) => {
        state.currentDocument = action.payload;
      })
      // Update document
      .addCase(updateDocument.fulfilled, (state, action) => {
        state.currentDocument = action.payload;
        const index = state.documents.findIndex(doc => doc.id === action.payload.id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      // Apply operation
      .addCase(applyDocumentOperation.fulfilled, (state, action) => {
        // Operation applied, update will come via WebSocket
      });
  },
});

export const {
  setCurrentDocument,
  addCollaborativeOperation,
  clearCollaborativeOperations,
  updateDocumentContent,
  clearError,
} = documentSlice.actions;

export default documentSlice.reducer;
