import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HashtagIcon } from "@heroicons/react/24/outline";
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ViewColumnsIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '../../hooks/redux.ts';
import { getWorkspaceTasks, createTask, updateTask } from '../../store/slices/taskSlice.ts';
import Button from '../ui/Button.tsx';
import Input from '../ui/Input.tsx';
import Modal from '../ui/Modal.tsx';
import TaskCard from './TaskCard.tsx';
import TaskBoard from './TaskBoard.tsx';
import toast from 'react-hot-toast';

const TasksView: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  // New task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    assigned_to: '',
    due_date: '',
    tags: [] as string[],
  });

  const dispatch = useAppDispatch();
  const { tasks, loading } = useAppSelector((state) => state.task);
  const { user } = useAppSelector((state) => state.auth);
  const { currentWorkspace } = useAppSelector((state) => state.workspace);

  useEffect(() => {
    if (workspaceId) {
      dispatch(getWorkspaceTasks({ workspaceId }));
    }
  }, [workspaceId, dispatch]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTask.title.trim() || !workspaceId) {
      toast.error('Task title is required');
      return;
    }

    try {
      await dispatch(createTask({
        workspaceId,
        taskData: {
          title: newTask.title.trim(),
          description: newTask.description.trim() || undefined,
          priority: newTask.priority,
          assigned_to: newTask.assigned_to || undefined,
          due_date: newTask.due_date || undefined,
          tags: newTask.tags.length > 0 ? newTask.tags : undefined,
        },
      })).unwrap();
      
      toast.success('Task created successfully!');
      setShowCreateModal(false);
      resetTaskForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create task');
    }
  };

  const resetTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      assigned_to: '',
      due_date: '',
      tags: [],
    });
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    if (!workspaceId) return;

    try {
      await dispatch(updateTask({
        workspaceId,
        taskId,
        taskData: updates,
      })).unwrap();
      
      toast.success('Task updated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || 
                           (assigneeFilter === 'me' && task.assigned_to === user?.id) ||
                           task.assigned_to === assigneeFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    in_review: filteredTasks.filter(t => t.status === 'in_review'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    in_review: tasks.filter(t => t.status === 'in_review').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  const priorityColors = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  };

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-dark-700 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    in_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    done: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-dark-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Tasks
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and track your team's work
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* View mode toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'board'
                    ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ViewColumnsIcon className="h-4 w-4 mr-1" />
                Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-dark-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ListBulletIcon className="h-4 w-4 mr-1" />
                List
              </button>
            </div>
            
            <Button onClick={() => setShowCreateModal(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 py-4 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.total}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-500">{taskStats.todo}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">To Do</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{taskStats.in_progress}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{taskStats.in_review}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">In Review</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{taskStats.done}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Done</div>
          </div>
        </div>
      </div>

      {/* Filters - Only show if we have tasks */}
      {tasks.length > 0 && (
        <div className="px-6 py-4 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks..."
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center space-x-3">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="input-field min-w-[120px]"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="input-field min-w-[130px]"
              >
                <option value="all">All Assignees</option>
                <option value="me">My Tasks</option>
                {/* Could add more assignees dynamically */}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tasks...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {tasks.length === 0 ? 'No tasks yet' : 'No matching tasks'}
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {tasks.length === 0 
                  ? 'Create your first task to start tracking work'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
              {tasks.length === 0 && (
                <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Task
                </Button>
              )}
            </div>
          </div>
        ) : viewMode === 'board' ? (
          <TaskBoard tasks={tasksByStatus} onTaskUpdate={handleTaskUpdate} />
        ) : (
          <div className="p-6 space-y-4 overflow-y-auto">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <TaskCard
                  task={task}
                  index={index}
                  onUpdate={handleTaskUpdate}
                  viewMode="list"
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create task modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetTaskForm();
        }}
        title="Create New Task"
        size="lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            placeholder="Enter task title"
            required
            autoFocus
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Describe the task..."
              rows={3}
              className="input-field resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="input-field"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <Input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
            </div>
          </div>

          {/* Assignee selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assign to
            </label>
            <select
              value={newTask.assigned_to}
              onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
              className="input-field"
            >
              <option value="">Unassigned</option>
              <option value={user?.id}>Assign to me</option>
              {/* Add workspace members dynamically */}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                resetTaskForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TasksView;