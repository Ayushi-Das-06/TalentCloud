import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  CheckCircle2,
  TrendingUp,
  FileText,
  UserCheck,
} from 'lucide-react';

export function LandingPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickLogin = async (email: string, role: string) => {
    try {
      await login(email, 'Password123!');
      if (role === 'CLIENT') navigate('/client/dashboard');
      else navigate('/freelancer/dashboard');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-850 to-slate-900 text-white pt-20 pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(34,197,94,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              University Cloud Architecture Prototype
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15]">
              Cloud-Native Intelligent{' '}
              <span className="bg-gradient-to-r from-brand-400 to-emerald-200 bg-clip-text text-transparent">
                Freelancing Marketplace
              </span>
            </h1>

            <p className="text-slate-300 text-lg sm:text-xl font-normal max-w-2xl mx-auto leading-relaxed">
              Demonstrating transparent 6-factor AI matching, decoupled asynchronous resume parsing queues, skill-gap telemetry, and autonomous worker scaling.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to="/projects"
                className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-slate-950 px-6 py-3.5 rounded-xl font-semibold shadow-lg shadow-brand-500/25 transition-all"
              >
                Explore Projects
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/estimator"
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-6 py-3.5 rounded-xl font-semibold transition-all"
              >
                Try Budget Estimator
              </Link>
            </div>
          </div>

          {/* Quick Demo Credentials Card */}
          <div className="mt-16 max-w-4xl mx-auto bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <UserCheck className="w-4 h-4 text-brand-400" />
                Examiner & Viva 1-Click Demo Accounts
              </div>
              <span className="text-xs text-slate-400">Password for all: Password123!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-brand-400 font-semibold uppercase">Client Persona</div>
                  <div className="text-white font-medium text-sm mt-1">Sarah Jenkins</div>
                  <div className="text-xs text-slate-400 truncate">sarah.client@demo.com</div>
                </div>
                <button
                  onClick={() => handleQuickLogin('sarah.client@demo.com', 'CLIENT')}
                  className="mt-3 w-full py-1.5 px-3 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 text-xs font-semibold rounded-lg border border-brand-500/30 transition-all text-center"
                >
                  Login as Client →
                </button>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-sky-400 font-semibold uppercase">Expert Freelancer</div>
                  <div className="text-white font-medium text-sm mt-1">Alex Rivera (Full-Stack)</div>
                  <div className="text-xs text-slate-400 truncate">alex.dev@demo.com</div>
                </div>
                <button
                  onClick={() => handleQuickLogin('alex.dev@demo.com', 'FREELANCER')}
                  className="mt-3 w-full py-1.5 px-3 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-semibold rounded-lg border border-sky-500/30 transition-all text-center"
                >
                  Login as Alex →
                </button>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-purple-400 font-semibold uppercase">Cloud Specialist</div>
                  <div className="text-white font-medium text-sm mt-1">Marcus Vance (DevOps)</div>
                  <div className="text-xs text-slate-400 truncate">marcus.devops@demo.com</div>
                </div>
                <button
                  onClick={() => handleQuickLogin('marcus.devops@demo.com', 'FREELANCER')}
                  className="mt-3 w-full py-1.5 px-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-semibold rounded-lg border border-purple-500/30 transition-all text-center"
                >
                  Login as Marcus →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Highlights & Architectural Pillars */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Core Academic Contributions</h2>
            <p className="mt-3 text-slate-600">
              Combining explainable computational heuristics with decoupled asynchronous cloud patterns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Explainable AI Matching</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                6-tier weighted scoring (Skills 40%, Experience 20%, Past Performance 15%, Ratings 10%, Availability 10%, Budget 5%) with canonical alias normalization.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mb-5">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Decoupled Queue Workers</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Asynchronous ingestion buffering prevents heavy document parsing from degrading HTTP response times, allowing horizontal worker scaling.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-5">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Skill-Gap Bridge Engine</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Analyzes competencies against open marketplace demands to surface missing skills and related bridge domains.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mb-5">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-900 text-lg">Smart Budget Estimator</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Heuristic estimator generating transparent hourly projections, deliverable milestones, and duration confidence ranges.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
