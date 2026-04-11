import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const socket = io(process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('accessToken') }
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log('WebSocket connected'));

    socket.on('new-alert', (alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]);
      setUnreadCount(c => c + 1);

      const severityStyles = {
        critical: { icon: '🚨', style: { background: '#7f1d1d', border: '1px solid #dc2626', color: '#fecaca' } },
        warning:  { icon: '⚠️', style: { background: '#78350f', border: '1px solid #d97706', color: '#fde68a' } },
        info:     { icon: 'ℹ️', style: { background: '#1e3a5f', border: '1px solid #2563eb', color: '#bfdbfe' } }
      };
      const s = severityStyles[alert.severity] || severityStyles.info;
      toast(
        <div className="flex items-start gap-2">
          <span className="text-lg">{s.icon}</span>
          <div>
            <p className="font-semibold text-sm">{alert.title}</p>
            <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
          </div>
        </div>,
        { duration: 6000, style: s.style }
      );
    });

    socket.on('incident-updated', (incident) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: 'update',
        title: 'Incident Updated',
        message: `Incident status changed to ${incident.status}`,
        time: new Date().toISOString(),
        read: false
      }, ...prev.slice(0, 49)]);
      setUnreadCount(c => c + 1);
    });

    socket.on('new-help-request', (req) => {
      if (user.role === 'volunteer' || user.role === 'admin') {
        toast.success(`New ${req.urgency} urgency help request: ${req.type}`);
        setUnreadCount(c => c + 1);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  const markAllRead = () => setUnreadCount(0);

  return (
    <AlertContext.Provider value={{ alerts, notifications, unreadCount, markAllRead }}>
      {children}
    </AlertContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertContext);
