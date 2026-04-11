import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, Navigation, MapPin } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl:       require('leaflet/dist/images/marker-icon.png'),
  shadowUrl:     require('leaflet/dist/images/marker-shadow.png'),
});

const RISK_COLOR = { critical:'#dc2626', high:'#d97706', moderate:'#ca8a04', low:'#16a34a' };
const RISK_FILL  = { critical:'#dc262630', high:'#d9770630', moderate:'#ca8a0430', low:'#16a34a30' };

// How far each role sees (km)
const ROLE_RADIUS = { citizen: 30, volunteer: 80, admin: null }; // null = all country

// Default zoom per role
const ROLE_ZOOM = { citizen: 13, volunteer: 10, admin: 5 };

function FlyTo({ position, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, zoom, { duration: 1.5 });
  }, [position]);
  return null;
}

function LocateBtn({ onLocated }) {
  const map = useMap();
  const go = () => {
    map.locate({ enableHighAccuracy: true });
    map.once('locationfound', e => onLocated([e.latlng.lat, e.latlng.lng]));
    map.once('locationerror', () => toast.error('Location access denied'));
  };
  return (
    <div className="leaflet-bottom leaflet-left" style={{ marginBottom: 24, marginLeft: 10 }}>
      <div className="leaflet-control">
        <button onClick={go} style={{ background:'#1e293b', border:'1px solid #334155', color:'#e2e8f0', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
          <Navigation size={13} /> Re-centre
        </button>
      </div>
    </div>
  );
}

// Haversine distance in km
function distKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function MapPage() {
  const { user }  = useAuth();
  const role      = user?.role || 'citizen';
  const radius    = ROLE_RADIUS[role];   // null = no filter
  const zoom      = ROLE_ZOOM[role];

  const [userPos,      setUserPos]      = useState(null);
  const [locating,     setLocating]     = useState(true);
  const [predictions,  setPredictions]  = useState([]);
  const [incidents,    setIncidents]    = useState([]);
  const [shelters,     setShelters]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [layers,       setLayers]       = useState({ predictions:true, incidents:true, shelters:true });

  const defaultCenter = [20.5937, 78.9629]; // India centre

  // ── Get GPS ───────────────────────────────────────────────
  useEffect(() => {
    // Admin doesn't need GPS — show whole country
    if (role === 'admin') { setLocating(false); return; }

    if (!navigator.geolocation) { setLocating(false); return; }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocating(false);
        if (role !== 'admin') toast('Could not get location — showing full view', { icon: '📍' });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [role]);

  // ── Fetch all data ────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/predictions/risk-map'),
      api.get('/incidents', { params: { limit: 500 } }),
      api.get('/shelters'),
    ]).then(([p, i, s]) => {
      setPredictions(p.data.data || []);
      setIncidents(i.data.data || []);
      setShelters(s.data.data || []);
    }).catch(() => toast.error('Failed to load map data'))
      .finally(() => setLoading(false));
  }, []);

  // ── Filter by role radius ─────────────────────────────────
  const filterByRadius = (items) => {
    if (!radius || !userPos) return items; // admin or no GPS = show all
    return items.filter(item =>
      distKm(userPos[0], userPos[1], parseFloat(item.latitude), parseFloat(item.longitude)) <= radius
    );
  };

  const visiblePredictions = filterByRadius(predictions);
  const visibleIncidents   = filterByRadius(incidents);
  const visibleShelters    = filterByRadius(shelters);

  // ── Icons ─────────────────────────────────────────────────
  const userIcon = L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 5px rgba(59,130,246,0.25)"></div>`,
    iconSize: [16,16], iconAnchor: [8,8],
  });

  const shelterIcon = status => L.divIcon({
    className: '',
    html: `<div style="background:${status==='open'?'#16a34a':'#dc2626'};border:2px solid white;width:14px;height:14px;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize:[14,14], iconAnchor:[7,7],
  });

  const incidentIcon = severity => L.divIcon({
    className: '',
    html: `<div style="background:${RISK_COLOR[severity]||'#3b82f6'};border:2px solid white;width:12px;height:12px;transform:rotate(45deg);box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize:[12,12], iconAnchor:[6,6],
  });

  // ── Role label ────────────────────────────────────────────
  const roleLabel = {
    citizen:   `📍 Showing risks within ${radius} km of your location`,
    volunteer: `🦺 Showing incidents within ${radius} km — your response zone`,
    admin:     '🛡️ Showing all incidents across the entire country',
  }[role];

  const mapCenter = userPos || defaultCenter;
  const mapZoom   = userPos ? zoom : 5;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Disaster Risk Map</h1>
          <p className="text-surface-500 dark:text-gray-400 text-sm mt-0.5">
            {locating ? 'Detecting your location...' : roleLabel}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key:'predictions', label:'Risk zones',  color:'bg-red-500' },
            { key:'incidents',   label:'Incidents',   color:'bg-orange-500' },
            { key:'shelters',    label:'Shelters',    color:'bg-green-500' },
          ].map(({ key, label, color }) => (
            <button key={key}
              onClick={() => setLayers(l => ({ ...l, [key]:!l[key] }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${layers[key] ? 'bg-surface-50 dark:bg-surface-700 border-surface-500 text-surface-900 dark:text-white' : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-500 dark:text-gray-500'}`}>
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Counts bar */}
      <div className="flex gap-4 text-xs text-surface-500 dark:text-gray-400 flex-wrap">
        <span className="text-surface-900 dark:text-white">{visiblePredictions.length} risk zones</span>
        <span>·</span>
        <span className="text-surface-900 dark:text-white">{visibleIncidents.length} incidents</span>
        <span>·</span>
        <span className="text-surface-900 dark:text-white">{visibleShelters.length} shelters</span>
        {radius && <span className="text-surface-500 dark:text-gray-500">within {radius} km</span>}
        <div className="ml-auto flex flex-wrap gap-3">
          {Object.entries(RISK_COLOR).map(([level, color]) => (
            <div key={level} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="capitalize">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      {(loading || locating) ? (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 flex items-center justify-center" style={{ height:500 }}>
          <div className="text-center">
            <RefreshCw size={24} className="animate-spin text-primary-400 mx-auto mb-2" />
            <p className="text-surface-500 dark:text-gray-400 text-sm">{locating ? 'Getting your location...' : 'Loading map...'}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700" style={{ height:500 }}>
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height:'100%', width:'100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

            {userPos && <FlyTo position={userPos} zoom={zoom} />}
            {role !== 'admin' && <LocateBtn onLocated={p => setUserPos(p)} />}

            {/* User location dot (citizen + volunteer only) */}
            {userPos && role !== 'admin' && (
              <Marker position={userPos} icon={userIcon}>
                <Popup>
                  <p className="font-bold text-sm">📍 Your location</p>
                  <p className="text-xs text-surface-500 dark:text-gray-400 mt-0.5">{userPos[0].toFixed(5)}, {userPos[1].toFixed(5)}</p>
                  {radius && <p className="text-xs text-blue-500 mt-1">Showing {radius} km radius</p>}
                </Popup>
              </Marker>
            )}

            {/* Risk zones */}
            {layers.predictions && visiblePredictions.map(p => (
              <CircleMarker key={p.id}
                center={[parseFloat(p.latitude), parseFloat(p.longitude)]}
                radius={role === 'admin' ? 20 : 28}
                pathOptions={{ color: RISK_COLOR[p.risk_level]||'#3b82f6', fillColor: RISK_FILL[p.risk_level]||'#3b82f630', fillOpacity:0.45, weight:2 }}>
                <Popup>
                  <div className="min-w-44 p-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLOR[p.risk_level] }} />
                      <span className="font-bold text-sm capitalize">{p.risk_level} risk</span>
                    </div>
                    <p className="font-medium text-sm">{p.region_name || 'Unknown area'}</p>
                    <p className="text-xs text-surface-500 dark:text-gray-500 capitalize">Type: {p.disaster_type}</p>
                    <p className="text-xs text-surface-500 dark:text-gray-500">Probability: {(parseFloat(p.probability)*100).toFixed(0)}%</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Incidents */}
            {layers.incidents && visibleIncidents.map(inc => (
              <Marker key={inc.id}
                position={[parseFloat(inc.latitude), parseFloat(inc.longitude)]}
                icon={incidentIcon(inc.severity)}>
                <Popup>
                  <div className="min-w-40 p-1">
                    <p className="font-bold text-sm">{inc.title}</p>
                    <p className="text-xs text-surface-500 dark:text-gray-500 capitalize">{inc.type} · {inc.severity} · {inc.status?.replace('_',' ')}</p>
                    {inc.location_name && <p className="text-xs mt-1">📍 {inc.location_name}</p>}
                    {inc.affected_count > 0 && <p className="text-xs text-red-500">👥 {inc.affected_count.toLocaleString()} affected</p>}
                    {/* Volunteer-specific: accept task button */}
                    {role === 'volunteer' && inc.status === 'open' && (
                      <button onClick={() => api.post(`/volunteers/accept-task/${inc.id}`).then(() => toast.success('Task accepted!')).catch(() => toast.error('Failed'))}
                        className="mt-2 w-full text-xs bg-primary-600 text-surface-900 dark:text-white rounded px-2 py-1">
                        Accept this task
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Shelters */}
            {layers.shelters && visibleShelters.map(s => (
              <Marker key={s.id}
                position={[parseFloat(s.latitude), parseFloat(s.longitude)]}
                icon={shelterIcon(s.status)}>
                <Popup>
                  <div className="min-w-40 p-1">
                    <p className="font-bold text-sm">⛺ {s.name}</p>
                    <p className="text-xs text-surface-500 dark:text-gray-500">{s.address}</p>
                    <div className="mt-2 text-xs space-y-0.5">
                      <div className="flex justify-between"><span>Capacity:</span><span className="font-medium">{s.capacity}</span></div>
                      <div className="flex justify-between"><span>Free beds:</span><span className={`font-medium ${s.current_occupancy/s.capacity>0.8?'text-red-500':'text-green-600'}`}>{s.capacity - s.current_occupancy}</span></div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="h-1.5 rounded-full" style={{ width:`${Math.min(100,(s.current_occupancy/s.capacity)*100)}%`, background:s.current_occupancy/s.capacity>0.8?'#dc2626':'#16a34a' }} />
                      </div>
                    </div>
                    {s.contact_phone && <p className="text-xs mt-1.5">📞 {s.contact_phone}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
