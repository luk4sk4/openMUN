import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      if (typeof options === 'string') {
        setModalConfig({
          message: options,
          isOpen: true
        });
      } else {
        setModalConfig({
          ...options,
          isOpen: true
        });
      }
    });
  }, []);

  const alert = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve(true);
      const base = typeof options === 'string' ? { message: options } : options;
      setModalConfig({
        ...base,
        isAlert: true,
        cancelText: null,
        isOpen: true
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setModalConfig(null);
  }, []);

  const handleClose = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setModalConfig(null);
  }, []);

  // Escuchar eventos globales de confirmación para disparar desde utilidades fuera del árbol de React
  useEffect(() => {
    const handleCustomConfirm = (e) => {
      if (e?.detail) {
        const { resolve, options, isAlert } = e.detail;
        const fn = isAlert ? alert : confirm;
        fn(options).then((res) => {
          if (typeof resolve === 'function') resolve(res);
        });
      }
    };
    window.addEventListener('openmun_confirm_dialog', handleCustomConfirm);
    return () => window.removeEventListener('openmun_confirm_dialog', handleCustomConfirm);
  }, [confirm, alert]);

  // confirmFn es directamente invocable: await confirm(...)
  // y también expone confirm y alert como propiedades: const { confirm, alert } = useConfirm()
  const confirmFn = useCallback((options) => confirm(options), [confirm]);
  confirmFn.confirm = confirm;
  confirmFn.alert = alert;

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {modalConfig && (
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          onClose={handleClose}
          onConfirm={handleConfirm}
          title={modalConfig.title}
          message={modalConfig.message}
          highlightText={modalConfig.highlightText}
          submessage={modalConfig.submessage}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          type={modalConfig.type}
          isAlert={modalConfig.isAlert}
          loading={modalConfig.loading}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    const fallback = (options) => {
      if (typeof window !== 'undefined') {
        return new Promise((resolve) => {
          window.dispatchEvent(
            new CustomEvent('openmun_confirm_dialog', {
              detail: { resolve, options, isAlert: false }
            })
          );
        });
      }
      return Promise.resolve(false);
    };
    fallback.confirm = fallback;
    fallback.alert = (options) => {
      if (typeof window !== 'undefined') {
        return new Promise((resolve) => {
          window.dispatchEvent(
            new CustomEvent('openmun_confirm_dialog', {
              detail: { resolve, options, isAlert: true }
            })
          );
        });
      }
      return Promise.resolve();
    };
    return fallback;
  }
  return context;
};

export default ConfirmContext;