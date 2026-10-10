import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Project, MatchCandidate } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import { Modal } from '../components/common/Modal.js';
import {
  DollarSign,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  UserCheck,
  Send,
  Building,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export function ProjectDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedBudget, setProposedBudget] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('14');
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Fetch Project Details
  const { data: projectData, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => apiFetch<{ data: Project }>(`/projects/${id}`),
  });

  // Fetch Explainable Freelancer Recommendations for this project
  const { data: matchData } = useQuery({
    queryKey: ['projectMatches', id],
    queryFn: () => apiFetch<{ matches: MatchCandidate[] }>(`/intelligent/match/project/${id}`),
    enabled:
      !!id &&
      user?.role === 'CLIENT' &&
      user.profile?.id === projectData?.data?.clientId,
  });

  // Submit Application Mutation
  const applyMutation = useMutation({
    mutationFn: () =>
      apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({
          projectId: id,
          coverLetter,
          proposedBudget: Number(proposedBudget),
          estimatedDays: parseInt(estimatedDays, 10),
        }),
      }),
    onSuccess: () => {
      setApplySuccess(true);
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setTimeout(() => {
        setApplyModalOpen(false);
        setApplySuccess(false);
      }, 2000);
    },
    onError: (err: any) => {
      setApplyError(err.message || 'Failed to submit proposal');
    },
  });

  if (isLoading) {
    return <div className="max-w-5xl mx-auto py-16 text-center text-slate-500">Loading project details...</div>;
  }

  const project = projectData?.data;
  if (!project) {
    return <div className="max-w-5xl mx-auto py-16 text-center text-slate-700 font-medium">Project not found.</div>;
  }

  const isClientOwner = user?.role === 'CLIENT' && user?.profile?.id === project.clientId;
  const isFreelancer = user?.role === 'FREELANCER';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-50 text-brand-700 border border-brand-200">
                {project.category}
              </span>
              <Badge variant={project.status === 'OPEN' ? 'success' : 'default'}>
                {project.status}
              </Badge>
              <span className="text-xs text-slate-400 font-medium">
                Posted {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {project.title}
            </h1>
          </div>

          {/* Action CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {isFreelancer && project.status === 'OPEN' && (
              <button
                onClick={() => {
                  setProposedBudget(project.maxBudget.toString());
                  setApplyModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md shadow-brand-500/20 transition-all text-sm"
              >
                <Send className="w-4 h-4" />
                Submit Proposal
              </button>
            )}

            {isClientOwner && (
              <Link
                to={`/client/projects/${project.id}/applications`}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-all"
              >
                View Applications ({project._count?.applications || 0})
              </Link>
            )}
          </div>
        </div>

        {/* Key Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Budget Range</div>
              <div className="font-bold text-slate-900">
                ${project.minBudget} - ${project.maxBudget} {project.currency}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Est. Duration</div>
              <div className="font-bold text-slate-900">~{project.estimatedDurationDays} Days</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Complexity</div>
              <div className="font-bold text-slate-900">{project.complexity}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Experience Needed</div>
              <div className="font-bold text-slate-900">{project.experienceLevel}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Description */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Project Overview</h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {project.description}
            </div>

            {project.expectedDeliverables && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <h3 className="text-sm font-semibold text-slate-800">Expected Deliverables</h3>
                <p className="text-sm text-slate-600">{project.expectedDeliverables}</p>
              </div>
            )}
          </div>

          {/* Required Skills */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Required Skills & Technologies</h3>
            <div className="flex flex-wrap gap-2">
              {project.skills?.map((s) => (
                <span
                  key={s.id}
                  className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                >
                  {s.skill.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Client Details & Intelligent Match Preview */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500" />
              About the Client
            </h3>
            <div>
              <div className="font-semibold text-slate-800 text-sm">
                {project.client?.companyName || project.client?.user.name}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">Verified Client</div>
            </div>
          </div>

          {/* Intelligent Top Recommended Freelancers */}
          {matchData?.matches && matchData.matches.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-850 rounded-2xl p-6 text-white shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-sm tracking-tight">AI Matching Candidates</h3>
              </div>
              <p className="text-xs text-slate-300">
                Top candidates ranked using 6 weighted parameters against project requirements.
              </p>

              <div className="space-y-3 pt-2">
                {matchData.matches.slice(0, 3).map((match) => (
                  <div
                    key={match.candidateId}
                    className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{match.candidateName}</span>
                      <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-bold text-[11px] border border-brand-500/30">
                        {match.overallScore}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tier: <span className="text-brand-300 font-medium">{match.matchTier}</span>
                    </div>
                    <div className="text-[10px] text-slate-300 line-clamp-1 italic">
                      {match.explanations[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Apply Proposal Modal */}
      <Modal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} title="Submit Project Proposal">
        {applySuccess ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-brand-600 mx-auto" />
            <h4 className="font-bold text-slate-900 text-lg">Proposal Submitted!</h4>
            <p className="text-xs text-slate-500">The client will review your application and proposal terms.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{applyError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Cover Letter & Approach
              </label>
              <textarea
                rows={4}
                required
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Explain how your expertise matches the requirements and your proposed roadmap..."
                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Proposed Budget ($)
                </label>
                <input
                  type="number"
                  required
                  value={proposedBudget}
                  onChange={(e) => setProposedBudget(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Estimated Days
                </label>
                <input
                  type="number"
                  required
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={applyMutation.isPending || !coverLetter || !proposedBudget}
                onClick={() => applyMutation.mutate()}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-500/20 disabled:opacity-50"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Proposal'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
