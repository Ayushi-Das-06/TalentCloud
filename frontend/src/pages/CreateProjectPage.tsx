import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api.js';
import { Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

export function CreateProjectPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Web Development');
  const [experienceLevel, setExperienceLevel] = useState('INTERMEDIATE');
  const [complexity, setComplexity] = useState('MEDIUM');
  const [minBudget, setMinBudget] = useState('2000');
  const [maxBudget, setMaxBudget] = useState('3500');
  const [estimatedDurationDays, setEstimatedDurationDays] = useState('30');
  const [skills, setSkills] = useState('TypeScript, React, Node.js');
  const [expectedDeliverables, setExpectedDeliverables] = useState('');
  const [error, setError] = useState('');

  const [estimateData, setEstimateData] = useState<any>(null);

  // Quick Heuristic Estimate Call
  const handleFetchEstimate = async () => {
    try {
      const skillsArray = skills.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await apiFetch('/intelligent/estimate', {
        method: 'POST',
        body: JSON.stringify({
          category,
          complexity,
          experienceLevel,
          skillsCount: skillsArray.length,
          tasksCount: 4,
        }),
      });

      if (res?.data) {
        setEstimateData(res.data);
        setMinBudget(res.data.suggestedBudgetMin.toString());
        setMaxBudget(res.data.suggestedBudgetMax.toString());
        setEstimatedDurationDays(res.data.suggestedDurationDaysMax.toString());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const skillsArray = skills.split(',').map((s) => s.trim()).filter(Boolean);
      return apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          category,
          experienceLevel,
          complexity,
          minBudget: parseFloat(minBudget),
          maxBudget: parseFloat(maxBudget),
          estimatedDurationDays: parseInt(estimatedDurationDays, 10),
          expectedDeliverables,
          skills: skillsArray,
        }),
      });
    },
    onSuccess: (data) => {
      navigate(`/projects/${data.data.id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create project');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Post a New Project</h1>
        <p className="mt-1 text-slate-500 text-sm">
          Define deliverables and let our explainable matching engine recommend verified talent.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Project Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Distributed Telemetry & Metrics Processing Engine"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Detailed Description</label>
          <textarea
            rows={5}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the architectural requirements, scope, tech stack, and goals..."
            className="w-full p-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="Web Development">Web Development</option>
              <option value="Mobile Development">Mobile Development</option>
              <option value="Cloud / DevOps">Cloud / DevOps</option>
              <option value="AI / Data Science">AI / Data Science</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="ENTRY">Entry Level</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Complexity</label>
            <select
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Required Skills (Comma separated)
          </label>
          <input
            type="text"
            required
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="TypeScript, React, Node.js, PostgreSQL"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        {/* AI Estimation Trigger Box */}
        <div className="p-4 bg-brand-50/60 border border-brand-200/80 rounded-xl flex items-center justify-between gap-4">
          <div className="text-xs text-brand-900">
            <span className="font-bold flex items-center gap-1.5 text-brand-700">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Budget & Timeline Guidance
            </span>
            <span>Calculate explainable market rates based on your selected complexity and skill count.</span>
          </div>
          <button
            type="button"
            onClick={handleFetchEstimate}
            className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Auto-Estimate Rates
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Min Budget ($)</label>
            <input
              type="number"
              required
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Max Budget ($)</label>
            <input
              type="number"
              required
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Est. Duration (Days)</label>
            <input
              type="number"
              required
              value={estimatedDurationDays}
              onChange={(e) => setEstimatedDurationDays(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
            Expected Deliverables (Optional)
          </label>
          <input
            type="text"
            value={expectedDeliverables}
            onChange={(e) => setExpectedDeliverables(e.target.value)}
            placeholder="e.g. Source code repository, Docker Compose file, API tests, Technical documentation"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 text-sm font-semibold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-500/20 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Publishing...' : 'Publish Project'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
