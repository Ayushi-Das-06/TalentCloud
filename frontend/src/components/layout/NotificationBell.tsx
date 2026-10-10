import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { User } from '../../types/index.js';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = ['notifications', user.id];
  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => apiFetch<{ data: NotificationItem[]; unreadCount: number }>('/notifications'),
    refetchInterval: 30_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const readOne = useMutation({
    mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'PATCH' }),
    onSuccess: refresh,
  });
  const readAll = useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: refresh,
  });
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={open} className="relative p-2 text-slate-500 hover:text-brand-700 rounded-lg hover:bg-slate-100">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] leading-4 font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl z-[60]">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
            <button type="button" disabled={!unreadCount || readAll.isPending} onClick={() => readAll.mutate()} className="flex items-center gap-1 text-[11px] text-brand-700 hover:underline disabled:opacity-40"><CheckCheck className="w-3.5 h-3.5" /> Mark all read</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading && <p className="p-4 text-xs text-slate-500">Loading notifications…</p>}
            {isError && <p className="p-4 text-xs text-rose-600">Could not load notifications.</p>}
            {!isLoading && !isError && (data?.data.length ?? 0) === 0 && <p className="p-4 text-xs text-slate-500">You’re all caught up.</p>}
            {data?.data.map((item) => (
              <Link key={item.id} to={item.link?.startsWith('/') ? item.link : '/'} onClick={() => { if (!item.isRead) readOne.mutate(item.id); setOpen(false); }} className={`block p-3 border-b border-slate-100 hover:bg-slate-50 ${item.isRead ? '' : 'bg-brand-50/60'}`}>
                <div className="flex items-start gap-2">
                  {!item.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-600 shrink-0" />}
                  <div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{item.title}</p><p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">{item.message}</p><time className="mt-1 block text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
