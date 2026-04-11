import React, { useState, useEffect } from 'react';
import { Heart, MapPin, Phone, AlertTriangle, CheckCircle,
  RefreshCw, Tent, Navigation, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const HELP_TYPES = ['food', 'medical', 'evacuation', 'shelter', 'water', 'rescue', 'other'];

export default function CitizenDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [shelters,    setShelters]    = useState([]);
  const [myRequests,  setMyRequests]  = useState([]);
  const [nearbyRisk,  setNearbyRisk]  = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [locating,    setLocating]    = useState(false);

  const [form, setForm] = useState({
    type: 'food', description: '', urgency: 'high',
    latitude: '', longitude: '', location_name: ''
  });

  // Auto-get location on mount
  useEffect(() => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setForm(f => ({
          ...f,
          latitude:  pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
        // Reverse geocode
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          .then(r => r.json())
          .then(d => {
            const addr = d.address || {};
            const name = [addr.suburb, addr.city_district, addr.city].filter(Boolean).join(', ');
            if (name) setForm(f => ({ ...f, location_name: name }));
          }).catch(() => {});
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // Fetch nearby shelters + my past requests
    Promise.all([
      api.get('/shelters', { params: { status: 'open' } }),
      api.get('/help-requests'),
    ]).then(([s, h]) => {
      setShelters(s.data.data?.slice(0, 3) || []);
      setMyRequests(h.data.data?.filter(r => r.requester_id === user?.id)?.slice(0, 3) || []);
    }).catch(() => {});
  }, []);

  const submitHelp = async (e) => {
    e.preventDefault();
    if (!form.latitude) return toast.error('Could not detect your location. Please enter it manually.');
    setSubmitting(true);
    try {
      await api.post('/help-requests', {
        ...form,
        latitude:  parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      });
      setSubmitted(true);
      toast.success('Help request sent! A volunteer will respond shortly.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm(f => ({ ...f, type:'food', description:'', urgency:'high' }));
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Hello, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm mt-0.5">Stay safe — help is available 24/7</p>
        </div>
        <button onClick={() => navigate('/safety')} className="btn-secondary text-sm">
          <Shield size={14} /> Safety Tips
        </button>
      </div>

      {/* ─── GET HELP — shown first and prominently ─── */}
      <div className="card border-primary-600 bg-primary-900/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
            <Heart size={17} className="text-surface-900 dark:text-white" />
          </div>
          <div>
            <h2 className="text-surface-900 dark:text-white font-bold text-base">Request Help</h2>
            <p className="text-surface-500 dark:text-gray-400 text-xs">Submit your request and a volunteer will be assigned to you</p>
          </div>
        </div>

        {submitted ? (
          /* Success state */
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <p className="text-surface-900 dark:text-white font-semibold text-lg">Request Submitted!</p>
            <p className="text-surface-500 dark:text-gray-400 text-sm mt-1 mb-4">A volunteer near you has been notified and will respond shortly.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={resetForm} className="btn-secondary text-sm">Submit Another</button>
              <button onClick={() => navigate('/help-requests')} className="btn-primary text-sm">Track My Requests</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitHelp} className="space-y-3">
            {/* Type + Urgency */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">I need help with *</label>
                <select className="select-field text-sm capitalize"
                  value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {HELP_TYPES.map(t => <option key={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">How urgent? *</label>
                <select className="select-field text-sm"
                  value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                  <option value="critical">🚨 Critical — right now</option>
                  <option value="high">⚠️ High — within hours</option>
                  <option value="medium">Medium — today</option>
                  <option value="low">Low — not urgent</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-xs mb-1 block">Describe your situation *</label>
              <textarea
                className="input-field resize-none text-sm"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Example: Family of 4 stranded on 2nd floor, water rising. Need evacuation urgently."
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-surface-500 dark:text-gray-400 text-xs mb-1 flex items-center gap-1.5">
                <MapPin size={11} /> Your location
                {locating && <span className="text-primary-400 flex items-center gap-1"><RefreshCw size={9} className="animate-spin" /> detecting...</span>}
                {form.latitude && !locating && <span className="text-green-400">✓ detected</span>}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input type="number" step="any" min="-90" max="90" className="input-field text-sm col-span-1" value={form.latitude}
                  onChange={e => setForm(f => ({...f, latitude: e.target.value}))}
                  placeholder="Latitude" />
                <input type="number" step="any" min="-180" max="180" className="input-field text-sm col-span-1" value={form.longitude}
                  onChange={e => setForm(f => ({...f, longitude: e.target.value}))}
                  placeholder="Longitude" />
                <input className="input-field text-sm col-span-1" value={form.location_name}
                  onChange={e => setForm(f => ({...f, location_name: e.target.value}))}
                  placeholder="Area name" />
              </div>
            </div>

            {/* Emergency contacts row */}
            <div className="flex items-center gap-3 p-2.5 bg-surface-50 dark:bg-surface-700 rounded-lg text-xs text-surface-500 dark:text-gray-400">
              <Phone size={12} className="flex-shrink-0 text-red-400" />
              <span>Emergency? Call directly:</span>
              <a href="tel:108" className="text-primary-400 font-bold hover:underline">108 Ambulance</a>
              <span>·</span>
              <a href="tel:100" className="text-primary-400 font-bold hover:underline">100 Police</a>
              <span>·</span>
              <a href="tel:1078" className="text-primary-400 font-bold hover:underline">1078 Disaster</a>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center py-2.5 text-sm">
              {submitting
                ? <><RefreshCw size={14} className="animate-spin" /> Submitting...</>
                : <><Heart size={14} /> Send Help Request</>}
            </button>
          </form>
        )}
      </div>

      {/* ─── Nearby open shelters ─── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-surface-900 dark:text-white font-semibold text-sm flex items-center gap-2">
            <Tent size={15} className="text-primary-400" /> Nearest Open Shelters
          </h3>
          <button onClick={() => navigate('/shelters')} className="text-primary-400 text-xs hover:text-primary-300">View all →</button>
        </div>
        {shelters.length === 0 ? (
          <p className="text-surface-500 dark:text-gray-500 text-sm py-4 text-center">Loading shelters...</p>
        ) : shelters.map(s => {
          const pct = Math.min(100, (s.current_occupancy / s.capacity) * 100);
          return (
            <div key={s.id} className="flex items-center gap-3 p-2.5 bg-surface-50 dark:bg-surface-700 rounded-lg mb-2">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pct > 90 ? 'bg-red-500' : 'bg-green-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-surface-900 dark:text-white text-xs font-medium truncate">{s.name}</p>
                <div className="w-full bg-surface-600 rounded-full h-1.5 mt-1">
                  <div className="h-1.5 rounded-full" style={{ width:`${pct}%`, background: pct>80?'#dc2626':'#16a34a' }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-surface-900 dark:text-white text-xs font-bold">{s.capacity - s.current_occupancy}</p>
                <p className="text-surface-500 dark:text-gray-500 text-xs">free beds</p>
              </div>
              {s.contact_phone && (
                <a href={`tel:${s.contact_phone}`} className="p-1.5 rounded-lg bg-surface-600 hover:bg-surface-500 transition-colors">
                  <Phone size={12} className="text-primary-400" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── My past requests ─── */}
      {myRequests.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-surface-900 dark:text-white font-semibold text-sm">My Previous Requests</h3>
            <button onClick={() => navigate('/help-requests')} className="text-primary-400 text-xs hover:text-primary-300">View all →</button>
          </div>
          <div className="space-y-2">
            {myRequests.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-2.5 bg-surface-50 dark:bg-surface-700 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-surface-900 dark:text-white text-xs font-medium capitalize">{r.type} assistance</p>
                  <p className="text-surface-500 dark:text-gray-500 text-xs truncate">{r.description}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded capitalize font-medium flex-shrink-0
                  ${r.status==='fulfilled' ? 'bg-green-900/40 text-green-400' :
                    r.status==='pending'   ? 'bg-yellow-900/40 text-yellow-400' :
                                            'bg-blue-900/40 text-blue-400'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
