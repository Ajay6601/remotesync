import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  CalendarIcon,
  UserIcon,
  TagIcon,
  EllipsisHorizontalIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Task } from '../../types';

interface TaskCardProps {
  task: Task;
  index: number;
  onUpdate: (taskId: string, updates: any) => void;
  onDelete?: (taskId: string) => void;
  viewMode?: 'board' | 'list';
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  index, 
  onUpdate, 
  onDelete, 
  viewMode = 'board' 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200';
      case 'in_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'high':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const handleStatusChange = (newStatus: string) => {
    onUpdate(task.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority: string) => {
    onUpdate(task.id, { priority: newPriority });
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() !== task.title) {
      onUpdate(task.id, { title: editedTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditing(false);
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isDueSoon = task.due_date && !isOverdue && 
    new Date(task.due_date).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000; // 24 hours

  const cardClassName = viewMode === 'list' 
    ? "flex items-center space-x-4 p-4 bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 hover:shadow-md transition-all duration-200"
    : "bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-4 hover:shadow-md transition-all duration-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cardClassName}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      <div className={viewMode === 'list' ? 'flex-1' : ''}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2 flex-1">
            <button
              onClick={() => handleStatusChange(task.status === 'done' ? 'todo' : 'done')}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                task.status === 'done'
                  ? 'bg-green-500 border-green-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
              }`}
            >
              {task.status === 'done' && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
            
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleKeyPress}
                className="flex-1 text-lg font-medium bg-transparent border-none outline-none focus:ring-2 focus:ring-primary-500 rounded px-1"
                autoFocus
              />
            ) : (
              <h3 
                className={`text-lg font-medium cursor-pointer flex-1 ${
                  task.status === 'done' 
                    ? 'line-through text-gray-500 dark:text-gray-400'
                    : 'text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400'
                }`}
                onClick={() => setIsEditing(true)}
              >
                {task.title}
                {getPriorityIcon(task.priority)}
              </h3>
            )}
          </div>

          {/* Action menu */}
          <div className="relative">
            {showMenu && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <EllipsisHorizontalIcon className="h-5 w-5" />
              </motion.button>
            )}
            
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-700 rounded-md shadow-lg z-10 border border-gray-200 dark:border-dark-600"
              >
                <div className="py-1">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-600"
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Task
                  </button>
                  
                  {/* Status options */}
                  <div className="border-t border-gray-100 dark:border-dark-600 my-1"></div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Change Status
                  </div>
                  
                  {['todo', 'in_progress', 'in_review', 'done'].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-600 ${
                        task.status === status 
                          ? 'text-primary-600 dark:text-primary-400 font-medium' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                  
                  {/* Priority options */}
                  <div className="border-t border-gray-100 dark:border-dark-600 my-1"></div>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Change Priority
                  </div>
                  
                  {['low', 'medium', 'high', 'urgent'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => handlePriorityChange(priority)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-dark-600 ${
                        task.priority === priority 
                          ? 'text-primary-600 dark:text-primary-400 font-medium' 
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </button>
                  ))}
                  
                  {onDelete && (
                    <>
                      <div className="border-t border-gray-100 dark:border-dark-600 my-1"></div>
                      <button
                        onClick={() => onDelete(task.id)}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-dark-600"
                      >
                        <TrashIcon className="h-4 w-4 mr-2" />
                        Delete Task
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Task description */}
        {task.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Task metadata */}
        <div className={`flex items-center ${viewMode === 'list' ? 'justify-end space-x-4' : 'justify-between'}`}>
          <div className="flex items-center space-x-2">
            {/* Status badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>
            
            {/* Priority badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority}
              {getPriorityIcon(task.priority)}
            </span>
            
            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                <TagIcon className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {task.tags.slice(0, 2).join(', ')}
                  {task.tags.length > 2 && `... +${task.tags.length - 2}`}
                </span>
              </div>
            )}
          </div>

          {/* Right side metadata */}
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            {/* Assignee */}
            {task.assignee_name && (
              <div className="flex items-center space-x-1">
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {task.assignee_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:inline">{task.assignee_name}</span>
              </div>
            )}
            
            {/* Due date */}
            {task.due_date && (
              <div className={`flex items-center space-x-1 ${
                isOverdue ? 'text-red-600 font-medium' : 
                isDueSoon ? 'text-yellow-600 font-medium' : ''
              }`}>
                <CalendarIcon className="h-4 w-4" />
                <span>{format(new Date(task.due_date), 'MMM dd')}</span>
                {isOverdue && <ExclamationTriangleIcon className="h-4 w-4" />}
                {isDueSoon && <ClockIcon className="h-4 w-4" />}
              </div>
            )}
            
            {/* Created date for list view */}
            {viewMode === 'list' && (
              <span className="text-xs">
                Created {format(new Date(task.created_at), 'MMM dd, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Progress indicator for subtasks (future feature) */}
        {task.status === 'in_progress' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Progress</span>
              <span>60%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
        )}

        {/* Activity indicator */}
        {task.updated_at && task.updated_at !== task.created_at && (
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Updated {format(new Date(task.updated_at), 'MMM dd, h:mm a')}
          </div>
        )}
      </div>

      {/* List view additional info */}
      {viewMode === 'list' && (
        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-1">
            <UserIcon className="h-4 w-4" />
            <span>{task.creator_name}</span>
          </div>
          
          {task.assignee_name && task.assignee_name !== task.creator_name && (
            <div className="flex items-center space-x-1">
              <span>→</span>
              <span>{task.assignee_name}</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default TaskCard;