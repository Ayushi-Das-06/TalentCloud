import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Briefcase, ExternalLink, Star } from 'lucide-react';
import { apiFetch } from '../lib/api.js';
import { FreelancerProfile } from '../types/index.js';

type PublicFreelancer = FreelancerProfile & {
  portfolioLinks?: { title: string; url: string }[];
  education?: string[];
  contracts?: { id: string; project: { title: string; category: string } }[];
};

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch { return null; }
}

export function FreelancerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['publicFreelancer', id],
    queryFn: () => apiFetch<{ data: PublicFreelancer }>(`/profiles/freelancers/${id}`),
    enabled: !!id,
  });
  const profile = data?.data;

  if (isLoading) return <main className="mx-auto max-w-4xl px-4 py-12 text-sm text-slate-500">Loading freelancer profile…</main>;
  if (isError || !profile) return <main className="mx-auto max-w-4xl px-4 py-12"><p role="alert" className="text-sm text-rose-600">This freelancer profile is unavailable.</p><Link to="/freelancers" className="mt-4 inline-flex items-center gap-2 text-sm text-brand-700"><ArrowLeft className="h-4 w-4" /> Back to talent</Link></main>;

  const projects = profile.contracts || [];
  const portfolioLinks = profile.portfolioLinks || [];
  const education = profile.education || [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <Link to="/freelancers" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700"><ArrowLeft className="h-4 w-4" /> Back to talent</Link>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-100 text-2xl font-bold text-brand-700">
            {profile.user.avatarUrl ? <img src={profile.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : profile.user.name?.[0] || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900">{profile.user.name}</h1>
            <p className="mt-1 text-brand-700">{profile.headline || 'Independent freelancer'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1 text-amber-600"><Star className="h-4 w-4 fill-current" /> {Number(profile.averageRating || 0).toFixed(2)}</span>
              <span>{profile.completedProjectsCount} completed projects</span>
              <span>{profile.experienceYears} years experience</span>
              <span>{profile.availability.replace(/_/g, ' ').toLowerCase()}</span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
            {profile.hourlyRate ? `$${Number(profile.hourlyRate).toLocaleString()}/hr` : 'Custom rate'}
          </div>
        </div>
        <div className="mt-7 border-t border-slate-100 pt-6">
          <h2 className="text-sm font-bold text-slate-900">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{profile.bio || 'This freelancer has not added a biography yet.'}</p>
        </div>
        <div className="mt-6">
          <h2 className="text-sm font-bold text-slate-900">Skills</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {profile.skills?.length ? profile.skills.map((item) => <span key={item.id} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{item.skill.name}</span>) : <p className="text-sm text-slate-500">No skills listed yet.</p>}
          </div>
        </div>
      </section>

      {(portfolioLinks.length > 0 || education.length > 0 || projects.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {portfolioLinks.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-sm font-bold text-slate-900">Portfolio</h2><ul className="mt-3 space-y-2">{portfolioLinks.map((item, index) => { const href = safeExternalUrl(item.url); return <li key={`${item.title}-${index}`}>{href ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-brand-700 hover:underline">{item.title}<ExternalLink className="h-3.5 w-3.5" /></a> : <span className="text-sm text-slate-600">{item.title}</span>}</li>; })}</ul></section>}
          {education.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-sm font-bold text-slate-900">Education</h2><ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">{education.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}
          {projects.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-2"><h2 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900"><Briefcase className="h-4 w-4" /> Completed work</h2><ul className="mt-3 grid gap-3 sm:grid-cols-2">{projects.map(({ id: projectId, project }) => <li key={projectId} className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-800">{project.title}</p><p className="mt-1 text-xs text-slate-500">{project.category}</p></li>)}</ul></section>}
        </div>
      )}
    </main>
  );
}
