import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, Filter, Search, MapPin, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SEVERITY_BADGE = { critical:'badge-critical', high:'badge-high', moderate:'badge-moderate', low:'badge-low' };
const STATUS_BADGE   = { open:'badge-open', resolved:'badge-resolved', in_progress:'bg-yellow-800 text-yellow-100 badge', assigned:'bg-purple-800 text-purple-100 badge' };
const TYPES = ['flood','earthquake','fire','cyclone','landslide','drought','tsunami','other'];
const SEVERITIES = ['low','moderate','high','critical'];

function ReportModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ title:'', description:'', type:'flood', severity:'moderate', latitude:'', longitude:'', location_name:'', affected_count:'' });
  const [submitting, setSubmitting] = useState(false);

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(pos => {
      setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
      toast.success('Location captured');
    }, () => toast.error('Location access denied'));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.latitude || !form.longitude) return toast.error('Title and location are required');
    setSubmitting(true);
    try {
      await api.post('/incidents', form);
      toast.success('Incident reported successfully!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to report incident');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-2xl w-full max-w-lg shadow-2xl animate-bounce-in">
        <div className="p-6 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-surface-900 dark:text-white font-bold text-lg flex items-center gap-2"><AlertTriangle size={20} className="text-danger-400" /> Report Incident</h2>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Title *</label>
            <input className="input-field" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="Brief incident title" />
          </div>
          <div>
            <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Description</label>
            <textarea className="input-field min-h-[80px] resize-none" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Describe what happened..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Type</label>
              <select className="select-field" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Severity</label>
              <select className="select-field" value={form.severity} onChange={e => setForm(f=>({...f,severity:e.target.value}))}>
                {SEVERITIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Latitude *</label>
              <input type="number" step="any" min="-90" max="90" className="input-field" value={form.latitude} onChange={e => setForm(f=>({...f,latitude:e.target.value}))} placeholder="e.g. 13.0827" />
            </div>
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Longitude *</label>
              <input type="number" step="any" min="-180" max="180" className="input-field" value={form.longitude} onChange={e => setForm(f=>({...f,longitude:e.target.value}))} placeholder="e.g. 80.2707" />
            </div>
          </div>
          <button type="button" onClick={useMyLocation} className="btn-secondary text-sm w-full justify-center">
            <MapPin size={14} /> Use My Current Location
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Location Name</label>
              <input className="input-field" value={form.location_name} onChange={e => setForm(f=>({...f,location_name:e.target.value}))} placeholder="City / Area" />
            </div>
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Affected Count</label>
              <input type="number" className="input-field" value={form.affected_count} onChange={e => setForm(f=>({...f,affected_count:e.target.value}))} placeholder="Estimated people" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <><CheckCircle size={14} />Submit Report</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ status:'', type:'', severity:'', search:'' });

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.severity) params.severity = filters.severity;
      const res = await api.get('/incidents', { params });
      const list = res.data.data;
      const searched = filters.search ? list.filter(i => i.title.toLowerCase().includes(filters.search.toLowerCase()) || i.location_name?.toLowerCase().includes(filters.search.toLowerCase())) : list;
      setIncidents(searched);
    } catch(e) { toast.error('Failed to load incidents'); }
    finally { setLoading(false); }
  }, [filters.status, filters.type, filters.severity, filters.search]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/incidents/${id}`, { status });
      toast.success('Status updated');
      fetchIncidents();
    } catch(e) { toast.error('Update failed'); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Incident Management</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">{incidents.length} incidents found</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchIncidents} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Report Incident</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 dark:text-gray-500" />
          <input className="input-field pl-8 text-sm" placeholder="Search incidents..." value={filters.search} onChange={e => setFilters(f=>({...f,search:e.target.value}))} />
        </div>
        <select className="select-field text-sm w-36" value={filters.status} onChange={e => setFilters(f=>({...f,status:e.target.value}))}>
          <option value="">All Status</option>
          <option>open</option><option>assigned</option><option>in_progress</option><option>resolved</option>
        </select>
        <select className="select-field text-sm w-36" value={filters.type} onChange={e => setFilters(f=>({...f,type:e.target.value}))}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="select-field text-sm w-36" value={filters.severity} onChange={e => setFilters(f=>({...f,severity:e.target.value}))}>
          <option value="">All Severity</option>
          {SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Incident</th><th>Type</th><th>Severity</th><th>Status</th>
              <th>Location</th><th>Reported</th><th>Affected</th>
              {(user?.role === 'volunteer' || user?.role === 'admin') && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-surface-500 dark:text-gray-500">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading incidents...
              </td></tr>
            ) : incidents.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-surface-500 dark:text-gray-500">No incidents found</td></tr>
            ) : incidents.map(incident => (
              <tr key={incident.id}>
                <td>
                  <p className="text-surface-900 dark:text-white font-medium text-sm">{incident.title}</p>
                  <p className="text-surface-500 dark:text-gray-500 text-xs mt-0.5 line-clamp-1">{incident.description}</p>
                </td>
                <td><span className="badge bg-surface-200 dark:bg-surface-600 text-surface-900 dark:text-gray-300 capitalize">{incident.type}</span></td>
                <td><span className={SEVERITY_BADGE[incident.severity] || 'badge'}>{incident.severity}</span></td>
                <td><span className={STATUS_BADGE[incident.status] || 'badge capitalize'}>{incident.status?.replace('_',' ')}</span></td>
                <td>
                  <div className="flex items-center gap-1 text-surface-500 dark:text-gray-400 text-sm">
                    <MapPin size={12} />
                    <span className="truncate max-w-28">{incident.location_name || `${Number(incident.latitude).toFixed(2)},${Number(incident.longitude).toFixed(2)}`}</span>
                  </div>
                </td>
                <td className="text-surface-500 dark:text-gray-500 text-xs whitespace-nowrap">{formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}</td>
                <td className="text-surface-600 dark:text-gray-300 text-sm">{incident.affected_count > 0 ? incident.affected_count.toLocaleString() : '—'}</td>
                {(user?.role === 'volunteer' || user?.role === 'admin') && (
                  <td>
                    <select
                      className="text-xs bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-lg px-2 py-1 text-surface-600 dark:text-gray-300"
                      value={incident.status}
                      onChange={e => updateStatus(incident.id, e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <ReportModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetchIncidents(); }} />}
    </div>
  );
}
