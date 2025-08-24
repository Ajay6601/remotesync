import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  ShareIcon,
  UserIcon,
  EyeIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import {
  getDocument,
  updateDocument,
  setCurrentDocument,
  updateDocumentContent,
} from '../../store/slices/documentSlice.ts';
import { websocketService } from '../../services/websocket.ts';
import Button from '../ui/Button.tsx';
import toast from 'react-hot-toast';

interface DocumentEditorProps {
  documentId: string;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId }) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [cursors, setCursors] = useState<Record<string, { position: number; user: string }>>({});
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { currentDocument, loading } = useAppSelector((state) => state.document);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getDocument(documentId));
    
    return () => {
      dispatch(setCurrentDocument(null));
    };
  }, [documentId, dispatch]);

  useEffect(() => {
    if (currentDocument) {
      setContent(currentDocument.content);
      setTitle(currentDocument.title);
    }
  }, [currentDocument]);

  // WebSocket handlers for collaborative editing
  useEffect(() => {
    const handleDocumentOperation = (operation: any) => {
      if (operation.document_id === documentId && operation.user_id !== user?.id) {
        // Apply operation to content
        applyOperation(operation);
      }
    };

    const handleCursorPosition = (cursor: any) => {
      if (cursor.document_id === documentId && cursor.user_id !== user?.id) {
        setCursors(prev => ({
          ...prev,
          [cursor.user_id]: {
            position: cursor.position,
            user: cursor.user_name || cursor.user_id,
          },
        }));
      }
    };

    // Subscribe to WebSocket events
    websocketService.onMessage((message) => {
      if (message.type === 'document_operation') {
        handleDocumentOperation(message);
      } else if (message.type === 'cursor_position') {
        handleCursorPosition(message);
      }
    });

    return () => {
      websocketService.offMessage();
    };
  }, [documentId, user?.id]);

  const applyOperation = (operation: any) => {
    setContent(prevContent => {
      let newContent = prevContent;
      
      switch (operation.operation_type) {
        case 'insert':
          newContent = (
            prevContent.slice(0, operation.position) +
            operation.content +
            prevContent.slice(operation.position)
          );
          break;
        case 'delete':
          const endPos = operation.position + (operation.length || 0);
          newContent = (
            prevContent.slice(0, operation.position) +
            prevContent.slice(endPos)
          );
          break;
      }
      
      return newContent;
    });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const oldContent = content;
    
    setContent(newContent);
    setIsEditing(true);

    // Find the change and send operation
    if (newContent.length > oldContent.length) {
      // Insert operation
      const position = findChangePosition(oldContent, newContent);
      const insertedText = newContent.slice(position, position + (newContent.length - oldContent.length));
      
      websocketService.sendDocumentOperation(documentId, {
        operation_type: 'insert',
        position,
        content: insertedText,
        version: currentDocument?.version || 1,
      });
    } else if (newContent.length < oldContent.length) {
      // Delete operation
      const position = findChangePosition(newContent, oldContent);
      const length = oldContent.length - newContent.length;
      
      websocketService.sendDocumentOperation(documentId, {
        operation_type: 'delete',
        position,
        length,
        version: currentDocument?.version || 1,
      });
    }

    // Send cursor position
    const cursorPosition = e.target.selectionStart;
    websocketService.sendCursorPosition(documentId, cursorPosition);

    // Auto-save after 2 seconds of inactivity
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    setSaveTimeout(
      setTimeout(() => {
        handleSave(newContent, title);
      }, 2000)
    );
  };

  const findChangePosition = (shorter: string, longer: string): number => {
    for (let i = 0; i < shorter.length; i++) {
      if (shorter[i] !== longer[i]) {
        return i;
      }
    }
    return shorter.length;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setIsEditing(true);
  };

  const handleSave = async (contentToSave?: string, titleToSave?: string) => {
    if (!currentDocument) return;

    try {
      await dispatch(updateDocument({
        documentId: currentDocument.id,
        documentData: {
          title: titleToSave || title,
          content: contentToSave || content,
        },
      })).unwrap();
      
      setIsEditing(false);
      toast.success('Document saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save document');
    }
  };

  const handleManualSave = () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    handleSave();
  };

  if (!currentDocument) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-dark-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/workspace/${workspaceId}/documents`)}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            
            <input
              value={title}
              onChange={handleTitleChange}
              className="text-xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white flex-1"
              placeholder="Untitled Document"
            />
            
            <div className="flex items-center space-x-2">
              {currentDocument.is_public ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <EyeIcon className="h-4 w-4" />
                  <span className="text-sm">Public</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-500">
                  <LockClosedIcon className="h-4 w-4" />
                  <span className="text-sm">Private</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Collaborators */}
            <div className="flex items-center space-x-2">
              {currentDocument.collaborators.slice(0, 3).map((collaborator, index) => (
                <div
                  key={collaborator}
                  className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium"
                  style={{ zIndex: 10 - index }}
                >
                  {collaborator.charAt(0).toUpperCase()}
                </div>
              ))}
              {currentDocument.collaborators.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm">
                  +{currentDocument.collaborators.length - 3}
                </div>
              )}
            </div>

            <Button variant="secondary" size="sm">
              <ShareIcon className="h-4 w-4 mr-1" />
              Share
            </Button>
            
            <Button
              onClick={handleManualSave}
              disabled={!isEditing}
              loading={loading}
              size="sm"
            >
              {isEditing ? 'Save' : 'Saved'}
            </Button>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Version {currentDocument.version} • 
          Last updated {new Date(currentDocument.updated_at || currentDocument.created_at).toLocaleString()}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Start typing..."
          className="w-full h-full p-6 resize-none border-none outline-none bg-transparent text-gray-900 dark:text-white text-lg leading-relaxed font-mono"
        />
        
        {/* Cursor indicators */}
        {Object.entries(cursors).map(([userId, cursor]) => (
          <div
            key={userId}
            className="absolute bg-primary-500 text-white text-xs px-2 py-1 rounded pointer-events-none"
            style={{
              top: `${Math.floor(cursor.position / 80) * 1.5 + 6}rem`,
              left: `${(cursor.position % 80) * 0.6 + 1.5}rem`,
            }}
          >
            {cursor.user}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentEditor;
