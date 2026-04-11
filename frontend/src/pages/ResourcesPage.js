// ResourcesPage.js
import React, { useState, useEffect } from 'react';
import { Package, RefreshCw, Plus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_ICON = { medical:'🏥', food:'🍱', rescue_team:'🚑', vehicles:'🚗', equipment:'🔧', shelter_supplies:'⛺' };
const STATUS_COLOR = { available:'text-green-400', deployed:'text-yellow-400', depleted:'text-red-400', maintenance:'text-surface-500 dark:text-gray-400' };

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/resources', { params: typeFilter ? { type: typeFilter } : {} });
      setResources(res.data.data);
    } catch (e) { toast.error('Failed to load resources'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [typeFilter]);

  const grouped = resources.reduce((acc, r) => {
    const t = r.type || 'other';
    if (!acc[t]) acc[t] = [];
    acc[t].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Resource Tracking</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">{resources.filter(r => r.status === 'available').length} available · {resources.filter(r => r.status === 'deployed').length} deployed</p>
        </div>
        <button onClick={fetch} className="btn-secondary"><RefreshCw size={15} /></button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTypeFilter('')} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!typeFilter ? 'bg-primary-600 text-surface-900 dark:text-white' : 'bg-surface-50 dark:bg-surface-700 text-surface-500 dark:text-gray-400'}`}>All</button>
        {Object.keys(TYPE_ICON).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm transition-all capitalize ${typeFilter === t ? 'bg-primary-600 text-surface-900 dark:text-white' : 'bg-surface-50 dark:bg-surface-700 text-surface-500 dark:text-gray-400'}`}>
            {TYPE_ICON[t]} {t.replace('_', ' ')}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={24} className="animate-spin text-primary-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map(r => (
            <div key={r.id} className="card hover:border-surface-500 transition-colors">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{TYPE_ICON[r.type] || '📦'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-surface-900 dark:text-white font-medium text-sm">{r.name}</p>
                  <p className="text-surface-500 dark:text-gray-400 text-xs capitalize mt-0.5">{r.type?.replace('_', ' ')}</p>
                  {r.location && <p className="text-surface-500 dark:text-gray-500 text-xs mt-1">📍 {r.location}</p>}
                </div>
                <span className={`text-xs font-medium capitalize flex-shrink-0 ${STATUS_COLOR[r.status]}`}>{r.status}</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-surface-500 dark:text-gray-400">Quantity:</span>
                <span className="text-surface-900 dark:text-white font-semibold">{r.quantity} {r.unit || 'units'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
