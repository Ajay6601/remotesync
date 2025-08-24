import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  PhotoIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onClose: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onClose }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const fileTypes = [
    { name: 'Images', extensions: '.jpg,.jpeg,.png,.gif,.webp', icon: PhotoIcon, color: 'text-green-600' },
    { name: 'Documents', extensions: '.pdf,.doc,.docx,.txt,.md', icon: DocumentIcon, color: 'text-blue-600' },
    { name: 'Archives', extensions: '.zip,.rar,.7z', icon: DocumentIcon, color: 'text-purple-600' },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Upload File</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drop files here or{' '}
                <label className="cursor-pointer text-blue-600 hover:text-blue-700">
                  browse
                  <input
                    type="file"
                    hidden
                    onChange={handleFileInput}
                    accept="image/*,application/pdf,.doc,.docx,.txt,.zip,.rar"
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max file size: 10MB
              </p>
            </div>

            {/* Supported file types */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Supported file types</h4>
              <div className="space-y-2">
                {fileTypes.map((type) => (
                  <div key={type.name} className="flex items-center space-x-2">
                    <type.icon className={`h-4 w-4 ${type.color}`} />
                    <span className="text-sm text-gray-600">{type.name}</span>
                    <span className="text-xs text-gray-400">({type.extensions})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default FileUpload;