import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { FreelancerProfile } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import {
  Search,
  Star,
  CheckCircle,
  Briefcase,
  User,
  ArrowRight,
} from 'lucide-react';

export function FreelancerDiscoveryPage() {
  const [search, setSearch] = useState('');
  const [skill, setSkill] = useState('');
  const [level, setLevel] = useState('');

  const queryParams = new URLSearchParams({
    page: '1',
    limit: '12',
    ...(search && { search }),
    ...(skill && { skill }),
    ...(level && { level }),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ['freelancers', queryParams],
    queryFn: () => apiFetch<{ data: FreelancerProfile[] }>(`/profiles/freelancers?${queryParams}`),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Verified Engineering Talent</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Browse cloud architects, full-stack engineers, and data specialists.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, title, or bio..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <input
            type="text"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            placeholder="Filter by skill (e.g. TypeScript, Docker, AWS)..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Experience Levels</option>
            <option value="ENTRY">Entry Level</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="EXPERT">Expert</option>
          </select>
        </div>
      </div>

      {/* Freelancers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.data.map((freelancer) => (
            <div
              key={freelancer.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-lg font-bold">
                    {freelancer.user.avatarUrl ? (
                      <img src={freelancer.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      freelancer.user.name[0]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate text-base">{freelancer.user.name}</h3>
                    <p className="text-xs text-brand-600 font-medium truncate">{freelancer.headline || 'Independent Consultant'}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {freelancer.averageRating.toFixed(2)}
                      </span>
                      <span>•</span>
                      <span>{freelancer.completedProjectsCount} projects</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {freelancer.bio || 'Verified platform engineer with deep domain competencies.'}
                </p>

                {/* Skills tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {freelancer.skills?.slice(0, 5).map((s) => (
                    <span
                      key={s.id}
                      className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                    >
                      {s.skill?.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="font-bold text-slate-900 text-sm">
                  {freelancer.hourlyRate ? `$${freelancer.hourlyRate}/hr` : 'Custom Rate'}
                </div>
                <Link
                  to={`/freelancers/${freelancer.id}`}
                  className="flex items-center gap-1 text-brand-600 font-semibold hover:text-brand-700 transition-colors"
                >
                  View Profile
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <User className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-700 text-base">No freelancers match your query</h3>
          <p className="text-xs text-slate-400">Try broadening your search criteria.</p>
        </div>
      )}
    </div>
  );
}
