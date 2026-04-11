import React, { useState, useEffect } from 'react';
import { Shield, Users, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');

  const fetch = async () => {
    setLoading(true);
    try {
      const [uRes, sRes, lRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/system-stats'),
        api.get('/admin/logs')
      ]);
      setUsers(uRes.data.data);
      setStats(sRes.data.data);
      setLogs(lRes.data.data);
    } catch (e) { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const toggleUser = async (id, is_active) => {
    try {
      await api.put(`/admin/users/${id}/status`, { is_active: !is_active });
      toast.success(`User ${is_active ? 'deactivated' : 'activated'}`);
      fetch();
    } catch (e) { toast.error('Failed to update user'); }
  };

  const ROLE_BADGE = { admin: 'bg-red-900/40 text-red-400 border border-red-700', volunteer: 'bg-blue-900/40 text-blue-400 border border-blue-700', citizen: 'bg-surface-200 dark:bg-surface-600 text-surface-900 dark:text-gray-300' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2"><Shield size={20} className="text-danger-400" /> Admin Panel</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">System management and monitoring</p>
        </div>
        <button onClick={fetch} className="btn-secondary"><RefreshCw size={15} /></button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-200 dark:border-surface-700 pb-1">
        {['users', 'stats', 'logs'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm capitalize rounded-t-lg transition-all ${tab === t ? 'text-surface-900 dark:text-white border-b-2 border-primary-400' : 'text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><RefreshCw size={24} className="animate-spin text-primary-400" /></div> :
        tab === 'users' ? (
          <div className="table-container">
            <table className="table">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-surface-900 dark:text-white text-xs font-bold">{u.name?.charAt(0)}</div>
                        <div><p className="text-surface-900 dark:text-white text-sm">{u.name}</p><p className="text-surface-500 dark:text-gray-500 text-xs">{u.email}</p></div>
                      </div>
                    </td>
                    <td><span className={`badge capitalize ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                    <td><span className={`badge ${u.is_active ? 'badge-low' : 'badge-critical'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="text-surface-500 dark:text-gray-500 text-xs">{u.last_login ? formatDistanceToNow(new Date(u.last_login), { addSuffix: true }) : 'Never'}</td>
                    <td>
                      <button onClick={() => toggleUser(u.id, u.is_active)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${u.is_active ? 'text-red-400 hover:bg-red-900/30' : 'text-green-400 hover:bg-green-900/30'}`}>
                        {u.is_active ? <><XCircle size={13} />Deactivate</> : <><CheckCircle size={13} />Activate</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tab === 'stats' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats && Object.entries(stats).map(([key, rows]) => (
              <div key={key} className="card">
                <h3 className="text-surface-900 dark:text-white font-semibold mb-3 capitalize">{key.replace('_', ' ')}</h3>
                <div className="space-y-2">
                  {rows?.map((row, i) => {
                    const [k, v] = Object.entries(row);
                    return (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-surface-500 dark:text-gray-400 capitalize">{Object.values(row)[0]?.toString().replace('_', ' ')}</span>
                        <span className="text-surface-900 dark:text-white font-medium">{Object.values(row)[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card space-y-2">
            <h3 className="text-surface-900 dark:text-white font-semibold mb-2">Recent Event Logs</h3>
            {logs.slice(0, 30).map((log, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-surface-50 dark:bg-surface-700 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${log.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-surface-600 dark:text-gray-300 text-xs">{log.description}</p>
                  <p className="text-surface-500 dark:text-gray-500 text-xs mt-0.5">{log.actor_role} · {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                </div>
                <span className="text-xs bg-surface-200 dark:bg-surface-600 text-surface-900 dark:text-gray-400 px-1.5 py-0.5 rounded flex-shrink-0">{log.event_type}</span>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
