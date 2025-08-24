import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Message } from '../../types';
import Button from '../ui/Button.tsx';

interface MessageEditorProps {
  message: Message;
  onSave: (messageId: string, newContent: string) => void;
  onCancel: () => void;
}

const MessageEditor: React.FC<MessageEditorProps> = ({ message, onSave, onCancel }) => {
  const [content, setContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      await onSave(message.id, content.trim());
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onCancel}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-lg shadow-xl w-full max-w-lg"
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Edit Message</h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                } else if (e.key === 'Escape') {
                  onCancel();
                }
              }}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            
            <div className="flex justify-between items-center mt-4">
              <p className="text-xs text-gray-500">Press Esc to cancel • Enter to save</p>
              <div className="flex space-x-2">
                <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={!content.trim()} loading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default MessageEditor;