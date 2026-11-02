import i18n from '../../languages/index.js';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  X,
  Trash2,
  Download
} from 'lucide-react';
import { useAccessibility } from '../../context/AccessibilityContext';

/**
 * ToastNotification
 * Sistema de notificaciones toast conforme al sistema de diseño de OpenMUN (openmun-design).
 *
 * Principios aplicados:
 * - Tokens semánticos: variables CSS (--panel-color, --text-color, --muted-text, --border-color,
 *   --accent-color, --btn-bg, --btn-text, --success-color, --danger-color, --warning-color, --info-color).
 * - Superficies planas y continuas con elevación sutil sin brillos ni degradados de fantasía.
 * - Bordes de 1px con borde de acento sutil para indicar estado semántico sin saturar.
 * - Iconos proporcionados con texto descriptivo para máxima accesibilidad.
 * - Foco accesible y soporte para reducción de movimiento.
 */
export const ToastNotification = ({ toasts, onDismiss }) => {
  const { t } = useTranslation();
  const { currentTheme } = useAccessibility();
  const isLight = currentTheme === 'light';

  if (!toasts || toasts.length === 0) return null;

  const hasLargeToast = toasts.some(t => t.isLarge || t.type === 'confirm' || t.onConfirm || t.action);

  return (
    <div
      role="region"
      aria-label={t('ui.notifications')}
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: hasLargeToast ? '460px' : '380px',
        width: 'calc(100vw - 2rem)',
        pointerEvents: 'none',
        fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
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
  const { t } = useTranslation();
  const {
    type = 'info',
    title,
    message,
    duration = 4000,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = i18n.t('ui.cancel'),
    isLarge = false,
    action,
    destructive = true
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

  // Configuración semántica estricta según OpenMUN Design System
  const typeConfig = {
    success: {
      accentColor: 'var(--success-color, #a4d4b3)',
      badgeBg: 'var(--success-soft, rgba(116, 183, 138, 0.15))',
      borderColor: 'var(--success-color, #a4d4b3)',
      icon: <CheckCircle2 size={16} strokeWidth={2.4} />
    },
    error: {
      accentColor: 'var(--danger-color, #edaaa1)',
      badgeBg: 'var(--danger-soft, rgba(220, 130, 117, 0.18))',
      borderColor: 'var(--danger-color, #edaaa1)',
      icon: <AlertOctagon size={16} strokeWidth={2.4} />
    },
    warning: {
      accentColor: 'var(--warning-color, #cbb58d)',
      badgeBg: 'var(--warning-soft, rgba(203, 181, 141, 0.15))',
      borderColor: 'var(--warning-color, #cbb58d)',
      icon: <AlertTriangle size={16} strokeWidth={2.4} />
    },
    confirm: {
      accentColor: destructive ? 'var(--danger-color, #edaaa1)' : 'var(--accent-color, #efa37f)',
      badgeBg: destructive ? 'var(--danger-soft, rgba(220, 130, 117, 0.18))' : 'var(--accent-soft, rgba(239, 163, 127, 0.12))',
      borderColor: destructive ? 'var(--danger-color, #edaaa1)' : 'var(--accent-color, #efa37f)',
      icon: <AlertTriangle size={16} strokeWidth={2.4} />
    },
    info: {
      accentColor: 'var(--info-color, #a6b8c9)',
      badgeBg: 'var(--info-soft, rgba(166, 184, 201, 0.12))',
      borderColor: 'var(--info-color, #a6b8c9)',
      icon: <Info size={16} strokeWidth={2.4} />
    }
  };

  const config = isConfirmation
    ? typeConfig.confirm
    : (typeConfig[type] || typeConfig.info);

  const isExpandedLayout = isLarge || isConfirmation || Boolean(action);

  return (
    <div
      role={isConfirmation || type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        pointerEvents: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: isExpandedLayout ? '0.85rem 1rem' : '0.75rem 0.9rem',
        borderRadius: 'var(--border-radius, 6px)',
        backgroundColor: 'var(--panel-color, #363636)',
        border: '1px solid var(--border-color, #4b4b4b)',
        borderLeft: `3px solid ${config.accentColor}`,
        boxShadow: isLight
          ? '0 4px 14px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)'
          : '0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2)',
        color: 'var(--text-color, #f7f2eb)',
        overflow: 'hidden',
        animation: 'toastSlideIn 0.2s ease-out forwards',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        cursor: 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Icon Badge */}
        <div
          style={{
            flexShrink: 0,
            width: '28px',
            height: '28px',
            borderRadius: 'var(--border-radius, 6px)',
            backgroundColor: config.badgeBg,
            color: config.accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '1px'
          }}
          aria-hidden="true"
        >
          {config.icon}
        </div>

        {/* Contenido de Texto */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: '1px' }}>
          {title && (
            <div
              style={{
                fontWeight: '650',
                fontSize: isExpandedLayout ? '0.88rem' : '0.82rem',
                lineHeight: '1.3',
                marginBottom: message ? '0.25rem' : 0,
                color: 'var(--text-color, #f7f2eb)',
                letterSpacing: '-0.01em'
              }}
            >
              {title}
            </div>
          )}
          {message && (
            <div
              style={{
                fontSize: isExpandedLayout ? '0.8rem' : '0.76rem',
                lineHeight: '1.45',
                color: 'var(--muted-text, #b9b9b9)',
                wordBreak: 'break-word',
                whiteSpace: 'pre-line'
              }}
            >
              {message}
            </div>
          )}
        </div>

        {/* Botón Cerrar */}
        <button
          type="button"
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
            color: 'var(--muted-text, #b9b9b9)',
            cursor: 'pointer',
            padding: '3px',
            borderRadius: 'var(--border-radius, 6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease, background-color 0.15s ease',
            marginLeft: '0.25rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-color, #f7f2eb)';
            e.currentTarget.style.backgroundColor = 'var(--subborder-color, rgba(255,255,255,0.06))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--muted-text, #b9b9b9)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--accent-color)';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
          title={t('ui.closeNotification')}
          aria-label={t('ui.closeNotification')}
        >
          <X size={15} />
        </button>
      </div>

      {/* Botones de Acción para Confirmación */}
      {isConfirmation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            marginTop: '0.75rem',
            paddingTop: '0.6rem',
            borderTop: '1px solid var(--subborder-color, #414141)'
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
              padding: '5px 12px',
              borderRadius: 'var(--border-radius, 6px)',
              border: '1px solid var(--border-color, #4b4b4b)',
              backgroundColor: 'transparent',
              color: 'var(--text-color, #f7f2eb)',
              fontSize: '0.78rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, border-color 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--subborder-color, rgba(255,255,255,0.06))';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onFocus={e => {
              e.currentTarget.style.outline = '2px solid var(--accent-color)';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={e => {
              e.currentTarget.style.outline = 'none';
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
              gap: '0.35rem',
              padding: '5px 13px',
              borderRadius: 'var(--border-radius, 6px)',
              border: destructive ? '1px solid var(--danger-color, #edaaa1)' : 'none',
              backgroundColor: destructive ? 'var(--danger-solid, #a95449)' : 'var(--btn-bg, #b45432)',
              color: 'var(--btn-text, #ffffff)',
              fontSize: '0.78rem',
              fontWeight: '650',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
            }}
            onFocus={e => {
              e.currentTarget.style.outline = '2px solid var(--accent-color)';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={e => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            {destructive && <Trash2 size={13} />}
            <span>{confirmText}</span>
          </button>
        </div>
      )}

      {/* Botón de Acción Opcional (ej. Descargar Archivo) */}
      {!isConfirmation && action && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            marginTop: '0.65rem',
            paddingTop: '0.55rem',
            borderTop: '1px solid var(--subborder-color, #414141)'
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof action.onClick === 'function') {
                action.onClick();
              }
              if (action.dismissOnClick !== false) {
                onDismiss();
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '5px 12px',
              borderRadius: 'var(--border-radius, 6px)',
              border: 'none',
              backgroundColor: 'var(--btn-bg, #b45432)',
              color: 'var(--btn-text, #ffffff)',
              fontSize: '0.78rem',
              fontWeight: '650',
              cursor: 'pointer',
              transition: 'opacity 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.opacity = '1';
            }}
            onFocus={e => {
              e.currentTarget.style.outline = '2px solid var(--accent-color)';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={e => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            {action.icon || <Download size={13} />}
            <span>{action.label}</span>
          </button>
        </div>
      )}

      {/* Barra de progreso sutil y sobria */}
      {effectiveDuration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            width: `${progress}%`,
            backgroundColor: config.accentColor,
            opacity: 0.75,
            transition: isPaused ? 'none' : 'width 25ms linear'
          }}
        />
      )}
    </div>
  );
};

export default ToastNotification;
