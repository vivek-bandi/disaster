// HelpRequestsPage.js
import React, { useState, useEffect } from 'react';
import { Heart, Plus, RefreshCw, MapPin } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const URGENCY_BADGE = { critical: 'badge-critical', high: 'badge-high', medium: 'bg-blue-900/40 text-blue-300 badge', low: 'badge-low' };
const TYPES = ['food', 'medical', 'evacuation', 'shelter', 'water', 'rescue', 'other'];

export default function HelpRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'food', description: '', urgency: 'medium', latitude: '', longitude: '', location_name: '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/help-requests');
      setRequests(res.data.data);
    } catch (e) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/help-requests', { ...form, latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) });
      toast.success('Help request submitted!');
      setShowForm(false);
      fetch();
    } catch (e) { toast.error('Failed to submit request'); }
  };

  const assign = async (id) => {
    try {
      await api.put(`/help-requests/${id}/assign`);
      toast.success('Request assigned to you');
      fetch();
    } catch (e) { toast.error('Failed to assign'); }
  };

  const markFulfilled = async (id) => {
    try {
      await api.put(`/help-requests/${id}/status`, { status: 'fulfilled' });
      toast.success('Marked as fulfilled');
      fetch();
    } catch (e) { toast.error('Failed to update'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Community Help Requests</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">{requests.filter(r => r.status === 'pending').length} pending · {requests.filter(r => r.urgency === 'critical').length} critical</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetch} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus size={15} /> Request Help</button>
        </div>
      </div>

      {showForm && (
        <div className="card border-primary-700">
          <h3 className="text-surface-900 dark:text-white font-semibold mb-4">Submit Help Request</h3>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Type of Help</label>
              <select className="select-field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TYPES.map(t => <option key={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Urgency</label>
              <select className="select-field" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                <option>low</option><option>medium</option><option>high</option><option>critical</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Description</label>
              <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe your situation..." required />
            </div>
            <div><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Latitude</label><input type="number" step="any" min="-90" max="90" className="input-field" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} required /></div>
            <div><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Longitude</label><input type="number" step="any" min="-180" max="180" className="input-field" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} required /></div>
            <div className="col-span-2"><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Location Name</label><input className="input-field" value={form.location_name} onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))} placeholder="Street / Area" /></div>
            <div className="col-span-2 flex gap-3"><button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" className="btn-primary flex-1 justify-center">Submit Request</button></div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 flex justify-center py-12"><RefreshCw size={24} className="animate-spin text-primary-400" /></div>
        ) : requests.map(req => (
          <div key={req.id} className={`card ${req.urgency === 'critical' ? 'alert-critical border-red-700' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-surface-900 dark:text-white font-semibold text-sm capitalize">{req.type} Assistance</p>
                <p className="text-surface-500 dark:text-gray-400 text-xs">{req.requester_name}</p>
              </div>
              <span className={`${URGENCY_BADGE[req.urgency]} capitalize`}>{req.urgency}</span>
            </div>
            <p className="text-surface-600 dark:text-gray-300 text-sm mb-3 line-clamp-2">{req.description}</p>
            {req.location_name && (
              <div className="flex items-center gap-1 text-surface-500 dark:text-gray-400 text-xs mb-3">
                <MapPin size={11} />{req.location_name}
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-surface-500 dark:text-gray-500 mb-3">
              <span>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
              <span className="capitalize">{req.status?.replace('_', ' ')}</span>
            </div>
            {(user?.role === 'volunteer' || user?.role === 'admin') && req.status === 'pending' && (
              <button onClick={() => assign(req.id)} className="w-full btn-primary text-sm justify-center py-1.5">
                <Heart size={13} /> Respond
              </button>
            )}
            {(user?.role === 'volunteer' || user?.role === 'admin') && req.status === 'assigned' && req.assigned_volunteer === user?.id && (
              <button onClick={() => markFulfilled(req.id)} className="w-full btn-secondary text-sm justify-center py-1.5 text-green-400 border-green-700">
                ✓ Mark Fulfilled
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
