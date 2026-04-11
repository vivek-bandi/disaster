// AlertsPage.js
import React, { useState, useEffect } from 'react';
import { Bell, RefreshCw, CheckCheck } from 'lucide-react';
import api from '../services/api';
import { useAlerts } from '../context/AlertContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const SEV_STYLE = {
  critical: 'border-l-4 border-l-red-500 bg-red-900/20',
  warning: 'border-l-4 border-l-yellow-500 bg-yellow-900/20',
  info: 'border-l-4 border-l-blue-500 bg-blue-900/20'
};
const SEV_ICON = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };

export default function AlertsPage() {
  const { alerts, markAllRead } = useAlerts();
  const [dbAlerts, setDbAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.get('/alerts', { params: { limit: 50, ...(filter ? { severity: filter } : {}) } })
      .then(res => setDbAlerts(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const all = [...alerts, ...dbAlerts].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
  const unique = [...new Map(all.map(a => [a._id || a.id || a.title, a])).values()];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Alerts & Notifications</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">{unique.filter(a => !a.is_read).length} unread</p>
        </div>
        <button onClick={markAllRead} className="btn-secondary text-sm"><CheckCheck size={14} /> Mark all read</button>
      </div>
      <div className="flex gap-2">
        {['', 'critical', 'warning', 'info'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${filter === s ? 'bg-primary-600 text-surface-900 dark:text-white' : 'bg-surface-50 dark:bg-surface-700 text-surface-500 dark:text-gray-400'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {loading ? <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-primary-400" /></div> :
          unique.length === 0 ? <div className="card text-center py-12 text-surface-500 dark:text-gray-500">No alerts to display</div> :
          unique.map((alert, i) => (
            <div key={i} className={`card ${SEV_STYLE[alert.severity] || SEV_STYLE.info} ${!alert.is_read ? 'ring-1 ring-inset ring-white/5' : 'opacity-70'}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{SEV_ICON[alert.severity] || SEV_ICON.info}</span>
                <div className="flex-1">
                  <p className="text-surface-900 dark:text-white font-semibold text-sm">{alert.title}</p>
                  <p className="text-surface-600 dark:text-gray-300 text-sm mt-0.5">{alert.message}</p>
                  <p className="text-surface-500 dark:text-gray-500 text-xs mt-1">
                    {formatDistanceToNow(new Date(alert.createdAt || alert.created_at || Date.now()), { addSuffix: true })}
                  </p>
                </div>
                {!alert.is_read && <div className="w-2 h-2 rounded-full bg-primary-400 flex-shrink-0 mt-1.5" />}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
