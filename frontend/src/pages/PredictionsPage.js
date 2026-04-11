import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, RefreshCw, Wind, Droplets, Thermometer, AlertTriangle } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RISK_COLORS = { critical: '#dc2626', high: '#d97706', moderate: '#ca8a04', low: '#16a34a' };
const RISK_BG     = { critical: 'bg-red-900/30 border-red-700', high: 'bg-orange-900/30 border-orange-700', moderate: 'bg-yellow-900/30 border-yellow-700', low: 'bg-green-900/30 border-green-700' };

function RiskGauge({ probability, risk_level }) {
  const pct = Math.round(probability * 100);
  const color = RISK_COLORS[risk_level] || '#3b82f6';
  const dash = 251;
  const fill = (pct / 100) * dash;
  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
        <path d="M10 55 A40 40 0 0 1 90 55" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 125.6} 125.6`} />
        <text x="50" y="50" textAnchor="middle" fill={color} fontSize="16" fontWeight="700">{pct}%</text>
      </svg>
      <span className={`text-xs font-medium capitalize mt-1`} style={{ color }}>{risk_level} Risk</span>
    </div>
  );
}

function PredictModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    region_name: '', latitude: '', longitude: '',
    rainfall_mm: '', wind_speed_kmh: '', temperature_c: '',
    humidity_percent: '', soil_moisture: '', river_level_m: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fields = [
    { key: 'rainfall_mm', label: 'Rainfall (mm)', icon: Droplets, placeholder: '0-500' },
    { key: 'wind_speed_kmh', label: 'Wind Speed (km/h)', icon: Wind, placeholder: '0-250' },
    { key: 'temperature_c', label: 'Temperature (°C)', icon: Thermometer, placeholder: '-10-50' },
    { key: 'humidity_percent', label: 'Humidity (%)', icon: Droplets, placeholder: '0-100' },
    { key: 'soil_moisture', label: 'Soil Moisture (%)', icon: Droplets, placeholder: '0-100' },
    { key: 'river_level_m', label: 'River Level (m)', icon: TrendingUp, placeholder: '0-20' },
  ];

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const envData = {};
      fields.forEach(f => { envData[f.key] = parseFloat(form[f.key]) || 0; });
      const res = await api.post('/predictions', {
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        region_name: form.region_name,
        environmental_data: envData
      });
      setResult(res.data.data);
      toast.success('Risk analysis complete!');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Analysis failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-600 rounded-2xl w-full max-w-2xl shadow-2xl animate-bounce-in my-4">
        <div className="p-6 border-b border-surface-200 dark:border-surface-700">
          <h2 className="text-surface-900 dark:text-white font-bold text-lg flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-400" /> Disaster Risk Analysis
          </h2>
        </div>
        {!result ? (
          <form onSubmit={submit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Region Name</label>
                <input className="input-field" value={form.region_name} onChange={e => setForm(f => ({ ...f, region_name: e.target.value }))} placeholder="e.g. Chennai, Tamil Nadu" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Latitude</label>
                  <input type="number" step="any" min="-90" max="90" className="input-field" value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="13.08" />
                </div>
                <div>
                  <label className="text-surface-500 dark:text-gray-400 text-sm mb-1 block">Longitude</label>
                  <input type="number" step="any" min="-180" max="180" className="input-field" value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="80.27" />
                </div>
              </div>
            </div>
            <p className="text-surface-500 dark:text-gray-400 text-sm font-medium">Environmental Data</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map(({ key, label, icon: Icon, placeholder }) => (
                <div key={key}>
                  <label className="text-surface-500 dark:text-gray-400 text-xs mb-1 flex items-center gap-1"><Icon size={12} />{label}</label>
                  <input type="number" step="0.1" className="input-field text-sm" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <><TrendingUp size={14} />Analyze Risk</>}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-5">
            <h3 className="text-surface-900 dark:text-white font-semibold">Risk Analysis Results: {form.region_name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-1 md:grid-cols-4 gap-3">
              {result.risk_analysis?.filter(r => r.score > 0).map(r => (
                <div key={r.type} className={`border rounded-xl p-3 text-center ${RISK_BG[r.risk_level]}`}>
                  <p className="text-xs text-surface-500 dark:text-gray-400 capitalize mb-2">{r.type}</p>
                  <RiskGauge probability={r.probability} risk_level={r.risk_level} />
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={result.risk_analysis?.map(r => ({ name: r.type, score: r.score, fill: RISK_COLORS[r.risk_level] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {result.risk_analysis?.map((r, i) => <Cell key={i} fill={RISK_COLORS[r.risk_level]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3">
              <button onClick={() => setResult(null)} className="btn-secondary flex-1 justify-center">New Analysis</button>
              <button onClick={onClose} className="btn-primary flex-1 justify-center">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/predictions', { params: filter ? { risk_level: filter } : {} });
      setPredictions(res.data.data);
    } catch (e) { toast.error('Failed to load predictions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filter]);

  const radarData = ['flood', 'cyclone', 'fire', 'drought', 'earthquake'].map(type => {
    const matching = predictions.filter(p => p.disaster_type === type);
    const avg = matching.length ? matching.reduce((s, p) => s + parseFloat(p.probability), 0) / matching.length * 100 : 0;
    return { subject: type, value: Math.round(avg), fullMark: 100 };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Disaster Predictions</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm">{predictions.length} active risk zones</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetch} className="btn-secondary"><RefreshCw size={15} /></button>
          {(user?.role === 'admin' || user?.role === 'volunteer') && (
            <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={15} /> Analyze Region</button>
          )}
        </div>
      </div>

      {/* Risk filter pills */}
      <div className="flex gap-2 flex-wrap">
        {['', 'critical', 'high', 'moderate', 'low'].map(level => (
          <button key={level} onClick={() => setFilter(level)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === level ? 'bg-primary-600 text-surface-900 dark:text-white' : 'bg-surface-50 dark:bg-surface-700 text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:text-white'}`}>
            {level ? <><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: RISK_COLORS[level] }} />{level}</> : 'All Levels'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Radar chart */}
        <div className="card">
          <h3 className="text-surface-900 dark:text-white font-semibold mb-4">Risk Radar by Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Radar name="Risk Level" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Prediction list */}
        <div className="card lg:col-span-2 space-y-3">
          <h3 className="text-surface-900 dark:text-white font-semibold">Active Risk Zones</h3>
          {loading ? (
            <div className="flex items-center justify-center py-10"><RefreshCw size={20} className="animate-spin text-primary-400" /></div>
          ) : predictions.length === 0 ? (
            <p className="text-surface-500 dark:text-gray-500 text-sm py-8 text-center">No active predictions</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {predictions.map(p => (
                <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border ${RISK_BG[p.risk_level] || 'bg-surface-50 dark:bg-surface-700 border-surface-200 dark:border-surface-600'}`}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[p.risk_level] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-surface-900 dark:text-white text-sm font-medium truncate">{p.region_name || `${Number(p.latitude).toFixed(2)}, ${Number(p.longitude).toFixed(2)}`}</p>
                    <p className="text-surface-500 dark:text-gray-400 text-xs capitalize">{p.disaster_type} · {(parseFloat(p.probability)*100).toFixed(0)}% probability</p>
                  </div>
                  <span className="text-xs font-medium capitalize flex-shrink-0" style={{ color: RISK_COLORS[p.risk_level] }}>{p.risk_level}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && <PredictModal onClose={() => setShowModal(false)} onSuccess={() => { setShowModal(false); fetch(); }} />}
    </div>
  );
}
