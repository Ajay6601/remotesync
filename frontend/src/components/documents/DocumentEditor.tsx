import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  ShareIcon,
  EyeIcon,
  LockClosedIcon,
  BookmarkIcon,
  PrinterIcon,
  CloudArrowUpIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  Cog6ToothIcon,
  BoltIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { getDocument, updateDocument, setCurrentDocument } from '../../store/slices/documentSlice.ts';
import Button from '../ui/Button.tsx';
import toast from 'react-hot-toast';

const DocumentEditor: React.FC = () => {
  const { workspaceId, documentId } = useParams<{ workspaceId: string; documentId: string }>();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { currentDocument, loading } = useAppSelector((state) => state.document);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (documentId) {
      console.log('🏠 Loading document:', documentId);
      dispatch(getDocument(documentId));
    }
    
    return () => {
      console.log('🧹 Cleaning up document editor');
      dispatch(setCurrentDocument(null));
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [documentId, dispatch]);

  useEffect(() => {
    if (currentDocument) {
      console.log('📄 Document loaded:', currentDocument.title);
      setContent(currentDocument.content);
      setTitle(currentDocument.title);
      updateStats(currentDocument.content);
      setLastSaved(new Date(currentDocument.updated_at || currentDocument.created_at));
    }
  }, [currentDocument]);

  const updateStats = (text: string) => {
    setCharacterCount(text.length);
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setIsEditing(true);
    updateStats(newContent);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    // Auto-save after 3 seconds of inactivity
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    setSaveTimeout(
      setTimeout(() => {
        handleAutoSave(newContent, title);
      }, 3000)
    );
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setIsEditing(true);

    // Auto-save title changes
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    setSaveTimeout(
      setTimeout(() => {
        handleAutoSave(content, newTitle);
      }, 2000)
    );
  };

  const handleAutoSave = async (contentToSave: string, titleToSave: string) => {
    if (!currentDocument) return;

    setIsAutoSaving(true);
    try {
      await dispatch(updateDocument({
        documentId: currentDocument.id,
        documentData: {
          title: titleToSave || 'Untitled Document',
          content: contentToSave,
        },
      })).unwrap();
      
      setIsEditing(false);
      setLastSaved(new Date());
      console.log('💾 Document auto-saved');
    } catch (error: any) {
      console.error('❌ Auto-save failed:', error);
      toast.error('Failed to save document');
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleManualSave = async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      setSaveTimeout(null);
    }
    
    setIsAutoSaving(true);
    try {
      await handleAutoSave(content, title);
      toast.success('Document saved manually');
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+S to save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleManualSave();
    }
    
    // Ctrl+B for bold (future feature)
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      // Add bold formatting
    }
    
    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = (e.target as HTMLTextAreaElement).selectionStart;
      const end = (e.target as HTMLTextAreaElement).selectionEnd;
      const newContent = content.substring(0, start) + '    ' + content.substring(end);
      setContent(newContent);
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Document exported!');
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/workspace/${workspaceId}/documents/${documentId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'RemoteSync Document',
          text: `Check out this document: ${title}`,
          url: shareUrl,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
        toast.success('Document link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Document link copied to clipboard!');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title || 'Document'}</title>
            <style>
              body { font-family: Georgia, serif; line-height: 1.6; margin: 40px; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${title || 'Untitled Document'}</h1>
            <pre>${content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (loading || !currentDocument) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading document...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait while we fetch your document</p>
        </div>
      </div>
    );
  }

  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 250)); // 250 words per minute
  const canEdit = currentDocument.created_by === user?.id || !currentDocument.is_public;

  return (
    <div className="flex-1 flex flex-col bg-white max-h-screen">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/workspace/${workspaceId}/documents`)}
              title="Back to Documents"
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>
            
            <input
              ref={titleInputRef}
              value={title}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              className="text-xl font-bold bg-transparent border-none outline-none text-gray-900 flex-1 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 hover:bg-gray-50"
              placeholder="Untitled Document"
              disabled={!canEdit}
            />
            
            <div className="flex items-center space-x-2">
              {currentDocument.is_public ? (
                <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  <EyeIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Public</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                  <LockClosedIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Private</span>
                </div>
              )}
              
              {currentDocument.collaborators && currentDocument.collaborators.length > 0 && (
                <div className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{currentDocument.collaborators.length} active</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              title="Export document"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              title="Print document"
            >
              <PrinterIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              title="Share document"
            >
              <ShareIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              title="Document settings"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleManualSave}
              disabled={!isEditing}
              loading={isAutoSaving}
              size="sm"
              className="min-w-20"
            >
              {isAutoSaving ? (
                <BoltIcon className="h-4 w-4 mr-1" />
              ) : null}
              {isAutoSaving ? 'Saving...' : isEditing ? 'Save' : 'Saved'}
            </Button>
          </div>
        </div>
        
        {/* Document metadata */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <span>Version {currentDocument.version}</span>
            <span>•</span>
            <span>Created by {currentDocument.creator_name}</span>
            <span>•</span>
            <span>
              {lastSaved ? `Last saved ${lastSaved.toLocaleTimeString()}` : 'Never saved'}
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>{wordCount.toLocaleString()} words</span>
            <span>•</span>
            <span>{characterCount.toLocaleString()} characters</span>
            <span>•</span>
            <span>{estimatedReadTime} min read</span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={`Start writing your document...\n\nTips:\n• Use Ctrl+S to save manually\n• Use Tab for indentation\n• Content auto-saves every 3 seconds`}
          disabled={!canEdit}
          className={`w-full h-full resize-none border-none outline-none p-8 text-gray-900 text-lg leading-relaxed font-serif focus:ring-0 ${
            !canEdit ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
          }`}
          style={{ 
            minHeight: 'calc(100vh - 200px)',
            fontFamily: 'Georgia, "Times New Roman", Times, serif',
            lineHeight: '1.8'
          }}
        />
        
        {/* Status indicators */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          {/* Auto-save indicator */}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-sm shadow-sm"
            >
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Unsaved changes</span>
              </div>
            </motion.div>
          )}
          
          {/* Auto-saving indicator */}
          {isAutoSaving && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-blue-100 border border-blue-300 text-blue-800 px-3 py-2 rounded-lg text-sm shadow-sm"
            >
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span className="font-medium">Saving...</span>
              </div>
            </motion.div>
          )}
          
          {/* Read-only indicator */}
          {!canEdit && (
            <div className="bg-gray-100 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm shadow-sm">
              <div className="flex items-center space-x-2">
                <EyeIcon className="h-3 w-3" />
                <span className="font-medium">Read-only</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Keyboard shortcuts help */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 text-xs text-gray-500 shadow-sm border border-gray-200">
          <div className="space-y-1">
            <div><kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl+S</kbd> Save manually</div>
            <div><kbd className="font-mono bg-gray-100 px-1 rounded">Tab</kbd> Indent</div>
            <div><kbd className="font-mono bg-gray-100 px-1 rounded">Ctrl+Z</kbd> Undo</div>
          </div>
        </div>

        {/* Collaboration indicators */}
        {currentDocument.collaborators && currentDocument.collaborators.length > 0 && (
          <div className="absolute bottom-4 right-4 flex items-center space-x-2">
            {currentDocument.collaborators.slice(0, 3).map((collaborator, index) => (
              <div
                key={collaborator}
                className="w-8 h-8 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white text-sm font-medium shadow-sm"
                style={{ zIndex: 10 - index, marginLeft: index > 0 ? '-8px' : '0' }}
                title={`${collaborator} is editing`}
              >
                {collaborator.charAt(0).toUpperCase()}
              </div>
            ))}
            {currentDocument.collaborators.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-xs font-medium shadow-sm"
                style={{ marginLeft: '-8px' }}
              >
                +{currentDocument.collaborators.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 right-0 w-80 bg-white border-l border-t border-gray-200 shadow-xl"
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Document Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={!currentDocument.is_public}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600"
                  />
                  <LockClosedIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Private to workspace</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={currentDocument.is_public}
                    onChange={() => {}}
                    className="h-4 w-4 text-blue-600"
                  />
                  <EyeIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Public (anyone with link)</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actions
              </label>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExport}
                  className="w-full justify-start"
                >
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                  Export as Text
                </Button>
                
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    handleDuplicateDocument(currentDocument);
                    setShowSettings(false);
                  }}
                  className="w-full justify-start"
                >
                  <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                  Duplicate Document
                </Button>
                
                {currentDocument.created_by === user?.id && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this document?')) {
                        // Delete document
                        navigate(`/workspace/${workspaceId}/documents`);
                      }
                    }}
                    className="w-full justify-start"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete Document
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DocumentEditor;