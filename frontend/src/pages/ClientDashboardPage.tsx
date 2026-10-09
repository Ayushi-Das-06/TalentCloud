import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { apiFetch } from '../lib/api.js';
import { Project } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import {
  PlusCircle,
  Briefcase,
  Users,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export function ClientDashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['clientProjects'],
    queryFn: () => apiFetch<{ data: Project[] }>('/projects/my-projects'),
  });

  const projects = data?.data || [];
  const openProjects = projects.filter((p) => p.status === 'OPEN');
  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS');
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 text-brand-700 border border-brand-200 uppercase">
            Client Management Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your project lifecycles, review proposals, and assign workspace tasks.
          </p>
        </div>

        <Link
          to="/projects/create"
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-xl font-semibold text-sm shadow-md shadow-brand-500/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Post New Project
        </Link>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Open for Bidding</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{openProjects.length}</div>
          <div className="text-xs text-brand-600 font-medium mt-1">Accepting developer proposals</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">In Progress</div>
          <div className="text-3xl font-extrabold text-indigo-600 mt-2">{inProgressProjects.length}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Active development contracts</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-xs text-slate-400 font-semibold uppercase">Delivered & Closed</div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{completedProjects.length}</div>
          <div className="text-xs text-slate-500 font-medium mt-1">Completed milestones</div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 text-base">Your Active & Historical Projects</h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading projects...</div>
        ) : projects.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {projects.map((project) => (
              <div
                key={project.id}
                className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{project.title}</h3>
                    <Badge
                      variant={
                        project.status === 'OPEN'
                          ? 'success'
                          : project.status === 'IN_PROGRESS'
                          ? 'info'
                          : 'default'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    Category: <span className="font-medium text-slate-700">{project.category}</span> • Budget: ${project.minBudget} - ${project.maxBudget} • Applications: <span className="font-semibold text-brand-600">{project._count?.applications || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {project.status === 'OPEN' && (
                    <Link
                      to={`/client/projects/${project.id}/applications`}
                      className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl border border-brand-200 transition-colors"
                    >
                      Review Proposals ({project._count?.applications || 0})
                    </Link>
                  )}

                  {project.status === 'IN_PROGRESS' && (
                    <Link
                      to={`/workspace/projects/${project.id}`}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors"
                    >
                      Project Workspace
                    </Link>
                  )}

                  <Link
                    to={`/projects/${project.id}`}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                    title="View Public Details"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 text-sm space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <div>You haven't posted any projects yet.</div>
            <Link
              to="/projects/create"
              className="inline-block px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-semibold"
            >
              Post your first project
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
