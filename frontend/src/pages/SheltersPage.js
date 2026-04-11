import React, { useState, useEffect } from 'react';
import { Tent, Phone, Mail, Users, RefreshCw, Plus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_COLOR = { open: 'text-green-400', full: 'text-red-400', closed: 'text-surface-500 dark:text-gray-400', reserved: 'text-yellow-400' };

export default function SheltersPage() {
  const { user } = useAuth();
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', capacity: '', contact_phone: '', contact_email: '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shelters', { params: filter ? { status: filter } : {} });
      setShelters(res.data.data);
    } catch (e) { toast.error('Failed to load shelters'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filter]);

  const addShelter = async (e) => {
    e.preventDefault();
    try {
      await api.post('/shelters', { ...form, capacity: parseInt(form.capacity) });
      toast.success('Shelter added');
      setShowAdd(false);
      setForm({ name: '', address: '', latitude: '', longitude: '', capacity: '', contact_phone: '', contact_email: '' });
      fetch();
    } catch (e) { toast.error('Failed to add shelter'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Emergency Shelters</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">{shelters.filter(s => s.status === 'open').length} open · {shelters.reduce((a, s) => a + (s.capacity - s.current_occupancy), 0)} beds available</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetch} className="btn-secondary"><RefreshCw size={15} /></button>
          {user?.role === 'admin' && <button onClick={() => setShowAdd(!showAdd)} className="btn-primary"><Plus size={15} /> Add Shelter</button>}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'open', 'full', 'closed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${filter === s ? 'bg-primary-600 text-surface-900 dark:text-white' : 'bg-surface-50 dark:bg-surface-700 text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:text-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="card border-primary-700">
          <h3 className="text-surface-900 dark:text-white font-semibold mb-4">Add New Shelter</h3>
          <form onSubmit={addShelter} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Name</label><input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
            <div className="col-span-2"><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Address</label><input className="input-field" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required /></div>
            <div><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Latitude</label><input type="number" step="any" min="-90" max="90" className="input-field" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} required /></div>
            <div><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Longitude</label><input type="number" step="any" min="-180" max="180" className="input-field" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} required /></div>
            <div><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Capacity</label><input type="number" className="input-field" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} required /></div>
            <div><label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Phone</label><input className="input-field" value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
            <div className="col-span-2 flex gap-3"><button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" className="btn-primary flex-1 justify-center">Add Shelter</button></div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={24} className="animate-spin text-primary-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 md:grid-cols-3 gap-4">
          {shelters.map(s => {
            const occupancyPct = s.capacity > 0 ? (s.current_occupancy / s.capacity) * 100 : 0;
            return (
              <div key={s.id} className="card hover:border-surface-500 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-surface-50 dark:bg-surface-700 rounded-lg"><Tent size={18} className="text-primary-400" /></div>
                    <div>
                      <p className="text-surface-900 dark:text-white font-semibold text-sm">{s.name}</p>
                      <p className={`text-xs font-medium capitalize ${STATUS_COLOR[s.status]}`}>{s.status}</p>
                    </div>
                  </div>
                </div>
                <p className="text-surface-500 dark:text-gray-400 text-xs mb-3 line-clamp-1">{s.address}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-500 dark:text-gray-400 flex items-center gap-1"><Users size={12} /> Occupancy</span>
                    <span className="text-surface-900 dark:text-white font-medium">{s.current_occupancy} / {s.capacity}</span>
                  </div>
                  <div className="w-full bg-surface-600 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, occupancyPct)}%`, background: occupancyPct > 90 ? '#dc2626' : occupancyPct > 70 ? '#d97706' : '#16a34a' }} />
                  </div>
                  <p className="text-xs text-surface-500 dark:text-gray-500">{Math.max(0, s.capacity - s.current_occupancy)} beds available</p>
                </div>
                {s.contact_phone && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-surface-500 dark:text-gray-400">
                    <Phone size={11} /><span>{s.contact_phone}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
