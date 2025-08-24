import React from 'react';
import { motion } from 'framer-motion';
import { Task } from '../../types';
import TaskCard from './TaskCard.tsx';

interface TaskBoardProps {
  tasks: {
    todo: Task[];
    in_progress: Task[];
    in_review: Task[];
    done: Task[];
  };
  onTaskUpdate: (taskId: string, updates: any) => void;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ tasks, onTaskUpdate }) => {
  const columns = [
    { id: 'todo', title: 'To Do', status: 'todo', color: 'border-gray-300' },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: 'border-blue-300' },
    { id: 'in_review', title: 'In Review', status: 'in_review', color: 'border-yellow-300' },
    { id: 'done', title: 'Done', status: 'done', color: 'border-green-300' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onTaskUpdate(taskId, { status });
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex space-x-6 p-6 min-w-max">
        {columns.map((column) => {
          const columnTasks = tasks[column.status as keyof typeof tasks] || [];
          
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              <div className={`bg-white dark:bg-dark-800 rounded-lg shadow-sm border-2 ${column.color} p-4 h-full min-h-96`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {column.title}
                  </h3>
                  <span className="bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300 text-sm px-2 py-1 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {columnTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="cursor-move"
                    >
                      <TaskCard
                        task={task}
                        index={index}
                        onUpdate={onTaskUpdate}
                        viewMode="board"
                      />
                    </motion.div>
                  ))}
                  
                  {columnTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-dark-600 rounded-lg">
                      <p className="text-sm">Drop tasks here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard;