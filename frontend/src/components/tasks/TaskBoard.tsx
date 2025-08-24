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
    { id: 'todo', title: 'To Do', status: 'todo' },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
    { id: 'in_review', title: 'In Review', status: 'in_review' },
    { id: 'done', title: 'Done', status: 'done' },
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
    <div className="flex-1 overflow-hidden">
      <div className="flex h-full overflow-x-auto">
        <div className="flex space-x-6 p-6 min-w-max h-full">
          {columns.map((column) => {
            const columnTasks = tasks[column.status as keyof typeof tasks] || [];
            
            return (
              <div
                key={column.id}
                className="flex-shrink-0 w-80 h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.status)}
              >
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
                  {/* Fixed header */}
                  <div className="flex-shrink-0 p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        {column.title}
                      </h3>
                      <span className="bg-gray-200 text-gray-700 text-sm px-2 py-1 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>
                  </div>
                  
                  {/* Scrollable content area */}
                  <div className="flex-1 overflow-y-auto p-4" style={{maxHeight: 'calc(100vh - 300px)'}}>
                    <div className="space-y-3">
                      {columnTasks.map((task, index) => (
                        <div
                          key={task.id}
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
                        </div>
                      ))}
                      
                      {columnTasks.length === 0 && (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                          <p className="text-sm">Drop tasks here</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TaskBoard;