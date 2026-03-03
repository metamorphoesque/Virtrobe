// src/components/TryOn/SaveNotification.jsx
// Rich animated toast notification system.
// Renders a stack of notifications with enter/leave animations,
// icons by type, and optional action buttons.

import React from 'react';
import { Save, Send, AlertCircle, Info, X, Check, ExternalLink } from 'lucide-react';

const serif = { fontFamily: "'Cormorant Garamond', Georgia, serif" };

const TYPE_CONFIG = {
  success: {
    icon: Check,
    bg: 'bg-black',
    text: 'text-white',
    border: 'border-white/10',
    iconBg: 'bg-white/15',
    iconColor: 'text-emerald-300',
  },
  posted: {
    icon: Send,
    bg: 'bg-gradient-to-r from-black via-gray-900 to-black',
    text: 'text-white',
    border: 'border-white/10',
    iconBg: 'bg-white/15',
    iconColor: 'text-sky-300',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-400/30',
    iconBg: 'bg-white/15',
    iconColor: 'text-white',
  },
  info: {
    icon: Info,
    bg: 'bg-white',
    text: 'text-black',
    border: 'border-black/10',
    iconBg: 'bg-black/5',
    iconColor: 'text-black/50',
  },
};

const Toast = ({ notification, onDismiss }) => {
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.success;
  const Icon = config.icon;

  return (
    <div
      className={`
        flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md
        transition-all duration-350 ease-out min-w-[280px] max-w-[420px]
        ${config.bg} ${config.text} ${config.border}
        ${notification.entering ? 'translate-x-20 opacity-0' : ''}
        ${notification.leaving ? 'translate-x-20 opacity-0 scale-95' : ''}
        ${!notification.entering && !notification.leaving ? 'translate-x-0 opacity-100 scale-100' : ''}
      `}
      style={{ transition: 'all 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium leading-snug" style={serif}>
          {notification.message}
        </p>
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className={`
              mt-1.5 text-[10px] uppercase tracking-wider flex items-center gap-1
              transition-all hover:opacity-75
              ${notification.type === 'info' ? 'text-black/40' : 'text-white/50'}
            `}
            style={serif}
          >
            <ExternalLink className="w-2.5 h-2.5" />
            {notification.action.label}
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss?.(notification.id)}
        className={`
          p-1 rounded-lg transition-colors flex-shrink-0
          ${notification.type === 'info'
            ? 'text-black/20 hover:text-black/60 hover:bg-black/5'
            : 'text-white/25 hover:text-white/70 hover:bg-white/10'
          }
        `}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

const SaveNotification = ({ isVisible, notifications = [], onDismiss }) => {
  // Backward compat: if no notifications array, show legacy toast
  if (!notifications || notifications.length === 0) {
    if (!isVisible) return null;
    return (
      <div className="fixed top-24 right-6 z-[999] flex flex-col gap-2 items-end pointer-events-auto">
        <Toast
          notification={{ id: 0, message: 'Saved to your profile', type: 'success' }}
          onDismiss={() => { }}
        />
      </div>
    );
  }

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-24 right-6 z-[999] flex flex-col gap-2 items-end pointer-events-auto">
      {notifications.map((notif) => (
        <Toast key={notif.id} notification={notif} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default SaveNotification;
