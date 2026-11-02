import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Download, Trash2, HelpCircle, X, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * ConfirmModal
 * Modal de confirmación y alerta alineado estrictamente con el sistema de diseño OpenMUN (/openmun-design).
 *
 * Utiliza los tokens del AccessibilityContext:
 * - Superficie: var(--panel-color)
 * - Bordes: var(--border-color) y var(--border-radius, 6px)
 * - Botones: var(--btn-bg) / var(--danger-solid) / var(--warning-solid)
 * - Tipografía: var(--font-family)
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  highlightText,
  submessage,
  confirmText,
  cancelText,
  type = 'info', // 'info' | 'load' | 'danger' | 'warning'
  isAlert = false,
  loading = false
}) => {
  const { t } = useTranslation();
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Manejar tecla Escape para cerrar
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus en el botón de confirmación
    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus?.();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const displayTitle = title || (isAlert ? t('common.notice', 'Aviso') : t('common.areYouSure', '¿Estás seguro?'));
  const displayConfirmText = confirmText || t('common.confirm', 'Aceptar');
  const showCancel = !isAlert && cancelText !== null && cancelText !== false;
  const displayCancelText = cancelText || t('common.cancel', 'Cancelar');

  const isDanger = type === 'danger';

  const iconConfig = {
    danger: {
      Icon: Trash2,
      bg: 'var(--danger-soft)',
      border: 'var(--danger-color)',
      color: 'var(--danger-color)',
      btnBg: 'var(--danger-solid, #a95449)',
      btnText: '#ffffff'
    },
    load: {
      Icon: Download,
      bg: 'var(--accent-soft)',
      border: 'var(--accent-color)',
      color: 'var(--accent-color)',
      btnBg: 'var(--btn-bg)',
      btnText: 'var(--btn-text, #ffffff)'
    },
    warning: {
      Icon: AlertTriangle,
      bg: 'var(--warning-soft)',
      border: 'var(--warning-color)',
      color: 'var(--warning-color)',
      btnBg: 'var(--warning-solid, #7a591e)',
      btnText: '#ffffff'
    },
    info: {
      Icon: HelpCircle,
      bg: 'var(--accent-soft)',
      border: 'var(--accent-color)',
      color: 'var(--accent-color)',
      btnBg: 'var(--btn-bg)',
      btnText: 'var(--btn-text, #ffffff)'
    }
  }[type] || {
    Icon: HelpCircle,
    bg: 'var(--accent-soft)',
    border: 'var(--accent-color)',
    color: 'var(--accent-color)',
    btnBg: 'var(--btn-bg)',
    btnText: 'var(--btn-text, #ffffff)'
  };

  const { Icon, bg, border, color, btnBg, btnText } = iconConfig;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="openmun-confirm-overlay"
      onClick={!loading ? onClose : undefined}
    >
      <div
        className="openmun-confirm-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado con Icono */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--border-radius, 6px)',
              backgroundColor: bg,
              border: `1px solid ${border}`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon size={20} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              id="confirm-modal-title"
              style={{
                margin: '0 0 0.25rem 0',
                fontSize: '0.96rem',
                fontWeight: '650',
                color: 'var(--text-color)'
              }}
            >
              {displayTitle}
            </h3>
            <div
              id="confirm-modal-desc"
              style={{
                fontSize: '0.82rem',
                color: 'var(--muted-text, #b9b9b9)',
                lineHeight: 1.45,
                wordBreak: 'break-word'
              }}
            >
              {message}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={t('common.close', 'Cerrar')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: loading ? 'default' : 'pointer',
              padding: '4px',
              borderRadius: 'var(--border-radius, 6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: loading ? 0.5 : 0.85,
              transition: 'opacity 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Destacado opcional */}
        {highlightText && (
          <div
            style={{
              backgroundColor: 'var(--input-bg, rgba(255, 255, 255, 0.05))',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)',
              padding: '0.6rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'var(--text-color)',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <span style={{ opacity: 0.65, fontSize: '0.74rem', fontWeight: 'normal' }}>
              {t('common.file', 'Archivo')}:
            </span>
            <span>{highlightText}</span>
          </div>
        )}

        {/* Submensaje de aviso */}
        {submessage && (
          <div
            style={{
              fontSize: '0.74rem',
              color: isDanger ? 'var(--danger-color)' : 'var(--muted-text)',
              backgroundColor: isDanger ? 'var(--danger-soft)' : 'transparent',
              padding: isDanger ? '0.45rem 0.65rem' : 0,
              borderRadius: 'var(--border-radius, 6px)',
              border: isDanger ? '1px solid var(--danger-color)' : 'none',
              lineHeight: 1.4
            }}
          >
            {submessage}
          </div>
        )}

        {/* Botones de Acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
          {showCancel && (
            <button
              type="button"
              className="openmun-confirm-btn-cancel"
              onClick={onClose}
              disabled={loading}
              style={{
                opacity: loading ? 0.5 : 1
              }}
            >
              {displayCancelText}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            className="openmun-confirm-btn-action"
            onClick={onConfirm}
            disabled={loading}
            style={{
              backgroundColor: btnBg,
              color: btnText,
              opacity: loading ? 0.6 : 1
            }}
          >
            {displayConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;