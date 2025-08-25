import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate ,useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  LockClosedIcon,
  PencilIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { getWorkspaceDocuments, createDocument } from '../../store/slices/documentSlice.ts';
import Button from '../ui/Button.tsx';
import Input from '../ui/Input.tsx';
import Modal from '../ui/Modal.tsx';
import toast from 'react-hot-toast';

const DocumentsView: React.FC = () => {
  const { workspaceId, documentId } = useParams<{ workspaceId: string; documentId?: string }>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [newDocumentPublic, setNewDocumentPublic] = useState(false);
  
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { documents, loading } = useAppSelector((state) => state.document);
  const { currentWorkspace } = useAppSelector((state) => state.workspace);

  useEffect(() => {
    if (workspaceId) {
      dispatch(getWorkspaceDocuments(workspaceId));
    }
  }, [workspaceId, dispatch]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDocumentTitle.trim() || !workspaceId) {
      toast.error('Document title is required');
      return;
    }

    try {
      const newDoc = await dispatch(createDocument({
        workspaceId,
        documentData: {
          title: newDocumentTitle.trim(),
          content: '',
          is_public: newDocumentPublic,
        },
      })).unwrap();
      
      toast.success('Document created successfully!');
      setShowCreateModal(false);
      setNewDocumentTitle('');
      setNewDocumentPublic(false);
      navigate(`/workspace/${workspaceId}/documents/${newDoc.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'public' && doc.is_public) ||
                         (filterType === 'private' && !doc.is_public) ||
                         (filterType === 'recent' && new Date(doc.updated_at || doc.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    return matchesSearch && matchesFilter;
  });

  const documentStats = {
    total: documents.length,
    public: documents.filter(d => d.is_public).length,
    private: documents.filter(d => !d.is_public).length,
    recent: documents.filter(d => new Date(d.updated_at || d.created_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000).length,
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Documents
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Collaborate on documents in real-time
            </p>
          </div>
          
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-5 w-5 mr-2" />
            New Document
          </Button>
        </div>
      </div>

      {/* Stats */}
      {documents.length > 0 && (
        <div className="px-6 py-4 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{documentStats.total}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{documentStats.public}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Public</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{documentStats.private}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Private</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{documentStats.recent}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Recent</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and filters */}
      {documents.length > 0 && (
        <div className="px-6 py-4 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search documents..."
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field min-w-[140px]"
              >
                <option value="all">All Documents</option>
                <option value="recent">Recent (7 days)</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading documents...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {documents.length === 0 
                ? 'Create your first document to start collaborating'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {documents.length === 0 && (
              <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Document
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocuments.map((document, index) => (
              <motion.div
                key={document.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1 group"
                onClick={() => navigate(`/workspace/${workspaceId}/documents/${document.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {document.title}
                  </h3>
                  <div className="flex items-center space-x-2 ml-2">
                    {document.is_public ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <EyeIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">Public</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 text-gray-500">
                        <LockClosedIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">Private</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                  {document.content.length > 0 
                    ? document.content.substring(0, 150) + (document.content.length > 150 ? '...' : '')
                    : 'No content yet. Click to start editing.'
                  }
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        {document.creator_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium">{document.creator_name}</span>
                    <span>•</span>
                    <span>v{document.version}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {document.collaborators.length > 0 && (
                      <div className="flex items-center space-x-1 text-blue-600">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-xs">{document.collaborators.length} active</span>
                      </div>
                    )}
                    <span className="text-xs">
                      {new Date(document.updated_at || document.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Hover actions */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle quick edit
                      }}
                      className="p-1 bg-white dark:bg-dark-700 rounded shadow-md hover:bg-gray-50 dark:hover:bg-dark-600"
                      title="Quick edit"
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle share
                      }}
                      className="p-1 bg-white dark:bg-dark-700 rounded shadow-md hover:bg-gray-50 dark:hover:bg-dark-600"
                      title="Share document"
                    >
                      <ShareIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create document modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Document"
      >
        <form onSubmit={handleCreateDocument} className="space-y-4">
          <Input
            label="Document Title"
            value={newDocumentTitle}
            onChange={(e) => setNewDocumentTitle(e.target.value)}
            placeholder="Enter document title"
            required
            autoFocus
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="documentPublic"
              checked={newDocumentPublic}
              onChange={(e) => setNewDocumentPublic(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="documentPublic" className="text-sm text-gray-700 dark:text-gray-300 flex items-center space-x-2">
              <EyeIcon className="h-4 w-4" />
              <span>Make this document public</span>
            </label>
          </div>
          
          <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {newDocumentPublic 
                ? '🌍 Public documents can be viewed by anyone with the link'
                : '🔒 Private documents are only visible to workspace members'
              }
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentsView;