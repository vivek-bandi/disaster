import React, { useState } from 'react';
import { 
  User, Bell, Shield, MapPin, Palette, CheckCircle, 
  Smartphone, Mail, Lock, LogOut, Moon, Sun, Monitor
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [activeTab, setActiveTab] = useState('profile');

  // Form states mapping
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    location: '12.9716° N, 77.5946° E', // Default loc
    radius: 25,
    detectLocation: true,
    alerts: true,
    emailNotif: false,
    smsNotif: true
  });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Settings updated successfully!');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'location', label: 'Location Tracking', icon: MapPin },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-6 pb-6 border-b border-surface-200 dark:border-white/5">
              <div className="w-24 h-24 rounded-2xl bg-primary-500/20 text-primary-600 dark:text-primary-400 font-bold text-3xl flex items-center justify-center shadow-inner">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-surface-900 dark:text-white">Profile Picture</h3>
                <p className="text-sm text-surface-500 dark:text-gray-400 mt-1">Upload a high resolution avatar to display across your modules.</p>
                <div className="mt-3 flex gap-3">
                  <button className="btn-primary text-sm py-1.5 px-4 rounded-lg">Upload new</button>
                  <button className="btn-secondary text-sm py-1.5 px-4 rounded-lg">Remove</button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-surface-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Full Name</label>
                  <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Email Address</label>
                  <input type="email" className="input-field opacity-60 cursor-not-allowed" value={formData.email} disabled />
                </div>
                <div>
                  <label className="text-xs font-bold text-surface-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Role Designation</label>
                  <input type="text" className="input-field opacity-60 capitalize cursor-not-allowed" value={user?.role || 'User'} disabled />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Interface Theme</h3>
              <p className="text-sm text-surface-500 dark:text-gray-400 mt-1">Customize your workspace lighting. System defaults automatically match your local OS settings.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              {[
                { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean, brilliant interface' },
                { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Deep navy cinematic look' },
                { id: 'system', label: 'System Default', icon: Monitor, desc: 'Adapts to local machine' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all duration-300 ${
                    theme === t.id 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-[0_4px_20px_rgba(6,182,212,0.15)]' 
                    : 'border-surface-200 dark:border-white/5 bg-white dark:bg-surface-850 hover:border-primary-400/50'
                  }`}
                >
                  <div className={`p-3 rounded-full mb-4 ${theme === t.id ? 'bg-primary-500 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-gray-300'}`}>
                    <t.icon size={24} />
                  </div>
                  <h4 className="font-bold text-surface-900 dark:text-white">{t.label}</h4>
                  <p className="text-xs text-surface-500 dark:text-gray-400 text-center mt-2">{t.desc}</p>
                  
                  {theme === t.id && (
                    <div className="absolute top-4 right-4 text-primary-500">
                      <CheckCircle size={18} className="fill-white dark:fill-surface-900" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="pt-8 border-t border-surface-200 dark:border-white/5 mt-8">
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Accent Colors</h3>
              <p className="text-sm text-surface-500 dark:text-gray-400 mt-1">Cyan is currently enforced as the global disaster tactical identity. Advanced theming coming soon.</p>
              <div className="flex gap-4 mt-4">
                <div className="w-10 h-10 rounded-full bg-primary-500 border-2 border-white dark:border-surface-900 ring-2 ring-primary-500 shadow-md"></div>
                <div className="w-10 h-10 rounded-full bg-blue-500 opacity-30 cursor-not-allowed"></div>
                <div className="w-10 h-10 rounded-full bg-orange-500 opacity-30 cursor-not-allowed"></div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {[
              { id: 'alerts', title: 'Critical Disaster Alerts', desc: 'Real-time push notifications for active incident spikes and hazards.', icon: AlertCircle => <Bell size={18} className="text-primary-500" /> },
              { id: 'smsNotif', title: 'SMS Action Reminders', desc: 'Receive direct texts when resources are required at your physical location.', icon: Smartphone => <Smartphone size={18} className="text-warning-500" /> },
              { id: 'emailNotif', title: 'Email Digsests', desc: 'Weekly analytics run-down of incident predictive models and resource allocations.', icon: Mail => <Mail size={18} className="text-success-500" /> },
            ].map(setting => (
              <div key={setting.id} className="flex items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-white/5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-surface-800 shadow-sm flex items-center justify-center flex-shrink-0">
                    {setting.icon(setting.id)}
                  </div>
                  <div>
                    <h4 className="font-bold text-surface-900 dark:text-gray-200">{setting.title}</h4>
                    <p className="text-xs text-surface-500 dark:text-gray-400 mt-1 leading-relaxed">{setting.desc}</p>
                  </div>
                </div>
                {/* Modern Toggle */}
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={formData[setting.id]} onChange={() => setFormData({...formData, [setting.id]: !formData[setting.id]})} />
                  <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                </label>
              </div>
            ))}
          </div>
        );

      case 'security':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Change Password</h3>
              <p className="text-sm text-surface-500 dark:text-gray-400 mt-1">Ensure your account is using a long, random password to stay secure.</p>
              
              <form onSubmit={(e) => { e.preventDefault(); toast.success('Password successfully changed'); }} className="mt-6 space-y-4 max-w-md">
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-gray-500" />
                  <input type="password" placeholder="Current Password" required className="input-field pl-10" />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 dark:text-gray-500" />
                  <input type="password" placeholder="New Password" required className="input-field pl-10" />
                </div>
                <button type="submit" className="btn-primary w-full">Update Password</button>
              </form>
            </div>

            <div className="pt-8 border-t border-surface-200 dark:border-white/5">
              <h3 className="text-lg font-bold text-danger-600 dark:text-danger-400">Danger Zone</h3>
              <p className="text-sm text-surface-500 dark:text-gray-400 mt-1">Revoke access from all signed in geographical locations immediately.</p>
              <button onClick={() => { logout(); toast.success('Logged out successfully'); }} className="btn-secondary mt-4 text-danger-600 dark:text-danger-400 border-danger-200 dark:border-danger-900/50 hover:bg-danger-50 dark:hover:bg-danger-900/20">
                <LogOut size={16} /> Logout All Sessions
              </button>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between p-5 rounded-xl border border-surface-200 dark:border-white/5 bg-surface-50 dark:bg-surface-850">
              <div className="flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-surface-900 dark:text-white">Auto-Detect Geofence</h4>
                  <p className="text-xs text-surface-500 dark:text-gray-400">Use browser location logic to ping you against exact incident coordinates.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={formData.detectLocation} onChange={() => setFormData({...formData, detectLocation: !formData.detectLocation})} />
                  <div className="w-11 h-6 bg-surface-300 peer-focus:outline-none rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-500"></div>
                </label>
            </div>

            <div>
              <label className="text-xs font-bold text-surface-500 dark:text-gray-400 uppercase tracking-widest block mb-2">Static Location Coordinates</label>
              <input type="text" className="input-field" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} disabled={formData.detectLocation} />
            </div>

            <div className="pt-4">
              <div className="flex justify-between items-center mb-4">
                <label className="text-xs font-bold text-surface-500 dark:text-gray-400 uppercase tracking-widest">Global Alert Radius</label>
                <span className="text-primary-600 dark:text-primary-400 font-bold">{formData.radius} KM</span>
              </div>
              <input 
                type="range" 
                min="5" max="100" 
                value={formData.radius} 
                onChange={(e) => setFormData({...formData, radius: e.target.value})}
                className="w-full h-2 bg-surface-200 dark:bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between text-[10px] text-surface-500 dark:text-gray-500 mt-2 font-bold">
                <span>5 KM (Strict)</span>
                <span>50 KM (Regional)</span>
                <span>100 KM (Statewide)</span>
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <button onClick={handleSave} className="btn-primary">Update Location Polling</button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">System Settings</h1>
        <p className="text-sm text-surface-500 dark:text-gray-400 mt-1">Manage your account protocols, security vectors, and UI preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 flex-shrink-0">
          <nav className="card p-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  activeTab === tab.id
                  ? 'bg-primary-50 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400'
                  : 'text-surface-600 dark:text-gray-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                }`}
              >
                <tab.icon size={18} />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="card lg:px-10 lg:py-10">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
