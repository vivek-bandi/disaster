import React from 'react';
import { X, Bell } from 'lucide-react';
import { useAlerts } from '../../context/AlertContext';
import { formatDistanceToNow } from 'date-fns';

const SEV_DOT = { critical: 'bg-red-500', warning: 'bg-yellow-500', info: 'bg-blue-500' };

export default function NotificationPanel({ onClose }) {
  const { alerts, notifications, markAllRead } = useAlerts();

  const all = [...alerts.slice(0, 10), ...notifications.slice(0, 10)]
    .sort((a, b) => new Date(b.createdAt || b.time || 0) - new Date(a.createdAt || a.time || 0))
    .slice(0, 15);

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-surface-800 border-l border-surface-200 dark:border-surface-700 shadow-2xl z-20 flex flex-col animate-slide-in">
      <div className="flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-primary-400" />
          <h3 className="text-surface-900 dark:text-white font-semibold text-sm">Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} className="text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:text-white text-xs transition-colors">Mark all read</button>
          <button onClick={onClose} className="text-surface-500 dark:text-gray-400 hover:text-surface-900 dark:text-white p-1 rounded-lg hover:bg-surface-50 dark:bg-surface-700 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {all.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-500 dark:text-gray-500 text-sm">
            <Bell size={32} className="mb-3 opacity-30" />
            <p>No notifications yet</p>
          </div>
        ) : (
          all.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-4 border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:bg-surface-700 transition-colors cursor-pointer">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${SEV_DOT[item.severity] || SEV_DOT.info}`} />
              <div className="flex-1 min-w-0">
                <p className="text-surface-900 dark:text-white text-xs font-medium leading-snug">{item.title}</p>
                <p className="text-surface-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-2">{item.message}</p>
                <p className="text-gray-600 text-xs mt-1">
                  {formatDistanceToNow(new Date(item.createdAt || item.time || Date.now()), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
