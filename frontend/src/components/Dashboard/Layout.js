import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, AlertTriangle, Users, Tent, Heart,
  TrendingUp, Package, Bell, Settings, LogOut, Menu, X, Shield,
  ChevronRight, Activity, ShieldCheck, Boxes
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAlerts } from '../../context/AlertContext';
import NotificationPanel from '../Alerts/NotificationPanel';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/map', label: 'Risk Map', icon: Map },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/predictions', label: 'Predictions', icon: TrendingUp },
  { path: '/safety', label: 'Safety Advisory', icon: ShieldCheck },
  { path: '/volunteers', label: 'Volunteers', icon: Users, roles: ['volunteer', 'admin'] },
  { path: '/shelters', label: 'Shelters', icon: Tent },
  { path: '/help-requests', label: 'Help Requests', icon: Heart },
  { path: '/resources', label: 'Resources', icon: Package },
  { path: '/allocate', label: 'Allocate Resources', icon: Boxes, roles: ['admin'] },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/admin', label: 'Admin Panel', icon: Shield, roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useAlerts();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

  return (
    <div className="flex h-screen overflow-hidden bg-transparent relative">
      
      {/* Mobile Dim Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - adaptive & mobile-ready */}
      <aside className={`
        ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-16'} 
        absolute md:relative inset-y-0 left-0
        flex-shrink-0 bg-white/70 dark:bg-surface-850/30 md:dark:bg-transparent backdrop-blur-xl border-r border-surface-200 dark:border-white/5 flex flex-col transition-all duration-300 ease-in-out z-50 shadow-2xl md:shadow-none
      `}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-surface-200 dark:border-white/5 ${!sidebarOpen && 'md:justify-center'}`}>
          <div className="flex-shrink-0 w-8 h-8 bg-danger-600 rounded-lg flex items-center justify-center shadow-sm">
            <Activity size={18} className="text-white" />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${!sidebarOpen ? 'w-0 opacity-0 hidden md:block md:w-0' : 'w-auto opacity-100'}`}>
            <p className="text-surface-900 dark:text-white font-bold text-sm leading-tight whitespace-nowrap">DisasterWatch</p>
            <p className="text-surface-500 dark:text-gray-500 text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">Response System</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {filteredNav.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => { navigate(path); if(window.innerWidth < 768) setSidebarOpen(false); }}
                className={`w-full ${active ? 'nav-item-active' : 'nav-item'} ${!sidebarOpen ? 'md:justify-center' : ''}`}
                title={!sidebarOpen ? label : ''}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className={`text-sm font-medium truncate transition-all duration-300 ${!sidebarOpen ? 'w-0 hidden md:inline-block md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>{label}</span>
                {active && sidebarOpen && <ChevronRight size={14} className="ml-auto opacity-60 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="border-t border-surface-200 dark:border-white/5 p-3">
          <div className={`flex items-center gap-3 px-2 py-2 ${!sidebarOpen ? 'md:justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm border border-white/10">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-300 ${!sidebarOpen ? 'w-0 hidden md:inline-block md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
              <p className="text-surface-900 dark:text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-surface-500 dark:text-gray-500 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          
          <button onClick={logout} className={`w-full nav-item text-danger-500 dark:text-danger-400 hover:text-danger-600 dark:hover:text-danger-300 mt-1 ${!sidebarOpen ? 'md:justify-center' : ''}`}>
            <LogOut size={16} className="flex-shrink-0" />
            <span className={`text-sm transition-all duration-300 ${!sidebarOpen ? 'w-0 hidden md:inline-block md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 bg-surface-50/50 dark:bg-transparent">
        {/* Top bar */}
        <header className="bg-white/80 dark:bg-surface-850/50 backdrop-blur-xl rounded-b-2xl border border-surface-200 dark:border-white/5 border-t-0 px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-3 md:gap-4 flex-shrink-0 mx-2 md:mx-4 mt-1 md:mt-2 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white p-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-colors">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-surface-900 dark:text-white font-bold text-sm md:text-base truncate">
              {filteredNav.find(n => n.path === location.pathname)?.label || (location.pathname === '/settings' ? 'System Settings' : 'Dashboard')}
            </h1>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-success-600 dark:text-success-400 font-bold tracking-wider uppercase">
            <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-success-500 dark:bg-success-400 animate-pulse-slow shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="hidden sm:block">System Online</span>
          </div>

          <div className="h-6 w-px bg-surface-200 dark:bg-white/10 hidden md:block"></div>

          {/* Notifications bell */}
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-danger-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-surface-850">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button onClick={() => navigate('/settings')} title="Settings" className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors group">
            <Settings size={18} className="text-surface-500 dark:text-gray-400 group-hover:text-surface-900 dark:group-hover:text-white transition-colors" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>

      {/* Notification panel */}
      {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
    </div>
  );
}
