import React from 'react';
import { Cloud, GitBranch, ShieldCheck, Cpu } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto bg-slate-900 border-t border-slate-800 text-slate-400 text-sm py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Cloud className="w-5 h-5 text-brand-500" />
              TalentCloud
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Academic prototype demonstrating decoupled asynchronous cloud architecture, explainable AI matching, and autonomous worker scaling.
            </p>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Intelligent Engines</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-white transition-colors">Weighted 6-Factor Matching</li>
              <li className="hover:text-white transition-colors">Canonical Skill Normalization</li>
              <li className="hover:text-white transition-colors">Resume Skill Extraction Pipeline</li>
              <li className="hover:text-white transition-colors">Marketplace Skill-Gap Bridge</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Cloud Architecture</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-indigo-400" /> Decoupled BullMQ / SQS Workers</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Role-Based Access Control</li>
              <li className="flex items-center gap-1.5"><GitBranch className="w-3.5 h-3.5 text-blue-400" /> PostgreSQL ACID Transactions</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Course Defense</h4>
            <p className="text-xs text-slate-400 mb-2">Cloud Architecture Design Master Demonstration.</p>
            <div className="text-[11px] text-slate-500">
              PostgreSQL 18 • Express • React 18 • TypeScript • Tailwind CSS
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <div>© 2026 TalentCloud. Built for University Cloud Architecture Viva & Project Defense.</div>
          <div className="mt-2 sm:mt-0">All algorithms and asynchronous queues verified.</div>
        </div>
      </div>
    </footer>
  );
}
