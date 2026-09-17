import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ToastNotification from '../components/common/ToastNotification';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toastData) => {
    if (!toastData) return null;
    const {
      type = 'info',
      title,
      message,
      duration = 4000,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      isLarge,
      action
    } = toastData;

    const id = toastData.id || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    setToasts(prev => {
      // Si ya existe un toast con este ID específico, lo actualizamos en vez de duplicar
      if (prev.some(t => t.id === id)) {
        return prev.map(t => (t.id === id ? {
          ...t,
          type,
          title,
          message,
          duration,
          onConfirm,
          onCancel,
          confirmText,
          cancelText,
          isLarge,
          action
        } : t));
      }
      return [...prev, {
        id,
        type,
        title,
        message,
        duration,
        onConfirm,
        onCancel,
        confirmText,
        cancelText,
        isLarge,
        action
      }];
    });

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Escuchar eventos globales de toast para que cualquier servicio o componente pueda dispararlos
  useEffect(() => {
    const handleCustomToast = (e) => {
      if (e && e.detail) {
        addToast(e.detail);
      }
    };
    window.addEventListener('openmun_toast', handleCustomToast);

    // Revisar toasts pendientes en localStorage
    try {
      const pendingToast = localStorage.getItem('openmun_pending_toast');
      if (pendingToast) {
        localStorage.removeItem('openmun_pending_toast');
        const parsed = JSON.parse(pendingToast);
        addToast(parsed);
      }
    } catch (e) {
      console.error('Error procesando toast pendiente en ToastProvider:', e);
    }

    return () => {
      window.removeEventListener('openmun_toast', handleCustomToast);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      addToast: (detail) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('openmun_toast', { detail }));
        }
      },
      removeToast: () => {}
    };
  }
  return context;
};

export default ToastContext;
