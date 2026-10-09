import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Badge } from '../components/common/Badge.js';
import {
  Sparkles,
  Target,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BookOpen,
  ArrowRight,
  Layers,
} from 'lucide-react';

export function SkillGapPage() {
  const { user } = useAuth();
  const [targetProjectId, setTargetProjectId] = useState('');
  const [customSkills, setCustomSkills] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const { data: projectData } = useQuery({
    queryKey: ['openProjects'],
    queryFn: () => apiFetch<{ data: any[] }>('/projects?status=OPEN&limit=20'),
  });

  const openProjects = projectData?.data || [];

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError('');
    try {
      const body: any = {};
      if (targetProjectId) {
        body.projectId = targetProjectId;
      } else if (customSkills) {
        body.targetSkills = customSkills.split(',').map((s) => s.trim()).filter(Boolean);
      }

      const res = await apiFetch('/intelligent/skill-gap', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setAnalysisResult(res.data);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-6 h-6 text-amber-500" />
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Skill Gap Analysis</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Compare your current competencies against project requirements or industry benchmarks. Identify bridge domains and learning priorities.
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-slate-900 text-base">Configure Analysis Target</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Target Project (Optional)
            </label>
            <select
              value={targetProjectId}
              onChange={(e) => setTargetProjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Use industry benchmark (Full-Stack Cloud Engineer)</option>
              {openProjects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Or Enter Custom Skill Requirements (Comma-separated)
            </label>
            <input
              type="text"
              value={customSkills}
              onChange={(e) => setCustomSkills(e.target.value)}
              placeholder="TypeScript, React, Docker, AWS, PostgreSQL"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {isAnalyzing ? 'Running Analysis...' : 'Run Skill Gap Analysis'}
        </button>
      </div>

      {/* Results Panel */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base">Analysis: {analysisResult.targetTitle}</h2>
              <div className="text-3xl font-extrabold text-brand-400">
                {analysisResult.matchPercentage}%
              </div>
            </div>
            <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${analysisResult.matchPercentage}%` }}
              />
            </div>
            <p className="text-xs text-slate-300">
              Skill coverage: {analysisResult.matchedSkills.length} of {analysisResult.matchedSkills.length + analysisResult.missingSkills.length} required competencies matched.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Matched Skills */}
            <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-sm">
              <h3 className="font-bold text-emerald-700 text-sm flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4" />
                Matched Skills ({analysisResult.matchedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysisResult.matchedSkills.map((skill: string) => (
                  <span key={skill} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                    ✓ {skill}
                  </span>
                ))}
                {analysisResult.matchedSkills.length === 0 && (
                  <p className="text-xs text-slate-400">No direct skill matches found.</p>
                )}
              </div>
            </div>

            {/* Missing Skills */}
            <div className="bg-white rounded-2xl border border-rose-200/80 p-5 shadow-sm">
              <h3 className="font-bold text-rose-700 text-sm flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4" />
                Skill Gaps ({analysisResult.missingSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {analysisResult.missingSkills.map((skill: string) => (
                  <span key={skill} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                    ✗ {skill}
                  </span>
                ))}
                {analysisResult.missingSkills.length === 0 && (
                  <p className="text-xs text-slate-500">🎉 No skill gaps! You match all requirements.</p>
                )}
              </div>
            </div>

            {/* Bridge Skills */}
            <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm">
              <h3 className="font-bold text-amber-700 text-sm flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                Bridge Skills ({analysisResult.bridgeSkills.length})
              </h3>
              <div className="space-y-2">
                {analysisResult.bridgeSkills.map((bridge: any, idx: number) => (
                  <div key={idx} className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="font-semibold text-amber-800">{bridge.relatedKnown}</span>
                    <span className="text-amber-500 mx-1">→</span>
                    <span className="text-amber-700">{bridge.missing}</span>
                  </div>
                ))}
                {analysisResult.bridgeSkills.length === 0 && (
                  <p className="text-xs text-slate-400">No bridge pathways identified.</p>
                )}
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {analysisResult.recommendations && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Strategic Learning Recommendations
              </h3>
              <ul className="space-y-2">
                {analysisResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <ArrowRight className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* In-demand Market Skills */}
          <div className="bg-white rounded-2xl border border-indigo-200/80 p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-indigo-700 text-sm">
              High-Demand Marketplace Skills (2026 Benchmark)
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysisResult.inDemandMarketSkills?.map((skill: string) => (
                <span
                  key={skill}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                    analysisResult.matchedSkills.includes(skill)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
