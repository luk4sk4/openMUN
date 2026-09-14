import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  Trash2
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

/**
 * ToastNotification
 * Sistema de notificaciones toast estilizado, ultra-moderno y accesible.
 * Admite notificaciones estándar y toasts grandes interactivos de confirmación.
 */
export const ToastNotification = ({ toasts, onDismiss }) => {
  const { currentTheme } = useAccessibility();
  const isLight = currentTheme === 'light';

  if (!toasts || toasts.length === 0) return null;

  const hasLargeToast = toasts.some(t => t.isLarge || t.type === 'confirm' || t.onConfirm);

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: hasLargeToast ? '520px' : '420px',
        width: 'calc(100vw - 2.5rem)',
        pointerEvents: 'none',
        transition: 'max-width 0.2s ease'
      }}
    >
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          isLight={isLight}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, isLight, onDismiss }) => {
  const {
    type = 'info',
    title,
    message,
    duration = 4000,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isLarge = false
  } = toast;

  const isConfirmation = type === 'confirm' || typeof onConfirm === 'function';
  const effectiveDuration = isConfirmation && duration === 4000 ? 0 : duration;

  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(effectiveDuration);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (effectiveDuration <= 0) return;

    if (!isPaused) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const currentRemaining = remainingTimeRef.current - elapsed;
        const pct = Math.max(0, (currentRemaining / effectiveDuration) * 100);
        setProgress(pct);

        if (currentRemaining <= 0) {
          clearInterval(intervalRef.current);
          onDismiss();
        }
      }, 25);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [isPaused, effectiveDuration, onDismiss]);

  const handleMouseEnter = () => {
    if (effectiveDuration > 0) {
      setIsPaused(true);
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  };

  const handleMouseLeave = () => {
    if (effectiveDuration > 0) {
      setIsPaused(false);
    }
  };

  // Configuración de estilo según el tipo de Toast
  const typeConfig = {
    success: {
      accentColor: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.15)',
      badgeBg: 'rgba(16, 185, 129, 0.18)',
      borderColor: isLight ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.45)',
      icon: <CheckCircle2 size={20} color="#10b981" strokeWidth={2.4} />,
      progressBg: 'linear-gradient(90deg, #10b981, #34d399)'
    },
    error: {
      accentColor: '#f43f5e',
      bgGlow: 'rgba(244, 63, 94, 0.18)',
      badgeBg: 'rgba(244, 63, 94, 0.2)',
      borderColor: isLight ? 'rgba(244, 63, 94, 0.35)' : 'rgba(244, 63, 94, 0.45)',
      icon: <AlertOctagon size={20} color="#f43f5e" strokeWidth={2.4} />,
      progressBg: 'linear-gradient(90deg, #f43f5e, #fb7185)'
    },
    warning: {
      accentColor: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.15)',
      badgeBg: 'rgba(245, 158, 11, 0.2)',
      borderColor: isLight ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.45)',
      icon: <AlertTriangle size={20} color="#f59e0b" strokeWidth={2.4} />,
      progressBg: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
    },
    confirm: {
      accentColor: '#ef4444',
      bgGlow: 'rgba(239, 68, 68, 0.22)',
      badgeBg: 'rgba(239, 68, 68, 0.2)',
      borderColor: isLight ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.6)',
      icon: <AlertTriangle size={22} color="#ef4444" strokeWidth={2.5} />,
      progressBg: 'linear-gradient(90deg, #ef4444, #f87171)'
    },
    info: {
      accentColor: '#3b82f6',
      bgGlow: 'rgba(59, 130, 246, 0.15)',
      badgeBg: 'rgba(59, 130, 246, 0.2)',
      borderColor: isLight ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.45)',
      icon: <Info size={20} color="#3b82f6" strokeWidth={2.4} />,
      progressBg: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
    }
  };

  const config = isConfirmation
    ? typeConfig.confirm
    : (typeConfig[type] || typeConfig.info);

  const isExpandedLayout = isLarge || isConfirmation;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: isExpandedLayout ? '1.15rem 1.25rem' : '0.9rem 1.05rem',
        borderRadius: '14px',
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(17, 22, 33, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${config.borderColor}`,
        boxShadow: isLight
          ? `0 16px 36px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0,0,0,0.05), 0 0 24px ${config.bgGlow}, inset 0 1px 0 rgba(255,255,255,0.9)`
          : `0 20px 42px rgba(0, 0, 0, 0.6), 0 0 28px ${config.bgGlow}, inset 0 1px 0 rgba(255,255,255,0.1)`,
        color: isLight ? '#0f172a' : '#f8fafc',
        overflow: 'hidden',
        animation: 'toastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        transition: 'all 0.2s ease',
        cursor: 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.95rem' }}>
        {/* Icon Badge */}
        <div
          style={{
            flexShrink: 0,
            width: isExpandedLayout ? '40px' : '36px',
            height: isExpandedLayout ? '40px' : '36px',
            borderRadius: '10px',
            backgroundColor: config.badgeBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 14px ${config.bgGlow}`
          }}
        >
          {config.icon}
        </div>

        {/* Contenido de Texto */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '0.05rem' }}>
          {title && (
            <div
              style={{
                fontWeight: '700',
                fontSize: isExpandedLayout ? '0.95rem' : '0.88rem',
                lineHeight: '1.3',
                marginBottom: message ? '0.35rem' : 0,
                color: isLight ? '#0f172a' : '#f1f5f9',
                letterSpacing: '-0.01em'
              }}
            >
              {title}
            </div>
          )}
          {message && (
            <div
              style={{
                fontSize: isExpandedLayout ? '0.82rem' : '0.78rem',
                lineHeight: '1.45',
                color: isLight ? '#334155' : '#94a3b8',
                wordBreak: 'break-word'
              }}
            >
              {message}
            </div>
          )}
        </div>

        {/* Botón Cerrar */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isConfirmation && typeof onCancel === 'function') {
              onCancel();
            }
            onDismiss();
          }}
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            color: isLight ? '#94a3b8' : '#64748b',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            marginLeft: '0.2rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = isLight ? '#0f172a' : '#f8fafc';
            e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isLight ? '#94a3b8' : '#64748b';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Cerrar notificación"
        >
          <X size={16} />
        </button>
      </div>

      {/* Botones de Acción para Confirmación */}
      {isConfirmation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.65rem',
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'}`
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onCancel === 'function') onCancel();
              onDismiss();
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              border: `1px solid ${isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.16)'}`,
              backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
              color: isLight ? '#475569' : '#cbd5e1',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)';
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onConfirm === 'function') onConfirm();
              onDismiss();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '6px 15px',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.4)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <Trash2 size={14} />
            <span>{confirmText}</span>
          </button>
        </div>
      )}

      {/* Barra de progreso */}
      {effectiveDuration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            width: `${progress}%`,
            background: config.progressBg,
            transition: isPaused ? 'none' : 'width 25ms linear',
            borderRadius: '0 2px 2px 0'
          }}
        />
      )}
    </div>
  );
};

export default ToastNotification;
