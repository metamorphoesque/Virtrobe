// src/hooks/useNotification.js
// Enhanced notification system with message support, types, and stacking.
import { useState, useCallback, useRef } from 'react';

let globalId = 0;

export const useNotification = (defaultDuration = 4000) => {
  const [notifications, setNotifications] = useState([]);
  // Keep backward compat: single isVisible
  const [isVisible, setIsVisible] = useState(false);
  const lastTimerRef = useRef(null);

  const show = useCallback((messageOrOpts) => {
    const opts = typeof messageOrOpts === 'string'
      ? { message: messageOrOpts }
      : (messageOrOpts ?? {});

    const {
      message = 'Saved successfully',
      type = 'success',        // 'success' | 'error' | 'info' | 'posted'
      duration = defaultDuration,
      action = null,           // { label, onClick }
    } = opts;

    const id = ++globalId;

    const notif = { id, message, type, action, entering: true };
    setNotifications(prev => [...prev, notif]);
    setIsVisible(true);

    // Remove "entering" flag after animation
    setTimeout(() => {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, entering: false } : n)
      );
    }, 50);

    // Auto-dismiss
    const timer = setTimeout(() => {
      dismiss(id);
    }, duration);

    // Track the timer so we can clear if needed
    lastTimerRef.current = timer;

    return id;
  }, [defaultDuration]);

  const dismiss = useCallback((id) => {
    // Mark as leaving for exit animation
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, leaving: true } : n)
    );
    // Remove after animation
    setTimeout(() => {
      setNotifications(prev => {
        const next = prev.filter(n => n.id !== id);
        if (next.length === 0) setIsVisible(false);
        return next;
      });
    }, 350);
  }, []);

  return {
    notifications,
    isVisible,
    show,
    dismiss,
  };
};