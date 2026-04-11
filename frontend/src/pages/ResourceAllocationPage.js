import React, { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw, CheckCircle, Clock, AlertTriangle, Send } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TYPE_ICON  = { medical:'🏥', food:'🍱', rescue_team:'🚑', vehicles:'🚗', equipment:'🔧', shelter_supplies:'⛺', water:'💧' };
const URG_STYLE  = {
  critical: 'border-l-4 border-l-red-500 bg-red-900/10',
  high:     'border-l-4 border-l-orange-500 bg-orange-900/10',
  medium:   'border-l-4 border-l-yellow-500 bg-yellow-900/10',
  low:      'border-l-4 border-l-green-500 bg-green-900/10',
};

function AllocationLog({ log }) {
  if (!log.length) return <p className="text-surface-500 dark:text-gray-500 text-sm py-4 text-center">No allocations yet today</p>;
  return (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
      {log.map((entry, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5 bg-surface-50 dark:bg-surface-700 rounded-lg">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.success ? 'bg-green-400' : 'bg-red-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-surface-900 dark:text-white text-xs font-medium">
              {entry.qty} × {TYPE_ICON[entry.resource_type] || '📦'} {entry.resource_name}
            </p>
            <p className="text-surface-500 dark:text-gray-400 text-xs">→ {entry.destination}</p>
          </div>
          <span className="text-surface-500 dark:text-gray-500 text-xs flex-shrink-0">{entry.time}</span>
        </div>
      ))}
    </div>
  );
}

export default function ResourceAllocationPage() {
  const [resources,   setResources]   = useState([]);
  const [needsList,   setNeedsList]   = useState([]);
  const [allocLog,    setAllocLog]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [allocating,  setAllocating]  = useState({});
  const [selections,  setSelections]  = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resRes, helpRes, incRes] = await Promise.all([
        api.get('/resources', { params: { status: 'available' } }),
        api.get('/help-requests', { params: { status: 'pending' } }),
        api.get('/incidents', { params: { status: 'open', limit: 20 } }),
      ]);

      setResources(resRes.data.data || []);

      // Combine help requests + incidents into a unified "needs" list
      const helpNeeds = (helpRes.data.data || []).map(h => ({
        id:          `help-${h.id}`,
        raw_id:      h.id,
        kind:        'help_request',
        title:       `${h.type.charAt(0).toUpperCase() + h.type.slice(1)} — ${h.requester_name || 'Citizen'}`,
        location:    h.location_name || `${Number(h.latitude).toFixed(3)}, ${Number(h.longitude).toFixed(3)}`,
        urgency:     h.urgency,
        description: h.description,
        needs:       [h.type],
        created_at:  h.created_at,
      }));

      const incNeeds = (incRes.data.data || [])
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .map(i => ({
          id:          `inc-${i.id}`,
          raw_id:      i.id,
          kind:        'incident',
          title:       i.title,
          location:    i.location_name || `${Number(i.latitude).toFixed(3)}, ${Number(i.longitude).toFixed(3)}`,
          urgency:     i.severity,
          description: i.description,
          needs:       guessNeeds(i.type),
          created_at:  i.created_at,
          affected:    i.affected_count,
        }));

      // Sort: critical first, then high, then by date
      const urgOrder = { critical:0, high:1, medium:2, moderate:2, low:3 };
      const combined = [...helpNeeds, ...incNeeds].sort(
        (a, b) => (urgOrder[a.urgency]||2) - (urgOrder[b.urgency]||2)
      );

      setNeedsList(combined);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function guessNeeds(type) {
    const map = {
      flood:      ['food', 'shelter_supplies', 'rescue_team', 'medical'],
      fire:       ['rescue_team', 'medical', 'equipment'],
      cyclone:    ['food', 'medical', 'shelter_supplies', 'rescue_team'],
      earthquake: ['medical', 'rescue_team', 'food'],
      drought:    ['food', 'medical', 'equipment'],
      landslide:  ['rescue_team', 'medical', 'vehicles'],
      tsunami:    ['food', 'rescue_team', 'medical', 'shelter_supplies'],
    };
    return map[type] || ['food', 'medical'];
  }

  const setSelection = (needId, field, value) => {
    setSelections(prev => ({
      ...prev,
      [needId]: { ...(prev[needId] || {}), [field]: value }
    }));
  };

  const allocate = async (need) => {
    const sel = selections[need.id] || {};
    if (!sel.resource_id) return toast.error('Please select a resource');
    if (!sel.qty || parseInt(sel.qty) < 1) return toast.error('Please enter a valid quantity');

    const resource = resources.find(r => r.id === sel.resource_id);
    if (!resource) return;
    if (parseInt(sel.qty) > resource.quantity) {
      return toast.error(`Only ${resource.quantity} ${resource.unit || 'units'} available`);
    }

    setAllocating(prev => ({ ...prev, [need.id]: true }));
    try {
      // Update resource quantity
      await api.put(`/resources/${sel.resource_id}`, {
        quantity: resource.quantity - parseInt(sel.qty),
        status: resource.quantity - parseInt(sel.qty) === 0 ? 'deployed' : 'available',
        assigned_incident: need.kind === 'incident' ? need.raw_id : undefined,
      });

      // If it's a help request, mark it as assigned
      if (need.kind === 'help_request') {
        await api.put(`/help-requests/${need.raw_id}/status`, { status: 'in_progress' });
      }

      // Log entry
      const now = new Date();
      const timeStr = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()
        + ' ' + (now.getHours() < 12 ? 'AM' : 'PM');

      setAllocLog(prev => [{
        qty:           sel.qty,
        resource_type: resource.type,
        resource_name: resource.name,
        destination:   need.title + ' — ' + need.location,
        time:          timeStr,
        success:       true,
      }, ...prev]);

      toast.success(`${sel.qty} ${resource.name} allocated to ${need.location}`);

      // Remove the need from list
      setNeedsList(prev => prev.filter(n => n.id !== need.id));
      setSelections(prev => { const p = {...prev}; delete p[need.id]; return p; });

      // Refresh resource list
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Allocation failed');
    } finally {
      setAllocating(prev => ({ ...prev, [need.id]: false }));
    }
  };

  // Stats
  const totalAvail   = resources.reduce((s, r) => s + r.quantity, 0);
  const criticalNeeds = needsList.filter(n => n.urgency === 'critical').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Package size={20} className="text-primary-400" /> Resource Allocation
          </h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">
            {needsList.length} pending needs · {resources.length} resource types available
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-1 md:grid-cols-4 gap-3">
        <div className="card text-center"><p className="text-2xl font-bold text-surface-900 dark:text-white">{needsList.length}</p><p className="text-surface-500 dark:text-gray-400 text-xs mt-1">Pending needs</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-red-400">{criticalNeeds}</p><p className="text-surface-500 dark:text-gray-400 text-xs mt-1">Critical</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-green-400">{resources.length}</p><p className="text-surface-500 dark:text-gray-400 text-xs mt-1">Resource types</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-primary-400">{totalAvail.toLocaleString()}</p><p className="text-surface-500 dark:text-gray-400 text-xs mt-1">Total units</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Inventory */}
        <div className="card space-y-3">
          <h3 className="text-surface-900 dark:text-white font-semibold text-sm">Available inventory</h3>
          {loading ? (
            <div className="flex justify-center py-8"><RefreshCw size={18} className="animate-spin text-primary-400" /></div>
          ) : resources.length === 0 ? (
            <p className="text-surface-500 dark:text-gray-500 text-sm text-center py-6">No resources available</p>
          ) : (
            <div className="space-y-2">
              {resources.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-surface-50 dark:bg-surface-700 rounded-xl">
                  <span className="text-xl flex-shrink-0">{TYPE_ICON[r.type] || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-900 dark:text-white text-xs font-medium truncate">{r.name}</p>
                    <p className="text-surface-500 dark:text-gray-500 text-xs capitalize">{r.type?.replace('_',' ')}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-green-400 text-sm font-bold">{r.quantity.toLocaleString()}</p>
                    <p className="text-surface-500 dark:text-gray-500 text-xs">{r.unit || 'units'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Middle: Needs */}
        <div className="card lg:col-span-2 space-y-3">
          <h3 className="text-surface-900 dark:text-white font-semibold text-sm flex items-center gap-2">
            People in need
            {criticalNeeds > 0 && (
              <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">
                {criticalNeeds} critical
              </span>
            )}
          </h3>

          {loading ? (
            <div className="flex justify-center py-10"><RefreshCw size={20} className="animate-spin text-primary-400" /></div>
          ) : needsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle size={32} className="text-green-400 mb-3" />
              <p className="text-surface-900 dark:text-white font-semibold">All needs have been addressed!</p>
              <p className="text-surface-500 dark:text-gray-400 text-sm mt-1">No pending help requests or critical incidents.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {needsList.map(need => {
                const sel      = selections[need.id] || {};
                const isBusy   = allocating[need.id];
                const urgStyle = URG_STYLE[need.urgency] || URG_STYLE.medium;
                return (
                  <div key={need.id} className={`rounded-xl border p-3 ${urgStyle}`}>
                    {/* Need header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-surface-900 dark:text-white text-sm font-medium truncate">{need.title}</p>
                        <p className="text-surface-500 dark:text-gray-400 text-xs mt-0.5">📍 {need.location}</p>
                        {need.affected > 0 && (
                          <p className="text-surface-500 dark:text-gray-400 text-xs">👥 {need.affected.toLocaleString()} affected</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize
                          ${need.urgency === 'critical' ? 'bg-red-900/40 text-red-400' :
                            need.urgency === 'high'     ? 'bg-orange-900/40 text-orange-400' :
                                                          'bg-yellow-900/40 text-yellow-400'}`}>
                          {need.urgency}
                        </span>
                        <span className="text-gray-600 text-xs">
                          {formatDistanceToNow(new Date(need.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Suggested needs */}
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {need.needs.slice(0, 4).map(n => (
                        <span key={n} className="text-xs bg-surface-200 dark:bg-surface-600 text-surface-900 dark:text-gray-300 px-2 py-0.5 rounded capitalize">
                          {TYPE_ICON[n] || '📦'} {n.replace('_',' ')}
                        </span>
                      ))}
                    </div>

                    {/* Allocation controls */}
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <select
                        className="flex-1 min-w-0 text-xs bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg px-2 py-1.5 text-surface-600 dark:text-gray-300 outline-none focus:border-primary-500"
                        value={sel.resource_id || ''}
                        onChange={e => setSelection(need.id, 'resource_id', e.target.value)}
                      >
                        <option value="">Select resource...</option>
                        {resources.map(r => (
                          <option key={r.id} value={r.id}>
                            {TYPE_ICON[r.type]} {r.name} ({r.quantity} {r.unit || 'units'})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        className="w-16 text-xs bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-lg px-2 py-1.5 text-surface-600 dark:text-gray-300 outline-none focus:border-primary-500 text-center"
                        value={sel.qty || ''}
                        onChange={e => setSelection(need.id, 'qty', e.target.value)}
                      />
                      <button
                        onClick={() => allocate(need)}
                        disabled={isBusy || !sel.resource_id}
                        className="btn-primary text-xs py-1.5 px-3 flex-shrink-0 disabled:opacity-40"
                      >
                        {isBusy
                          ? <RefreshCw size={11} className="animate-spin" />
                          : <><Send size={11} /> Allocate</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Allocation log */}
      <div className="card">
        <h3 className="text-surface-900 dark:text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Clock size={14} className="text-surface-500 dark:text-gray-400" /> Allocation log — this session
        </h3>
        <AllocationLog log={allocLog} />
      </div>
    </div>
  );
}
