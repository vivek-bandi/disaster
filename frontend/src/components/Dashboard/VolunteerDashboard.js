import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, RefreshCw, MapPin, Clock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const SEV_STYLE = {
  critical: 'border-l-4 border-l-red-500 bg-red-900/10',
  high:     'border-l-4 border-l-orange-500 bg-orange-900/10',
  moderate: 'border-l-4 border-l-yellow-500 bg-yellow-900/10',
  low:      'border-l-4 border-l-green-500 bg-green-900/10',
};

// Haversine distance
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function VolunteerDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [myPos,    setMyPos]    = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [tasks,    setTasks]    = useState([]);
  const [helpReqs, setHelpReqs] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // Get volunteer's GPS position
    navigator.geolocation?.getCurrentPosition(
      pos => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy:true, timeout:8000 }
    );

    Promise.all([
      api.get('/volunteers/profile'),
      api.get('/incidents', { params: { status:'open', limit:50 } }),
      api.get('/help-requests', { params: { status:'pending' } }),
    ]).then(([p, i, h]) => {
      setProfile(p.data.data);
      setTasks(i.data.data || []);
      setHelpReqs(h.data.data || []);
    }).catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  // Sort tasks: nearest first (if we have GPS), else by severity
  const sortedTasks = [...tasks].map(t => ({
    ...t,
    dist: myPos ? distKm(myPos[0], myPos[1], parseFloat(t.latitude), parseFloat(t.longitude)) : null,
  })).sort((a, b) => {
    if (a.dist !== null && b.dist !== null) return a.dist - b.dist;
    const sev = { critical:0, high:1, moderate:2, low:3 };
    return (sev[a.severity]||2) - (sev[b.severity]||2);
  }).slice(0, 8);

  const acceptTask = async (id) => {
    try {
      await api.post(`/volunteers/accept-task/${id}`);
      toast.success('Task accepted! Head to the location.');
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const respondHelp = async (id) => {
    try {
      await api.put(`/help-requests/${id}/assign`);
      toast.success('You are now assigned to this request');
      setHelpReqs(prev => prev.filter(r => r.id !== id));
    } catch (e) { toast.error('Failed'); }
  };

  const updateStatus = async (status) => {
    try {
      await api.put('/volunteers/status', { status });
      setProfile(p => ({ ...p, availability: status }));
      toast.success(`Status updated to ${status}`);
    } catch (e) { toast.error('Failed'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={22} className="animate-spin text-primary-400" />
    </div>
  );

  const availColor = { available:'text-green-400', on_mission:'text-yellow-400', busy:'text-orange-400', unavailable:'text-surface-500 dark:text-gray-400' };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Hello, {user?.name?.split(' ')[0]} 🦺</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">
            {myPos ? `Your position detected · ` : ''}
            {sortedTasks.length} open tasks near you
          </p>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium capitalize ${availColor[profile.availability]}`}>
              ● {profile.availability?.replace('_',' ')}
            </span>
            <select
              className="text-xs bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg px-2 py-1.5 text-surface-600 dark:text-gray-300 outline-none"
              value={profile.availability}
              onChange={e => updateStatus(e.target.value)}
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
        )}
      </div>

      {/* Stats */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-surface-900 dark:text-white">{profile.missions_completed}</p>
            <p className="text-surface-500 dark:text-gray-400 text-xs mt-1">Missions done</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-yellow-400">{sortedTasks.length}</p>
            <p className="text-surface-500 dark:text-gray-400 text-xs mt-1">Open tasks nearby</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-green-400">⭐ {profile.rating}</p>
            <p className="text-surface-500 dark:text-gray-400 text-xs mt-1">Your rating</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-1 md:grid-cols-2 gap-5">

        {/* Open incidents — sorted nearest first */}
        <div className="card space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-surface-900 dark:text-white font-semibold text-sm flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-400" />
              Open Tasks {myPos && <span className="text-surface-500 dark:text-gray-500 font-normal text-xs">— nearest first</span>}
            </h3>
            <button onClick={() => navigate('/incidents')} className="text-primary-400 text-xs">View all →</button>
          </div>

          {sortedTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
              <p className="text-surface-500 dark:text-gray-400 text-sm">No open tasks right now</p>
            </div>
          ) : sortedTasks.map(task => (
            <div key={task.id} className={`rounded-xl p-3 ${SEV_STYLE[task.severity] || ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-surface-900 dark:text-white text-sm font-medium truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-surface-500 dark:text-gray-400 text-xs capitalize">{task.type}</span>
                    {task.location_name && (
                      <span className="text-surface-500 dark:text-gray-500 text-xs flex items-center gap-0.5">
                        <MapPin size={10} />{task.location_name}
                      </span>
                    )}
                    {task.dist !== null && (
                      <span className="text-primary-400 text-xs font-medium">
                        {task.dist < 1 ? `${(task.dist*1000).toFixed(0)}m` : `${task.dist.toFixed(1)}km`} away
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize flex-shrink-0
                  ${task.severity==='critical'?'bg-red-900/40 text-red-400':task.severity==='high'?'bg-orange-900/40 text-orange-400':'bg-yellow-900/40 text-yellow-400'}`}>
                  {task.severity}
                </span>
              </div>
              {task.affected_count > 0 && (
                <p className="text-surface-500 dark:text-gray-400 text-xs mb-2">👥 {task.affected_count.toLocaleString()} people affected</p>
              )}
              <button onClick={() => acceptTask(task.id)} className="w-full btn-primary text-xs py-1.5 justify-center">
                <CheckCircle size={12} /> Accept Task
              </button>
            </div>
          ))}
        </div>

        {/* Pending help requests */}
        <div className="card space-y-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-surface-900 dark:text-white font-semibold text-sm">Pending Help Requests</h3>
            <button onClick={() => navigate('/help-requests')} className="text-primary-400 text-xs">View all →</button>
          </div>

          {helpReqs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
              <p className="text-surface-500 dark:text-gray-400 text-sm">All help requests are assigned</p>
            </div>
          ) : helpReqs.slice(0, 6).map(req => (
            <div key={req.id} className={`rounded-xl p-3 ${req.urgency==='critical'?'border border-red-700 bg-red-900/10':'bg-surface-50 dark:bg-surface-700'}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p className="text-surface-900 dark:text-white text-xs font-medium capitalize">{req.type} assistance</p>
                  <p className="text-surface-500 dark:text-gray-500 text-xs">{req.requester_name} · {req.location_name || 'Location unknown'}</p>
                </div>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize flex-shrink-0
                  ${req.urgency==='critical'?'bg-red-900/40 text-red-400':req.urgency==='high'?'bg-orange-900/40 text-orange-400':'bg-yellow-900/40 text-yellow-400'}`}>
                  {req.urgency}
                </span>
              </div>
              <p className="text-surface-500 dark:text-gray-400 text-xs mb-2 line-clamp-1">{req.description}</p>
              <button onClick={() => respondHelp(req.id)} className="w-full btn-primary text-xs py-1.5 justify-center">
                Respond to Request
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
