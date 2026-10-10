import { FormEvent, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext.js';
import { apiFetch } from '../lib/api.js';
import { FreelancerProfile, ClientProfile } from '../types/index.js';

type Profile = FreelancerProfile | ClientProfile;

export function ProfilePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isFreelancer = user?.role === 'FREELANCER';
  const endpoint = isFreelancer ? `/profiles/freelancers/${user?.profile?.id}` : `/profiles/clients/${user?.profile?.id}`;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['editableProfile', user?.id],
    queryFn: () => apiFetch<{ data: Profile }>(endpoint),
    enabled: !!user?.profile?.id && (user.role === 'CLIENT' || isFreelancer),
  });
  const profile = data?.data;
  const [fields, setFields] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!profile) return;
    if (isFreelancer) {
      const freelancer = profile as FreelancerProfile;
      setFields({
        headline: freelancer.headline || '',
        bio: freelancer.bio || '',
        experienceYears: String(freelancer.experienceYears ?? 0),
        experienceLevel: freelancer.experienceLevel || 'INTERMEDIATE',
        hourlyRate: String(freelancer.hourlyRate ?? ''),
        availability: freelancer.availability || 'FULL_TIME',
      });
    } else {
      const client = profile as ClientProfile;
      setFields({ companyName: client.companyName || '', industry: client.industry || '', description: client.description || '', website: client.website || '' });
    }
  }, [profile, isFreelancer]);

  const save = useMutation({
    mutationFn: () => apiFetch(isFreelancer ? '/profiles/freelancer' : '/profiles/client', {
      method: 'PUT',
      body: JSON.stringify(isFreelancer ? {
        ...fields,
        experienceYears: Number(fields.experienceYears),
        hourlyRate: fields.hourlyRate === '' ? null : Number(fields.hourlyRate),
      } : fields),
    }),
    onSuccess: async () => {
      setNotice('Profile saved.');
      await queryClient.invalidateQueries({ queryKey: ['editableProfile', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['authUser'] });
    },
    onError: (error: Error) => setNotice(error.message || 'Could not save the profile.'),
  });

  const updateField = (key: string, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
  const submit = (event: FormEvent) => { event.preventDefault(); setNotice(''); save.mutate(); };

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-slate-500">Loading profile…</main>;
  if (isError || !profile) return <main className="mx-auto max-w-3xl px-4 py-12 text-sm text-rose-600">Could not load this profile. Sign in again and retry.</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Edit your profile</h1><p className="mt-1 text-sm text-slate-500">Keep your marketplace information accurate and current.</p></div>
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {isFreelancer ? <>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">Professional headline<input required maxLength={120} className={inputClass} value={fields.headline || ''} onChange={(e) => updateField('headline', e.target.value)} /></label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">About you<textarea required maxLength={5000} rows={5} className={inputClass} value={fields.bio || ''} onChange={(e) => updateField('bio', e.target.value)} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-xs font-semibold text-slate-700">Experience years<input type="number" min="0" max="60" className={inputClass} value={fields.experienceYears || ''} onChange={(e) => updateField('experienceYears', e.target.value)} /></label>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">Experience level<select className={inputClass} value={fields.experienceLevel} onChange={(e) => updateField('experienceLevel', e.target.value)}><option value="ENTRY">Entry</option><option value="INTERMEDIATE">Intermediate</option><option value="EXPERT">Expert</option></select></label>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">Hourly rate (USD)<input type="number" min="0" max="100000" step="0.01" className={inputClass} value={fields.hourlyRate || ''} onChange={(e) => updateField('hourlyRate', e.target.value)} /></label>
            <label className="block space-y-1 text-xs font-semibold text-slate-700">Availability<select className={inputClass} value={fields.availability} onChange={(e) => updateField('availability', e.target.value)}><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="NOT_AVAILABLE">Not available</option></select></label>
          </div>
        </> : <>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">Company name<input required maxLength={160} className={inputClass} value={fields.companyName || ''} onChange={(e) => updateField('companyName', e.target.value)} /></label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">Industry<input maxLength={120} className={inputClass} value={fields.industry || ''} onChange={(e) => updateField('industry', e.target.value)} /></label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">Company description<textarea rows={4} maxLength={5000} className={inputClass} value={fields.description || ''} onChange={(e) => updateField('description', e.target.value)} /></label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">Website<input type="url" maxLength={500} className={inputClass} value={fields.website || ''} onChange={(e) => updateField('website', e.target.value)} /></label>
        </>}
        {notice && <p role="status" className={`text-sm ${save.isError ? 'text-rose-600' : 'text-emerald-700'}`}>{notice}</p>}
        <button type="submit" disabled={save.isPending} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save profile'}</button>
      </form>
    </main>
  );
}
