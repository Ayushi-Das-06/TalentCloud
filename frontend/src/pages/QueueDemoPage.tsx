import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '../lib/api.js';
import { Badge } from '../components/common/Badge.js';
import {
  Cpu,
  Activity,
  RefreshCw,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
  Server,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function QueueDemoPage() {
  const [burstCount, setBurstCount] = useState(5);
  const [burstResult, setBurstResult] = useState<any>(null);
  const [burstLoading, setBurstLoading] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['queueStats'],
    queryFn: () => apiFetch<{ data: any }>('/admin/queue'),
    refetchInterval: 3000, // Auto-poll every 3s
  });

  const { data: systemStats } = useQuery({
    queryKey: ['systemStats'],
    queryFn: () => apiFetch<any>('/admin/stats'),
    refetchInterval: 5000,
  });

  const handleBurstTest = async () => {
    setBurstLoading(true);
    setBurstResult(null);
    try {
      const res = await apiFetch('/admin/queue/burst', {
        method: 'POST',
        body: JSON.stringify({ count: burstCount }),
      });
      setBurstResult(res);
      // Trigger immediate refetch
      setTimeout(() => refetch(), 300);
    } catch (err: any) {
      setBurstResult({ error: err.message });
    } finally {
      setBurstLoading(false);
    }
  };

  const stats = data?.data || {};
  const sysStats = systemStats?.stats || {};
  const queueStats = systemStats?.queue || {};
  const system = systemStats?.system || {};

  const chartData = [
    { name: 'Pending', value: stats.waiting || 0, color: '#f59e0b' },
    { name: 'Processing', value: stats.active || 0, color: '#6366f1' },
    { name: 'Completed', value: stats.completed || 0, color: '#22c55e' },
    { name: 'Failed', value: stats.failed || 0, color: '#ef4444' },
  ];

  const recentJobs = stats.recentJobs || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-6 h-6 text-indigo-500" />
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cloud Queue & Worker Demonstration</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Live monitoring of the decoupled asynchronous job queue. Demonstrates how burst workloads are buffered and processed independently from API request threads.
        </p>
      </div>

      {/* Architecture Explanation */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 text-xs space-y-3">
        <h3 className="font-bold text-indigo-800 text-sm">Academic Architecture: Decoupled Queue Pattern</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-indigo-700">
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
            <span className="font-bold mb-1">1. API Ingestion</span>
            <span>HTTP request accepted instantly (202 Accepted)</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
            <span className="font-bold mb-1">2. Queue Buffer</span>
            <span>Job enqueued to BullMQ / SQS — absorbs burst load</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
            <span className="font-bold mb-1">3. Worker Scaling</span>
            <span>Independent workers consume queue (horizontal scale)</span>
          </div>
          <div className="flex flex-col items-center text-center p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
            <span className="font-bold mb-1">4. DB + Notify</span>
            <span>Results persisted; user notified asynchronously</span>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Queued / Pending', value: stats.waiting ?? '—', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Processing Now', value: stats.active ?? '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Completed', value: stats.completed ?? '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Failed Jobs', value: stats.failed ?? '—', color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((metric) => (
          <div key={metric.label} className={`${metric.bg} rounded-2xl border border-slate-200/60 p-5 shadow-sm`}>
            <div className="text-xs text-slate-500 font-semibold uppercase">{metric.label}</div>
            <div className={`text-3xl font-extrabold mt-1 ${metric.color}`}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Queue Chart */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Real-Time Queue Distribution</h2>
            <button
              onClick={() => refetch()}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-slate-400 text-center">Auto-refreshes every 3 seconds</div>
        </div>

        {/* Burst Test Trigger */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Burst Workload Injection
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Inject multiple background jobs simultaneously to demonstrate queue absorption and independent worker consumption without blocking API threads.
          </p>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Job Count (max 50)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={burstCount}
                onChange={(e) => setBurstCount(parseInt(e.target.value) || 5)}
                className="w-24 px-3 py-2 rounded-xl border border-slate-300 text-sm text-center font-bold"
              />
            </div>

            <button
              onClick={handleBurstTest}
              disabled={burstLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 mt-5"
            >
              <Play className="w-4 h-4" />
              {burstLoading ? 'Enqueueing...' : `Inject ${burstCount} Jobs`}
            </button>
          </div>

          {burstResult && !burstResult.error && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {burstResult.message}
              </div>
              <div className="text-emerald-600">
                {burstResult.jobIds?.length} jobs enqueued. Watch queue metrics update in real-time as workers consume them.
              </div>
            </div>
          )}

          {burstResult?.error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {burstResult.error}
            </div>
          )}

          {/* System Info */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Runtime Status</div>
            <div className="grid grid-cols-2 gap-2">
              <div>Uptime: <span className="font-medium text-slate-800">{system.uptimeSeconds ? `${Math.round(system.uptimeSeconds / 60)}m` : '—'}</span></div>
              <div>Memory: <span className="font-medium text-slate-800">{system.memoryUsageMB ? `${system.memoryUsageMB} MB` : '—'}</span></div>
              <div>Node.js: <span className="font-medium text-slate-800">{system.nodeVersion || '—'}</span></div>
              <div>Queue Driver: <span className="font-medium text-indigo-600">{stats.driver || '—'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      {recentJobs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-base">
            Recent Background Jobs
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider">Job Type</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider">Retries</th>
                  <th className="px-4 py-3 text-left text-slate-500 font-semibold uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentJobs.slice(0, 15).map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-indigo-700">{job.type}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          job.status === 'COMPLETED' ? 'success' :
                          job.status === 'FAILED' ? 'danger' :
                          job.status === 'PROCESSING' ? 'info' : 'warning'
                        }
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{job.retryCount}/{job.maxRetries}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
