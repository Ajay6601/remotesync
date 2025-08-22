import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { getWorkspaceDocuments, createDocument } from '../../store/slices/documentSlice';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import DocumentEditor from './DocumentEditor';
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
                         (filterType === 'private' && !doc.is_public);
    
    return matchesSearch && matchesFilter;
  });

  // If viewing a specific document, show the editor
  if (documentId) {
    return <DocumentEditor documentId={documentId} />;
  }

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

      {/* Search and filters */}
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
              className="input-field"
            >
              <option value="all">All Documents</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredDocuments.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document, index) => (
              <motion.div
                key={document.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1"
                onClick={() => navigate(`/workspace/${workspaceId}/documents/${document.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate flex-1">
                    {document.title}
                  </h3>
                  {document.is_public ? (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                      Public
                    </span>
                  ) : (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-dark-700 dark:text-gray-300">
                      Private
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                  {document.content.substring(0, 150)}...
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    <span className="font-medium">{document.creator_name}</span>
                    <span className="mx-1">•</span>
                    <span>v{document.version}</span>
                  </div>
                  <div>
                    {document.collaborators.length > 0 && (
                      <span className="mr-2">{document.collaborators.length} active</span>
                    )}
                    <span>
                      {new Date(document.updated_at || document.created_at).toLocaleDateString()}
                    </span>
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
          />
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="documentPublic"
              checked={newDocumentPublic}
              onChange={(e) => setNewDocumentPublic(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="documentPublic" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Make this document public
            </label>
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