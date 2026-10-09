import React, { useState } from 'react';
import { apiFetch } from '../lib/api.js';
import {
  Sparkles,
  DollarSign,
  Clock,
  AlertCircle,
  TrendingUp,
  Info,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function BudgetEstimatorPage() {
  const [category, setCategory] = useState('Web Development');
  const [complexity, setComplexity] = useState('MEDIUM');
  const [experienceLevel, setExperienceLevel] = useState('INTERMEDIATE');
  const [tasksCount, setTasksCount] = useState('4');
  const [skillsCount, setSkillsCount] = useState('4');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEstimate = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiFetch('/intelligent/estimate', {
        method: 'POST',
        body: JSON.stringify({
          category,
          complexity,
          experienceLevel,
          tasksCount: parseInt(tasksCount, 10),
          skillsCount: parseInt(skillsCount, 10),
        }),
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Estimation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = result
    ? [
        { name: 'Skill Complexity', value: Math.round(result.factors.complexityMultiplier * 40) },
        { name: 'Experience Level', value: Math.round(result.factors.experienceMultiplier * 40) },
        { name: 'Task Volume', value: Math.min(100, parseInt(tasksCount) * 15) },
        { name: 'Skill Breadth', value: Math.min(100, parseInt(skillsCount) * 12) },
      ]
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-emerald-500" />
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Smart Budget & Timeline Estimator</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Generate explainable budget ranges and timeline projections using documented heuristic methodology — not black-box AI.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Academic Transparency Notice:</strong> This estimator uses a documented heuristic model with configurable category base rates, complexity multipliers, and experience adjustments. Results are indicative guidance, not trained ML predictions.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-slate-900 text-base">Project Parameters</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Project Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Web Development">Web Development</option>
                <option value="Mobile Development">Mobile Development</option>
                <option value="Cloud / DevOps">Cloud / DevOps</option>
                <option value="AI / Data Science">AI / Data Science</option>
                <option value="UI/UX Design">UI/UX Design</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Complexity</label>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="LOW">Low (1.0x)</option>
                  <option value="MEDIUM">Medium (1.4x)</option>
                  <option value="HIGH">High (2.1x)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Experience Level</label>
                <select
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="ENTRY">Entry (0.8x)</option>
                  <option value="INTERMEDIATE">Intermediate (1.2x)</option>
                  <option value="EXPERT">Expert (1.8x)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Milestone Tasks</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tasksCount}
                  onChange={(e) => setTasksCount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Required Skills</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={skillsCount}
                  onChange={(e) => setSkillsCount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleEstimate}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isLoading ? 'Calculating...' : 'Generate Explainable Estimate'}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        {result ? (
          <div className="space-y-4">
            {/* Budget Range */}
            <div className="bg-white rounded-2xl border border-brand-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-base">Suggested Budget Range</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                  result.confidence === 'HIGH'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {result.confidence} Confidence
                </span>
              </div>

              <div className="text-3xl font-extrabold text-slate-900">
                ${result.suggestedBudgetMin.toLocaleString()} – ${result.suggestedBudgetMax.toLocaleString()}
                <span className="text-slate-400 text-base font-medium ml-1">{result.currency}</span>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>Duration: <strong>{result.suggestedDurationDaysMin}–{result.suggestedDurationDaysMax} days</strong></span>
                </div>
                <div className="text-slate-400">•</div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Effective Rate: <strong>${result.factors.baseRatePerHour}/hr</strong></span>
                </div>
              </div>
            </div>

            {/* Factor Breakdown Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm mb-4">Weighted Cost Factor Breakdown</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Weight Score']} />
                  <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Methodology Notes */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Methodology & Assumptions</h3>
              <ul className="space-y-1.5">
                {result.assumptions.map((assumption: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-brand-500 font-bold">•</span>
                    {assumption}
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-slate-200 text-xs text-slate-400">
                Est. Hours: {result.factors.estimatedHoursMin}–{result.factors.estimatedHoursMax} hrs |
                Complexity multiplier: {result.factors.complexityMultiplier}x |
                Experience multiplier: {result.factors.experienceMultiplier}x
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-slate-300" />
            <h3 className="font-semibold text-slate-500 text-sm">Configure parameters and generate estimate</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              The estimator uses documented category rates, complexity and experience multipliers with full transparency.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
