import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { apiFetch } from '../lib/api.js';
import { Application, Contract } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  RefreshCw,
} from 'lucide-react';

export function FreelancerDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // 1. Fetch Freelancer Applications
  const { data: appData, isLoading: appsLoading } = useQuery({
    queryKey: ['myApplications'],
    queryFn: () => apiFetch<{ data: Application[] }>('/applications/my-applications'),
  });

  // 2. Fetch Active Contracts
  const { data: contractData } = useQuery({
    queryKey: ['myContracts'],
    queryFn: () => apiFetch<{ data: Contract[] }>('/hiring'),
  });

  // 3. Fetch Resume Status
  const { data: resumeData, refetch: refetchResume } = useQuery({
    queryKey: ['resumeStatus'],
    queryFn: () => apiFetch<{ data: any }>('/files/resume/status'),
    refetchInterval: (query) => {
      // Auto-poll every 2s if queued or processing to show decoupled worker progress!
      const status = query.state.data?.data?.status;
      return status === 'QUEUED' || status === 'PROCESSING' ? 2000 : false;
    },
  });

  const { data: freelancerProfileData } = useQuery({
    queryKey: ['editableProfile', user?.id],
    queryFn: () => apiFetch<{ data: any }>(`/profiles/freelancers/${user?.profile?.id}`),
    enabled: !!user?.profile?.id,
  });

  const confirmSkillMutation = useMutation({
    mutationFn: ({ skillName, yearsExperience }: { skillName: string; yearsExperience: number }) =>
      apiFetch('/profiles/freelancer/skills', {
        method: 'POST',
        body: JSON.stringify({ skillName, yearsExperience }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['editableProfile', user?.id] }),
  });

  // 4. Resume Upload Mutation
  const resumeUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFetch('/files/resume', {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: (data) => {
      setUploadStatus('Resume submitted! Background worker is extracting skills...');
      setSelectedFile(null);
      refetchResume();
      queryClient.invalidateQueries({ queryKey: ['resumeStatus'] });
    },
    onError: (err: any) => {
      setUploadStatus(`Upload failed: ${err.message}`);
    },
  });

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      resumeUploadMutation.mutate(selectedFile);
    }
  };

  const applications = appData?.data || [];
  const contracts = contractData?.data || [];
  const resume = resumeData?.data;
  const confirmedSkillNames = new Set((freelancerProfileData?.data?.skills || []).filter((item: any) => item.isVerified).map((item: any) => item.skill.name.toLowerCase()));
  let extractedSkills: { skill: string; occurrences: number }[] = [];
  if (resume?.analysis?.extractedSkills) {
    try {
      const value = typeof resume.analysis.extractedSkills === 'string' ? JSON.parse(resume.analysis.extractedSkills) : resume.analysis.extractedSkills;
      extractedSkills = Array.isArray(value) ? value : [];
    } catch { extractedSkills = []; }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase">
            Freelancer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Track active proposals, contracts, resume analytics, and skill-gap recommendations.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/skill-gap"
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-slate-950 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all"
          >
            <Layers className="w-4 h-4" />
            Skill Gap Telemetry
          </Link>
          <Link
            to="/projects"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm transition-all"
          >
            Find Projects
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Applications & Active Contracts */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Contracts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Active Contracts ({contracts.length})</span>
            </h2>

            {contracts.length > 0 ? (
              <div className="space-y-3">
                {contracts.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-brand-300 transition-colors flex items-center justify-between gap-4"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{c.project?.title}</h4>
                      <div className="text-xs text-slate-500 mt-1">
                        Client: <span className="font-medium text-slate-700">{c.client?.companyName || 'Verified Client'}</span> • Agreed Budget: <span className="font-semibold text-brand-600">${c.agreedBudget}</span>
                      </div>
                    </div>
                    <Link
                      to={`/workspace/projects/${c.projectId}`}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      Project Workspace
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No active contracts currently. Submit proposals to open projects to get hired!
              </div>
            )}
          </div>

          {/* Submitted Proposals */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Submitted Proposals ({applications.length})</h2>

            {applications.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <div key={app.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">{app.project?.title}</h4>
                      <div className="text-xs text-slate-500 mt-1">
                        Proposed: <span className="font-semibold text-slate-800">${app.proposedBudget}</span> in {app.estimatedDays} days • Submitted {new Date(app.createdAt).toLocaleDateString()}
                      </div>
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
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                You haven't submitted any proposals yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Intelligent Resume Ingestion Worker Panel */}
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-brand-600" />
              <h3 className="font-bold text-slate-900 text-sm">Decoupled Resume Ingestion</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your resume (PDF, DOCX, TXT, or Markdown). A background worker extracts suggested skills; confirm each skill before it is marked as verified.
            </p>

            <form onSubmit={handleFileUpload} className="space-y-3 pt-2">
              <input
                type="file"
                accept=".pdf,.txt,.docx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
              />

              <button
                type="submit"
                disabled={!selectedFile || resumeUploadMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                {resumeUploadMutation.isPending ? 'Enqueueing...' : 'Upload & Queue Ingestion'}
              </button>
            </form>

            {uploadStatus && (
              <div className="text-xs text-brand-700 bg-brand-50 p-2.5 rounded-lg border border-brand-200">
                {uploadStatus}
              </div>
            )}

            {/* Ingestion Worker Status Indicator */}
            {resume && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Worker Status:</span>
                  <Badge
                    variant={
                      resume.status === 'COMPLETED'
                        ? 'success'
                        : resume.status === 'FAILED'
                        ? 'danger'
                        : 'info'
                    }
                  >
                    {resume.status}
                  </Badge>
                </div>

                {resume.status === 'COMPLETED' && resume.analysis && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-200">
                    <div className="font-semibold text-slate-800 flex items-center justify-between">
                      <span>Extracted Skills</span>
                      <span className="text-brand-600">{resume.analysis.confidenceScore}% confidence</span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {extractedSkills.map((item, idx) => {
                        const confirmed = confirmedSkillNames.has(item.skill.toLowerCase());
                        return <div key={`${item.skill}-${idx}`} className="flex items-center gap-1 rounded bg-white border border-slate-200 px-2 py-1">
                          <span className="text-[10px] font-medium text-slate-700">{item.skill}</span>
                          <button type="button" disabled={confirmed || confirmSkillMutation.isPending} onClick={() => confirmSkillMutation.mutate({ skillName: item.skill, yearsExperience: Math.min(5, Math.max(1, item.occurrences || 1)) })} className="text-[9px] font-semibold text-brand-700 disabled:text-emerald-700">{confirmed ? 'Confirmed' : 'Confirm skill'}</button>
                        </div>;
                      })}
                    </div>
                  </div>
                )}
                {confirmSkillMutation.isError && <p role="alert" className="text-xs text-rose-600">Could not confirm the skill. Please retry.</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
