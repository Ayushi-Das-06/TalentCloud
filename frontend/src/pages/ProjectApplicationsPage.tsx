import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api.js';
import { Application, Project } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import {
  Users,
  CheckCircle,
  Clock,
  DollarSign,
  Star,
  ArrowRight,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

export function ProjectApplicationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hiringError, setHiringError] = useState('');

  // Fetch Project Details
  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => apiFetch<{ data: Project }>(`/projects/${projectId}`),
  });

  // Fetch Applications
  const { data: appData, isLoading } = useQuery({
    queryKey: ['projectApplications', projectId],
    queryFn: () => apiFetch<{ data: Application[] }>(`/applications/project/${projectId}`),
    enabled: !!projectId,
  });

  // Hire Mutation
  const hireMutation = useMutation({
    mutationFn: (applicationId: string) =>
      apiFetch('/hiring/hire', {
        method: 'POST',
        body: JSON.stringify({ applicationId }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectApplications', projectId] });
      navigate(`/workspace/projects/${projectId}`);
    },
    onError: (err: any) => {
      setHiringError(err.message || 'Failed to hire freelancer');
    },
  });

  const project = projectData?.data;
  const applications = appData?.data || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <Link to={`/projects/${projectId}`} className="text-xs font-semibold text-brand-600 hover:underline">
            ← Back to Project Details
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Proposals for: {project?.title}
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Status: <span className="font-semibold text-slate-800">{project?.status}</span> • Received {applications.length} proposals
          </p>
        </div>
      </div>

      {hiringError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{hiringError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-slate-400">Loading applications...</div>
      ) : applications.length > 0 ? (
        <div className="space-y-6">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center">
                    {app.freelancerProfile?.user?.name[0] || 'D'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {app.freelancerProfile?.user?.name}
                    </h3>
                    <p className="text-xs text-brand-600 font-medium">
                      {app.freelancerProfile?.headline || 'Full-Stack Software Engineer'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    Proposed: <span className="text-brand-600 font-bold">${app.proposedBudget}</span>
                  </div>
                  <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                    Est. Timeline: <span className="text-slate-800">{app.estimatedDays} Days</span>
                  </div>
                  <Badge
                    variant={
                      app.status === 'ACCEPTED'
                        ? 'success'
                        : app.status === 'REJECTED'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {app.status}
                  </Badge>
                </div>
              </div>

              {/* Cover Letter */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Proposal</div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  {app.coverLetter}
                </p>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {app.freelancerProfile?.skills?.map((s) => (
                  <span
                    key={s.id}
                    className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                  >
                    {s.skill?.name}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                {app.status === 'PENDING' && project?.status === 'OPEN' && (
                  <button
                    onClick={() => hireMutation.mutate(app.id)}
                    disabled={hireMutation.isPending}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {hireMutation.isPending ? 'Executing Hire...' : 'Accept Proposal & Hire'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800 text-base">No proposals received yet</h3>
          <p className="text-xs text-slate-400">
            Freelancers will submit proposals as they discover your project.
          </p>
        </div>
      )}
    </div>
  );
}
