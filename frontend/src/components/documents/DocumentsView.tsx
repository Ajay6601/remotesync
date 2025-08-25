import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  TrashIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { getWorkspaceDocuments, createDocument, setCurrentDocument } from '../../store/slices/documentSlice.ts';
import Button from '../ui/Button.tsx';
import Input from '../ui/Input.tsx';
import Modal from '../ui/Modal.tsx';
import toast from 'react-hot-toast';

const DocumentsView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('updated');
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [newDocumentDescription, setNewDocumentDescription] = useState('');
  const [newDocumentPublic, setNewDocumentPublic] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { documents, loading } = useAppSelector((state) => state.document);
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (workspaceId) {
      console.log('Loading documents for workspace:', workspaceId);
      dispatch(getWorkspaceDocuments(workspaceId));
    }
  }, [workspaceId, dispatch]);

  const documentTemplates = {
    blank: { name: 'Blank Document', content: '' },
    meeting: { 
      name: 'Meeting Notes', 
      content: `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:** \n\n## Agenda\n- \n\n## Discussion\n\n## Action Items\n- [ ] \n\n## Next Steps\n`
    },
    project: { 
      name: 'Project Plan', 
      content: `# Project Plan\n\n## Overview\n\n## Goals\n\n## Timeline\n\n## Resources\n\n## Milestones\n`
    },
    spec: { 
      name: 'Technical Spec', 
      content: `# Technical Specification\n\n## Summary\n\n## Requirements\n\n## Architecture\n\n## Implementation\n\n## Testing\n`
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDocumentTitle.trim() || !workspaceId) {
      toast.error('Document title is required');
      return;
    }

    try {
      const templateContent = documentTemplates[selectedTemplate as keyof typeof documentTemplates].content;
      
      const newDoc = await dispatch(createDocument({
        workspaceId,
        documentData: {
          title: newDocumentTitle.trim(),
          content: templateContent,
          is_public: newDocumentPublic,
        },
      })).unwrap();
      
      toast.success('Document created successfully!');
      setShowCreateModal(false);
      resetCreateForm();
      
      // Navigate to the new document editor
      console.log('Navigating to new document:', newDoc.id);
      navigate(`/workspace/${workspaceId}/documents/${newDoc.id}`);
    } catch (error: any) {
      console.error('Document creation error:', error);
      toast.error(error.message || 'Failed to create document');
    }
  };

  const resetCreateForm = () => {
    setNewDocumentTitle('');
    setNewDocumentDescription('');
    setNewDocumentPublic(false);
    setSelectedTemplate('blank');
  };

  const handleDocumentClick = (document: any) => {
    console.log('Document clicked:', document.id, document.title);
    dispatch(setCurrentDocument(document));
    navigate(`/workspace/${workspaceId}/documents/${document.id}`);
  };

  const handleDeleteDocument = async (documentId: string, documentTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${documentTitle}"?`)) {
      return;
    }

    try {
      // Delete API call would go here
      toast.success('Document deleted');
      dispatch(getWorkspaceDocuments(workspaceId!));
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const handleDuplicateDocument = async (document: any) => {
    try {
      await dispatch(createDocument({
        workspaceId: workspaceId!,
        documentData: {
          title: `${document.title} (Copy)`,
          content: document.content,
          is_public: document.is_public,
        },
      })).unwrap();
      
      toast.success('Document duplicated successfully!');
      dispatch(getWorkspaceDocuments(workspaceId!));
    } catch (error) {
      toast.error('Failed to duplicate document');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.creator_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const now = new Date();
    const docDate = new Date(doc.updated_at || doc.created_at);
    const isRecent = (now.getTime() - docDate.getTime()) < (7 * 24 * 60 * 60 * 1000); // 7 days
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'public' && doc.is_public) ||
                         (filterType === 'private' && !doc.is_public) ||
                         (filterType === 'recent' && isRecent) ||
                         (filterType === 'mine' && doc.created_by === user?.id);
    
    return matchesSearch && matchesFilter;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'updated':
      default:
        return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    }
  });

  const documentStats = {
    total: documents.length,
    public: documents.filter(d => d.is_public).length,
    private: documents.filter(d => !d.is_public).length,
    recent: documents.filter(d => {
      const docDate = new Date(d.updated_at || d.created_at);
      return (new Date().getTime() - docDate.getTime()) < (7 * 24 * 60 * 60 * 1000);
    }).length,
    mine: documents.filter(d => d.created_by === user?.id).length
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">
              Collaborate on documents in real-time • {currentWorkspace?.name}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={() => navigate(`/workspace/${workspaceId}/documents`)}
              className="flex items-center space-x-1"
            >
              <DocumentTextIcon className="h-4 w-4" />
              <span>All Documents</span>
            </Button>
            
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              New Document
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="grid grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{documentStats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{documentStats.public}</div>
            <div className="text-sm text-gray-600">Public</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{documentStats.private}</div>
            <div className="text-sm text-gray-600">Private</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{documentStats.recent}</div>
            <div className="text-sm text-gray-600">Recent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{documentStats.mine}</div>
            <div className="text-sm text-gray-600">My Docs</div>
          </div>
        </div>
      </div>

      {/* Search, filters, and sorting */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents by title, content, or author..."
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">All Documents</option>
                <option value="recent">Recent (7 days)</option>
                <option value="mine">My Documents</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="updated">Last Updated</option>
              <option value="created">Date Created</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents list */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading documents...</span>
          </div>
        ) : sortedDocuments.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {documents.length === 0 ? 'No documents yet' : 'No matching documents'}
            </h3>
            <p className="mt-2 text-gray-600">
              {documents.length === 0 
                ? 'Create your first document to start collaborating with your team'
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
            {sortedDocuments.map((document, index) => (
              <motion.div
                key={document.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1 group relative"
                onClick={() => handleDocumentClick(document)}
              >
                {/* Document header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 group-hover:text-blue-600 transition-colors">
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
                
                {/* Document preview */}
                <div className="mb-4">
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 min-h-16">
                    {document.content.length > 0 
                      ? document.content.substring(0, 200).replace(/[#*`]/g, '') + (document.content.length > 200 ? '...' : '')
                      : 'No content yet. Click to start editing this document and add your content.'
                    }
                  </p>
                </div>
                
                {/* Document metadata */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {document.creator_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-700">{document.creator_name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-gray-500">
                      <span className="text-xs">v{document.version}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>
                        Updated {new Date(document.updated_at || document.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {document.collaborators && document.collaborators.length > 0 && (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>{document.collaborators.length} active</span>
                        </div>
                      )}
                      
                      <span>
                        {Math.ceil(document.content.length / 250)} min read
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover actions */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentClick(document);
                      }}
                      className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
                      title="Edit document"
                    >
                      <PencilIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`${window.location.origin}/workspace/${workspaceId}/documents/${document.id}`);
                        toast.success('Document link copied to clipboard!');
                      }}
                      className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
                      title="Share document"
                    >
                      <ShareIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    {document.created_by === user?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDocument(document.id, document.title);
                        }}
                        className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors border border-gray-200"
                        title="Delete document"
                      >
                        <TrashIcon className="h-4 w-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Document type indicator */}
                <div className="absolute top-2 left-2">
                  <div className="bg-white bg-opacity-90 rounded-md px-2 py-1">
                    <DocumentTextIcon className="h-4 w-4 text-gray-600" />
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
        onClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
        }}
        title="Create New Document"
        size="lg"
      >
        <form onSubmit={handleCreateDocument} className="space-y-6">
          <div className="space-y-4">
            <Input
              label="Document Title"
              value={newDocumentTitle}
              onChange={(e) => setNewDocumentTitle(e.target.value)}
              placeholder="Enter a descriptive title for your document"
              required
              autoFocus
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Template
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(documentTemplates).map(([key, template]) => (
                  <label
                    key={key}
                    className={`relative cursor-pointer rounded-lg border p-4 focus:outline-none ${
                      selectedTemplate === key
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={key}
                      checked={selectedTemplate === key}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className={`h-5 w-5 ${
                        selectedTemplate === key ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <div className={`text-sm font-medium ${
                          selectedTemplate === key ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {template.name}
                        </div>
                      </div>
                    </div>
                    {selectedTemplate === key && (
                      <div className="absolute top-2 right-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newDocumentDescription}
                onChange={(e) => setNewDocumentDescription(e.target.value)}
                placeholder="Brief description of what this document is about..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
              />
            </div>
            
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="documentPublic"
                checked={newDocumentPublic}
                onChange={(e) => setNewDocumentPublic(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <label htmlFor="documentPublic" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <EyeIcon className="h-4 w-4" />
                  <span>Make this document public</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {newDocumentPublic 
                    ? 'Public documents can be viewed by anyone with the link, even outside your workspace'
                    : 'Private documents are only visible to workspace members'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DocumentsView;