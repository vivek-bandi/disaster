import React, { useState, useEffect } from 'react';
import { AlertTriangle, Users, Tent, Heart, TrendingUp, RefreshCw, Clock, Shield } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CHART_COLORS = ['#3b82f6','#ef4444','#f59e0b','#10b981','#8b5cf6','#ec4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl p-3 shadow-xl text-sm">
      <p className="text-surface-500 dark:text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    danger:  'text-red-400 bg-red-900/20',
    warning: 'text-orange-400 bg-orange-900/20',
    success: 'text-green-400 bg-green-900/20',
    primary: 'text-blue-400 bg-blue-900/20',
    purple:  'text-purple-400 bg-purple-900/20',
  };
  return (
    <div className="card">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-surface-900 dark:text-white">{value ?? '—'}</p>
      <p className="text-surface-500 dark:text-gray-400 text-sm mt-0.5">{label}</p>
      {sub && <p className="text-xs text-surface-500 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(res => setData(res.data.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={22} className="animate-spin text-primary-400" />
    </div>
  );

  const s = data?.summary || {};
  const c = data?.charts || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Shield size={18} className="text-purple-400" />
            Admin Overview — Whole Country
          </h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm flex items-center gap-1.5 mt-0.5">
            <Clock size={12} /> Last updated just now
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/allocate')} className="btn-primary text-sm">Allocate Resources</button>
          <button onClick={() => navigate('/admin')} className="btn-secondary text-sm">Admin Panel</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={AlertTriangle} label="Active Incidents"      value={s.incidents?.open}      sub={`${s.incidents?.critical||0} critical`}         color="danger" />
        <StatCard icon={Users}         label="Volunteers Available"  value={s.volunteers?.available} sub={`${s.volunteers?.on_mission||0} on mission`}    color="success" />
        <StatCard icon={Tent}          label="Open Shelters"         value={s.shelters?.open}        sub={`${s.shelters?.total_occupied||0}/${s.shelters?.total_capacity||0} beds`} color="primary" />
        <StatCard icon={Heart}     label="Pending Help Requests" value={s.help_requests?.pending} sub={`${s.help_requests?.critical||0} critical`}    color="warning" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp}    label="Active Risk Zones"     value={s.predictions?.total}   sub={`${s.predictions?.critical||0} critical`}        color="danger" />
        <StatCard icon={AlertTriangle} label="In Progress"           value={s.incidents?.in_progress} sub={`${s.incidents?.last_24h||0} last 24h`}       color="warning" />
        <StatCard icon={Users}         label="Total Volunteers"      value={s.volunteers?.total}                                                           color="success" />
        <StatCard icon={Tent}          label="Total Shelters"        value={s.shelters?.total}                                                             color="primary" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h3 className="text-surface-900 dark:text-white font-semibold mb-4 text-sm">Incident trend — last 7 days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={c.incident_trend || []}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill:'#94a3b8', fontSize:11 }} />
              <YAxis tick={{ fill:'#94a3b8', fontSize:11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="incidents" name="All"    stroke="#3b82f6" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="severe"    name="Severe" stroke="#ef4444" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-surface-900 dark:text-white font-semibold mb-4 text-sm">Incidents by type</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={c.disaster_types || []} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={75}
                label={({ type, percent }) => `${type} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {(c.disaster_types || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick actions */}
      <div className="card">
        <h3 className="text-surface-900 dark:text-white font-semibold text-sm mb-3">Quick actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { label:'Manage Incidents',  path:'/incidents',      color:'bg-red-900/30 hover:bg-red-900/50 border-red-800',     icon:'🚨' },
            { label:'Assign Volunteers', path:'/volunteers',     color:'bg-orange-900/30 hover:bg-orange-900/50 border-orange-800', icon:'🦺' },
            { label:'Allocate Resources',path:'/allocate',       color:'bg-purple-900/30 hover:bg-purple-900/50 border-purple-800', icon:'📦' },
            { label:'Send Alert',        path:'/alerts',         color:'bg-blue-900/30 hover:bg-blue-900/50 border-blue-800',   icon:'🔔' },
          ].map(({ label, path, color, icon }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${color}`}>
              <span className="text-2xl">{icon}</span>
              <span className="text-surface-900 dark:text-white text-xs font-medium text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
