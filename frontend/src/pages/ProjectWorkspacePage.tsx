import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Task, Project } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import {
  CheckCircle2,
  PlusCircle,
  Clock,
  Layers,
  Star,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
} from 'lucide-react';

export function ProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Fetch Project Details
  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<{ data: Project }>(`/projects/${projectId}`),
  });

  // Fetch Tasks
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['projectTasks', projectId],
    queryFn: () => apiFetch<{ data: Task[] }>(`/tasks/project/${projectId}`),
    enabled: !!projectId,
  });

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: () =>
      apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          title: taskTitle,
          description: taskDescription,
          priority: taskPriority,
        }),
      }),
    onSuccess: () => {
      setCreateTaskOpen(false);
      setTaskTitle('');
      setTaskDescription('');
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
    },
  });

  // Update Task Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      apiFetch(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: ({ taskId, file }: { taskId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', taskId);
      formData.append('category', 'DELIVERABLE');
      return apiFetch(`/files/projects/${projectId}`, { method: 'POST', body: formData });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectTasks', projectId] }),
  });

  // Complete Project Mutation (Client only)
  const completeProjectMutation = useMutation({
    mutationFn: (contractId: string) =>
      apiFetch(`/hiring/complete/${contractId}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  // Review Submission Mutation
  const reviewMutation = useMutation({
    mutationFn: (revieweeId: string) =>
      apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          revieweeId,
          rating: reviewRating,
          feedback: reviewFeedback,
        }),
      }),
    onSuccess: () => {
      setReviewSuccess(true);
      setTimeout(() => {
        setReviewModalOpen(false);
        setReviewSuccess(false);
      }, 1500);
    },
  });

  const project = projectData?.data;
  const tasks = taskData?.data || [];

  const columns = [
    { key: 'TODO', title: 'To Do', color: 'border-slate-300' },
    { key: 'IN_PROGRESS', title: 'In Progress', color: 'border-indigo-400' },
    { key: 'IN_REVIEW', title: 'In Review', color: 'border-amber-400' },
    { key: 'COMPLETED', title: 'Completed', color: 'border-emerald-400' },
  ];

  const activeContract = (project as any)?.contracts?.[0];
  const isClient = user?.role === 'CLIENT';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 uppercase">
              Project Delivery Workspace
            </span>
            <Badge variant={project?.status === 'COMPLETED' ? 'success' : 'info'}>
              {project?.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-2">{project?.title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track milestones, deliverables, and manage Kanban task flows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateTaskOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Add Task
          </button>

          {isClient && project?.status === 'IN_PROGRESS' && activeContract && (
            <button
              onClick={() => completeProjectMutation.mutate(activeContract.id)}
              disabled={completeProjectMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/20"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Project Completed
            </button>
          )}

          {project?.status === 'COMPLETED' && (
            <button
              onClick={() => setReviewModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <Star className="w-4 h-4 fill-current" />
              Leave Verified Review
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="bg-slate-100/70 rounded-2xl p-4 flex flex-col space-y-3 min-h-[500px]">
              <div className="flex items-center justify-between px-1">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  {col.title}
                </span>
                <span className="w-5 h-5 rounded-full bg-white text-slate-700 font-bold text-xs flex items-center justify-center shadow-xs">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-sm transition-shadow space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-slate-900 text-xs leading-snug">{task.title}</h4>
                      <Badge
                        variant={
                          task.priority === 'URGENT'
                            ? 'danger'
                            : task.priority === 'HIGH'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                    )}

                    {task.files && task.files.length > 0 && (
                      <div className="space-y-1 border-t border-slate-100 pt-2">
                        {task.files.map((file) => (
                          <a
                            key={file.id}
                            href={`/api/v1/files/${encodeURIComponent(file.fileKey)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-[11px] text-brand-700 hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{file.fileName}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-brand-700">
                      <PlusCircle className="w-3.5 h-3.5" />
                      {uploadFileMutation.isPending ? 'Uploading…' : 'Attach file'}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        className="sr-only"
                        disabled={uploadFileMutation.isPending}
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0];
                          if (file) uploadFileMutation.mutate({ taskId: task.id, file });
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>

                    {/* Status Advance Controls */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Move:</span>
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({ taskId: task.id, status: e.target.value })
                        }
                        className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">In Review</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="text-center py-10 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      <Modal isOpen={createTaskOpen} onClose={() => setCreateTaskOpen(false)} title="Create Workspace Task">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Task Title</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Implement schema migration and seed scripts"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Description</label>
            <textarea
              rows={3}
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Milestone details, acceptance criteria, or PR links..."
              className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Priority</label>
            <select
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-3">
            <button
              onClick={() => setCreateTaskOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              disabled={createTaskMutation.isPending || !taskTitle}
              onClick={() => createTaskMutation.mutate()}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              Create Task
            </button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal isOpen={reviewModalOpen} onClose={() => setReviewModalOpen(false)} title="Submit Verified Review">
        {reviewSuccess ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-brand-600 mx-auto" />
            <h4 className="font-bold text-slate-900 text-base">Review Submitted!</h4>
            <p className="text-xs text-slate-500">Your feedback has updated the member's platform rating.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Rating (1 to 5 Stars)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 text-slate-300 hover:text-amber-400 focus:outline-none transition-colors"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= reviewRating ? 'text-amber-400 fill-current' : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Feedback</label>
              <textarea
                rows={4}
                required
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Describe project delivery quality, technical proficiency, and communication..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={reviewMutation.isPending || !reviewFeedback}
                onClick={() => {
                  const targetUser = isClient
                    ? activeContract?.freelancer?.userId
                    : project?.client?.user?.id;
                  if (targetUser) reviewMutation.mutate(targetUser);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                Submit Review
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
