import React, { useState, useEffect } from 'react';
import { Shield, MapPin, RefreshCw, AlertTriangle, CheckCircle, Navigation, Phone } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const RISK_STYLES = {
  critical: { bg: 'bg-red-900/30 border-red-700',    text: 'text-red-400',    icon: '🚨', label: 'Critical Risk' },
  high:     { bg: 'bg-orange-900/30 border-orange-700', text: 'text-orange-400', icon: '⚠️', label: 'High Risk' },
  moderate: { bg: 'bg-yellow-900/30 border-yellow-700', text: 'text-yellow-400', icon: '⚡', label: 'Moderate Risk' },
  low:      { bg: 'bg-green-900/30 border-green-700',  text: 'text-green-400',  icon: '✅', label: 'Low Risk / Safe' },
  unknown:  { bg: 'bg-surface-50 dark:bg-surface-700 border-surface-200 dark:border-surface-600', text: 'text-surface-500 dark:text-gray-400',   icon: '📍', label: 'No Data' },
};

// Safety tips per disaster type
const SAFETY_TIPS = {
  flood: {
    icon: '🌊',
    title: 'Flood Safety',
    before: ['Move to higher ground immediately','Never walk through flowing water','Unplug electrical appliances','Store drinking water in clean containers','Keep important documents in waterproof bags'],
    during: ['Do not drive through flooded roads','Stay off bridges over fast-moving water','Evacuate if told to do so','Listen to emergency radio/TV'],
    after:  ['Avoid floodwater — it may be contaminated','Check for structural damage before entering home','Document damage for insurance','Boil water before drinking until authorities clear it'],
  },
  cyclone: {
    icon: '🌀',
    title: 'Cyclone Safety',
    before: ['Board up windows and secure loose objects','Stock 3 days of food, water and medicines','Know your nearest cyclone shelter','Charge all devices and power banks','Fill vehicle with fuel'],
    during: ['Stay indoors away from windows','Do not go outside during the eye of the storm','Shelter in the strongest room of your home','Do not use candles — use torches instead'],
    after:  ['Watch out for downed power lines','Avoid damaged buildings','Report gas leaks immediately','Do not use tap water until cleared'],
  },
  earthquake: {
    icon: '🏔️',
    title: 'Earthquake Safety',
    before: ['Identify safe spots in each room (under sturdy table)','Secure heavy furniture to walls','Know how to shut off gas/water','Keep emergency kit ready','Practice Drop, Cover, Hold On'],
    during: ['Drop to hands and knees','Cover your head and neck','Hold on until shaking stops','Stay away from windows and exterior walls'],
    after:  ['Expect aftershocks','Check for gas leaks before switching on lights','Do not use elevators','Help injured people if safe to do so'],
  },
  fire: {
    icon: '🔥',
    title: 'Fire Safety',
    before: ['Have working smoke detectors','Plan two escape routes from every room','Keep fire extinguisher accessible','Never leave cooking unattended','Clear dry leaves and debris around home'],
    during: ['Get low under smoke','Feel doors before opening — if hot, use another exit','Never use lifts','Once out, stay out. Do not re-enter'],
    after:  ['Do not return until fire department says it is safe','Document losses for insurance','Watch for hot spots that could reignite','Seek medical help for smoke inhalation'],
  },
  drought: {
    icon: '☀️',
    title: 'Drought Safety',
    before: ['Store adequate drinking water','Reduce water usage at home','Keep oral rehydration salts (ORS) available','Check on elderly neighbours'],
    during: ['Drink at least 2–3 litres of water daily','Avoid going out in peak heat hours (12–3 PM)','Wear light, loose, light-coloured clothes','Never leave children or pets in parked vehicles'],
    after:  ['Continue water conservation habits','Get water quality tested before drinking from wells','Watch for signs of heat stroke in family members'],
  },
  landslide: {
    icon: '⛰️',
    title: 'Landslide Safety',
    before: ['Know if your area is in a landslide zone','Watch for warning signs: cracks in ground, tilting trees','Have evacuation plan ready','Listen to weather warnings'],
    during: ['Evacuate immediately if you hear rumbling sounds','Move away from the path of the slide','Run to the nearest high ground if caught outside'],
    after:  ['Stay away from the slide area — more slides can follow','Check for injured persons','Report broken utility lines to authorities'],
  },
};

const EMERGENCY_CONTACTS = [
  { name: 'National Disaster Helpline', number: '1078', icon: '🆘' },
  { name: 'Ambulance',                  number: '108',  icon: '🚑' },
  { name: 'Police',                     number: '100',  icon: '👮' },
  { name: 'Fire & Rescue',              number: '101',  icon: '🚒' },
  { name: 'NDRF Helpline',              number: '011-24363260', icon: '🛡️' },
];

function TipSection({ title, tips, color }) {
  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{title}</p>
      {tips.map((tip, i) => (
        <div key={i} className="flex items-start gap-2 text-sm text-surface-600 dark:text-gray-300">
          <CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
          <span>{tip}</span>
        </div>
      ))}
    </div>
  );
}

export default function SafetyAdvisoryPage() {
  const [location, setLocation]     = useState(null);
  const [locError, setLocError]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [risks, setRisks]           = useState([]);
  const [topRisk, setTopRisk]       = useState(null);
  const [nearbyInc, setNearbyInc]   = useState([]);
  const [regionName, setRegionName] = useState('');
  const [fetched, setFetched]       = useState(false);

  // Reverse geocode using nominatim (free, no key needed)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      const addr = data.address || {};
      return [addr.suburb, addr.city_district, addr.city, addr.county, addr.state]
        .filter(Boolean).slice(0, 2).join(', ');
    } catch (_) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const fetchAdvisory = async (lat, lng) => {
    setLoading(true);
    try {
      // Get nearby predictions within 100 km
      const [predRes, incRes] = await Promise.all([
        api.get('/predictions', { params: { limit: 50 } }),
        api.get('/incidents',   { params: { limit: 100, status: 'open' } }),
      ]);

      const preds = predRes.data.data || [];
      const incs  = incRes.data.data  || [];

      // Filter predictions near the user (simple distance calc)
      const nearby = preds.filter(p => {
        const dLat = (parseFloat(p.latitude)  - lat) * 111;
        const dLng = (parseFloat(p.longitude) - lng) * 111 * Math.cos(lat * Math.PI / 180);
        return Math.sqrt(dLat * dLat + dLng * dLng) < 100; // within 100 km
      });

      // Filter open incidents within 50 km
      const nearIncidents = incs.filter(i => {
        const dLat = (parseFloat(i.latitude)  - lat) * 111;
        const dLng = (parseFloat(i.longitude) - lng) * 111 * Math.cos(lat * Math.PI / 180);
        return Math.sqrt(dLat * dLat + dLng * dLng) < 50;
      }).slice(0, 5);

      // Determine highest risk
      const riskOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
      const sorted = [...nearby].sort(
        (a, b) => (riskOrder[b.risk_level] || 0) - (riskOrder[a.risk_level] || 0)
      );

      setRisks(sorted);
      setTopRisk(sorted[0] || null);
      setNearbyInc(nearIncidents);
      setFetched(true);
    } catch (e) {
      toast.error('Failed to fetch risk data');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    setLocError(null);
    setLoading(true);
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });
        const name = await reverseGeocode(lat, lng);
        setRegionName(name);
        await fetchAdvisory(lat, lng);
      },
      (err) => {
        setLocError('Location access denied. Please allow location access and try again.');
        setLoading(false);
        toast.error('Location access denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-request location on mount
  useEffect(() => { getLocation(); }, []);

  const topStyle   = RISK_STYLES[topRisk?.risk_level || 'unknown'];
  const topTips    = topRisk ? SAFETY_TIPS[topRisk.disaster_type] : null;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Shield size={20} className="text-primary-400" /> Safety Advisory
          </h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm mt-1">
            Personalised risk analysis based on your current location
          </p>
        </div>
        <button onClick={getLocation} disabled={loading} className="btn-primary">
          {loading
            ? <><RefreshCw size={14} className="animate-spin" /> Detecting...</>
            : <><Navigation size={14} /> Refresh My Location</>}
        </button>
      </div>

      {/* Location status */}
      {locError ? (
        <div className="card border-red-700 bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
            <div>
              <p className="text-surface-900 dark:text-white font-semibold text-sm">Location Access Required</p>
              <p className="text-surface-500 dark:text-gray-400 text-sm mt-0.5">{locError}</p>
              <button onClick={getLocation} className="btn-primary mt-3 text-sm">
                <MapPin size={13} /> Try Again
              </button>
            </div>
          </div>
        </div>
      ) : location ? (
        <div className="card border-primary-700 bg-primary-900/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center flex-shrink-0">
              <MapPin size={16} className="text-surface-900 dark:text-white" />
            </div>
            <div>
              <p className="text-surface-900 dark:text-white font-semibold text-sm">
                Your location: {regionName || 'Detecting area...'}
              </p>
              <p className="text-surface-500 dark:text-gray-400 text-xs mt-0.5">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </p>
            </div>
            <div className="ml-auto text-xs text-green-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live
            </div>
          </div>
        </div>
      ) : (
        <div className="card flex items-center gap-3">
          <RefreshCw size={18} className="animate-spin text-primary-400 flex-shrink-0" />
          <p className="text-surface-500 dark:text-gray-400 text-sm">Detecting your location...</p>
        </div>
      )}

      {/* Main risk banner */}
      {fetched && (
        <>
          <div className={`card border ${topStyle.bg}`}>
            <div className="flex items-center gap-4">
              <div className="text-4xl">{topStyle.icon}</div>
              <div className="flex-1">
                <p className={`text-lg font-bold ${topStyle.text}`}>{topStyle.label}</p>
                <p className="text-surface-900 dark:text-white text-sm mt-0.5">
                  {topRisk
                    ? `${topRisk.disaster_type.charAt(0).toUpperCase() + topRisk.disaster_type.slice(1)} risk detected near ${regionName}`
                    : `No active disaster risks detected near ${regionName}`}
                </p>
                {topRisk && (
                  <p className="text-surface-500 dark:text-gray-400 text-xs mt-1">
                    Probability: {(parseFloat(topRisk.probability) * 100).toFixed(0)}% ·
                    Based on latest environmental data
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* All nearby risks */}
          {risks.length > 1 && (
            <div className="card">
              <h3 className="text-surface-900 dark:text-white font-semibold mb-3 text-sm">All risks near you</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-1 md:grid-cols-4 gap-3">
                {risks.slice(0, 4).map((r, i) => {
                  const s = RISK_STYLES[r.risk_level];
                  return (
                    <div key={i} className={`rounded-xl border p-3 text-center ${s.bg}`}>
                      <p className="text-xs text-surface-500 dark:text-gray-400 capitalize mb-1">{r.disaster_type}</p>
                      <p className={`text-lg font-bold ${s.text}`}>
                        {(parseFloat(r.probability) * 100).toFixed(0)}%
                      </p>
                      <p className={`text-xs font-medium capitalize ${s.text}`}>{r.risk_level}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nearby open incidents */}
          {nearbyInc.length > 0 && (
            <div className="card border-orange-700 bg-orange-900/10">
              <h3 className="text-surface-900 dark:text-white font-semibold mb-3 text-sm flex items-center gap-2">
                <AlertTriangle size={15} className="text-orange-400" />
                Active incidents within 50 km of you
              </h3>
              <div className="space-y-2">
                {nearbyInc.map(inc => (
                  <div key={inc.id} className="flex items-center gap-3 p-2.5 bg-surface-50 dark:bg-surface-700 rounded-lg">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      inc.severity === 'critical' ? 'bg-red-500' :
                      inc.severity === 'high'     ? 'bg-orange-500' : 'bg-yellow-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-surface-900 dark:text-white text-xs font-medium truncate">{inc.title}</p>
                      <p className="text-surface-500 dark:text-gray-400 text-xs capitalize">{inc.type} · {inc.location_name || 'Nearby'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium capitalize
                      ${inc.severity === 'critical' ? 'bg-red-900/40 text-red-400' :
                        inc.severity === 'high'     ? 'bg-orange-900/40 text-orange-400' :
                                                      'bg-yellow-900/40 text-yellow-400'}`}>
                      {inc.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety tips for top risk */}
          {topTips && (
            <div className="card">
              <h3 className="text-surface-900 dark:text-white font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">{topTips.icon}</span>
                {topTips.title} — What you should do
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <TipSection title="Before"  tips={topTips.before} color="text-blue-400" />
                <TipSection title="During"  tips={topTips.during} color="text-orange-400" />
                <TipSection title="After"   tips={topTips.after}  color="text-green-400" />
              </div>
            </div>
          )}

          {/* No risk — general tips */}
          {!topRisk && (
            <div className="card border-green-700 bg-green-900/10">
              <h3 className="text-surface-900 dark:text-white font-semibold mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400" />
                Your area looks safe — general preparedness tips
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['Keep an emergency kit with water, food and torch','Save emergency numbers in your phone','Know your nearest shelter location','Have a family emergency communication plan','Follow local government alerts and social media'].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-surface-600 dark:text-gray-300">
                    <CheckCircle size={13} className="text-green-400 flex-shrink-0 mt-0.5" />
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency contacts */}
          <div className="card">
            <h3 className="text-surface-900 dark:text-white font-semibold mb-3 text-sm flex items-center gap-2">
              <Phone size={14} className="text-primary-400" /> Emergency Contacts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 sm:grid-cols-1 md:grid-cols-3 gap-2">
              {EMERGENCY_CONTACTS.map((c, i) => (
                <a key={i} href={`tel:${c.number}`}
                  className="flex items-center gap-2 p-2.5 bg-surface-50 dark:bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors cursor-pointer">
                  <span className="text-lg">{c.icon}</span>
                  <div>
                    <p className="text-surface-900 dark:text-white text-xs font-medium">{c.name}</p>
                    <p className="text-primary-400 text-xs font-bold">{c.number}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
