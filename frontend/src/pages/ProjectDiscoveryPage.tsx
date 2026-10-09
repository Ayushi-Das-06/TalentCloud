import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { Project } from '../types/index.js';
import { Badge } from '../components/common/Badge.js';
import {
  Search,
  Filter,
  DollarSign,
  Clock,
  Briefcase,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';

export function ProjectDiscoveryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: '9',
    status: 'OPEN',
    ...(search && { search }),
    ...(category && { category }),
    ...(level && { level }),
    ...(skill && { skill }),
  }).toString();

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', queryParams],
    queryFn: () => apiFetch<{ data: Project[]; pagination: any }>(`/projects?${queryParams}`),
  });

  const categories = ['Web Development', 'Mobile Development', 'Cloud / DevOps', 'AI / Data Science', 'UI/UX Design'];
  const popularSkills = ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'Python'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Open Projects & Contracts</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Browse verified opportunities or filter by skill requirements and experience.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by project title, keyword, or deliverables..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-slate-700 bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-slate-700 bg-white"
            >
              <option value="">All Experience Levels</option>
              <option value="ENTRY">Entry Level</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>
        </div>

        {/* Skill tags quick filter */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Quick Skill Filter:</span>
          {popularSkills.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSkill(skill === s ? '' : s);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-full border transition-colors ${
                skill === s
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
          {skill && (
            <button
              onClick={() => setSkill('')}
              className="text-xs text-rose-600 hover:underline ml-2"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-white border border-slate-200 animate-pulse p-6" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl text-center">
          Failed to load projects. Please try refreshing.
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.data.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                    {project.category}
                  </span>
                  <Badge variant="default" size="sm">
                    {project.experienceLevel}
                  </Badge>
                </div>

                <h3 className="font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1 text-base">
                  {project.title}
                </h3>

                <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                  {project.description}
                </p>

                {/* Required Skills */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {project.skills?.slice(0, 4).map((s) => (
                    <span
                      key={s.id}
                      className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium"
                    >
                      {s.skill?.name}
                    </span>
                  ))}
                  {project.skills && project.skills.length > 4 && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      +{project.skills.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1 font-semibold text-slate-800">
                  <DollarSign className="w-3.5 h-3.5 text-brand-600" />
                  <span>
                    ${project.minBudget} - ${project.maxBudget}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-700 text-base">No projects found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your search keywords or resetting your active skill filters.
          </p>
        </div>
      )}
    </div>
  );
}
