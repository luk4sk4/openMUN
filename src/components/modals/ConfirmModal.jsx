import React from 'react';
import { AlertTriangle, Download, Trash2, HelpCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  loading = false
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const displayTitle = title || t('common.areYouSure', '¿Estás seguro?');
  const displayConfirmText = confirmText || t('common.confirm', 'Aceptar');
  const displayCancelText = cancelText || t('common.cancel', 'Cancelar');

  const isDanger = type === 'danger';
  const isLoad = type === 'load';

  const iconConfig = {
    danger: {
      Icon: Trash2,
      bg: 'rgba(239, 68, 68, 0.15)',
      border: 'rgba(239, 68, 68, 0.35)',
      color: '#ef4444',
      btnBg: '#dc2626',
      btnHover: '#b91c1c'
    },
    load: {
      Icon: Download,
      bg: 'rgba(59, 130, 246, 0.15)',
      border: 'rgba(59, 130, 246, 0.35)',
      color: '#3b82f6',
      btnBg: '#2563eb',
      btnHover: '#1d4ed8'
    },
    warning: {
      Icon: AlertTriangle,
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.35)',
      color: '#f59e0b',
      btnBg: '#d97706',
      btnHover: '#b45309'
    },
    info: {
      Icon: HelpCircle,
      bg: 'rgba(99, 102, 241, 0.15)',
      border: 'rgba(99, 102, 241, 0.35)',
      color: '#6366f1',
      btnBg: '#4f46e5',
      btnHover: '#4338ca'
    }
  }[type] || {
    Icon: HelpCircle,
    bg: 'rgba(99, 102, 241, 0.15)',
    border: 'rgba(99, 102, 241, 0.35)',
    color: '#6366f1',
    btnBg: '#4f46e5',
    btnHover: '#4338ca'
  };

  const { Icon, bg, border, color, btnBg } = iconConfig;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--card-bg, #161a23)',
          border: '1px solid var(--subborder-color, rgba(255, 255, 255, 0.12))',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '430px',
          padding: '1.4rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          color: 'var(--text-color, #ffffff)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          transform: 'scale(1)',
          animation: 'modalPop 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado con Icono */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: bg,
              border: `1px solid ${border}`,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon size={22} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', fontWeight: '700' }}>
              {displayTitle}
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--muted-text, #94a3b8)', lineHeight: 1.45 }}>
              {message}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text, #94a3b8)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Destacado de Archivo o Elemento */}
        {highlightText && (
          <div
            style={{
              backgroundColor: 'var(--card-sub-bg, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--subborder-color, rgba(255, 255, 255, 0.08))',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: '600',
              color: 'var(--text-color, #ffffff)',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}
          >
            <span style={{ opacity: 0.6, fontSize: '0.75rem', fontWeight: 'normal' }}>{t('common.file', 'Archivo')}:</span>
            <span>{highlightText}</span>
          </div>
        )}

        {/* Submensaje de aviso */}
        {submessage && (
          <div
            style={{
              fontSize: '0.74rem',
              color: isDanger ? '#f87171' : 'var(--muted-text, #94a3b8)',
              backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
              padding: isDanger ? '0.4rem 0.6rem' : 0,
              borderRadius: '6px',
              border: isDanger ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
            }}
          >
            {submessage}
          </div>
        )}

        {/* Botones de Acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color, rgba(255, 255, 255, 0.15))',
              borderRadius: '7px',
              color: 'var(--text-color, #ffffff)',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {displayCancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              backgroundColor: btnBg,
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              padding: '7px 16px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: `0 4px 12px ${bg}`,
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
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
