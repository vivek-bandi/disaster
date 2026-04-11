// VolunteersPage.js
import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const AVAIL_BADGE = {
  available: 'bg-green-900/40 text-green-400 border border-green-700',
  on_mission: 'bg-yellow-900/40 text-yellow-400 border border-yellow-700',
  busy: 'bg-orange-900/40 text-orange-400 border border-orange-700',
  unavailable: 'bg-surface-200 dark:bg-surface-600 text-surface-900 dark:text-gray-400 border border-surface-500'
};

export default function VolunteersPage() {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState([]);
  const [openTasks, setOpenTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const [vRes, iRes] = await Promise.all([
        api.get('/volunteers'),
        api.get('/incidents', { params: { status: 'open', limit: 20 } })
      ]);
      setVolunteers(vRes.data.data);
      setOpenTasks(iRes.data.data);
      if (user.role === 'volunteer') {
        const pRes = await api.get('/volunteers/profile');
        setMyProfile(pRes.data.data);
      }
    } catch (e) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const updateStatus = async (availability) => {
    try {
      await api.put('/volunteers/status', { availability });
      toast.success('Status updated');
      fetch();
    } catch (e) { toast.error('Failed to update status'); }
  };

  const acceptTask = async (incidentId) => {
    try {
      await api.post(`/volunteers/accept-task/${incidentId}`);
      toast.success('Task accepted! You are now assigned.');
      fetch();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to accept task'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Volunteer Management</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">{volunteers.filter(v => v.availability === 'available').length} available · {volunteers.filter(v => v.availability === 'on_mission').length} on mission</p>
        </div>
        <button onClick={fetch} className="btn-secondary"><RefreshCw size={15} /></button>
      </div>

      {user.role === 'volunteer' && myProfile && (
        <div className="card border-primary-700 bg-primary-900/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-surface-900 dark:text-white font-semibold">My Status</h3>
            <span className={`badge ${AVAIL_BADGE[myProfile.availability]} px-3 py-1 capitalize`}>{myProfile.availability?.replace('_', ' ')}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['available', 'busy', 'unavailable'].map(s => (
              <button key={s} onClick={() => updateStatus(s)}
                className={`btn-secondary text-sm capitalize ${myProfile.availability === s ? 'border-primary-500 text-primary-400' : ''}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-6 text-sm">
            <div><span className="text-surface-500 dark:text-gray-400">Missions Completed:</span> <span className="text-surface-900 dark:text-white font-semibold ml-1">{myProfile.missions_completed}</span></div>
            <div><span className="text-surface-500 dark:text-gray-400">Rating:</span> <span className="text-surface-900 dark:text-white font-semibold ml-1">⭐ {myProfile.rating}</span></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-1 md:grid-cols-2 gap-6">
        {/* Volunteer list */}
        <div className="card space-y-3">
          <h3 className="text-surface-900 dark:text-white font-semibold">All Volunteers</h3>
          {loading ? <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-primary-400" /></div> :
            volunteers.length === 0 ? <p className="text-surface-500 dark:text-gray-500 text-sm py-6 text-center">No volunteers registered</p> :
            volunteers.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-primary-700 flex items-center justify-center text-surface-900 dark:text-white font-bold text-sm flex-shrink-0">
                  {v.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-surface-900 dark:text-white text-sm font-medium truncate">{v.name}</p>
                  <p className="text-surface-500 dark:text-gray-400 text-xs">{v.missions_completed} missions · ⭐ {v.rating}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg capitalize ${AVAIL_BADGE[v.availability]}`}>{v.availability?.replace('_', ' ')}</span>
              </div>
            ))
          }
        </div>

        {/* Open tasks */}
        {user.role === 'volunteer' && (
          <div className="card space-y-3">
            <h3 className="text-surface-900 dark:text-white font-semibold">Open Tasks ({openTasks.length})</h3>
            {openTasks.length === 0 ? <p className="text-surface-500 dark:text-gray-500 text-sm py-6 text-center">No open incidents</p> :
              openTasks.map(task => (
                <div key={task.id} className="p-3 bg-surface-50 dark:bg-surface-700 rounded-xl space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-surface-900 dark:text-white text-sm font-medium truncate">{task.title}</p>
                      <p className="text-surface-500 dark:text-gray-400 text-xs capitalize">{task.type} · {task.severity} · {task.location_name || 'Location unknown'}</p>
                    </div>
                    <span className={`badge flex-shrink-0 ${task.severity === 'critical' ? 'badge-critical' : task.severity === 'high' ? 'badge-high' : 'badge-low'}`}>
                      {task.severity}
                    </span>
                  </div>
                  <button onClick={() => acceptTask(task.id)}
                    className="w-full btn-primary text-sm justify-center py-1.5">
                    <CheckCircle size={13} /> Accept Task
                  </button>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}
