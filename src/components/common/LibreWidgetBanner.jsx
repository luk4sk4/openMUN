import React from 'react';
import { LayoutGrid, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LibreWidgetBanner({ onClose, isLight = false }) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'relative',
        zIndex: 895,
        backgroundColor: isLight ? '#eff6ff' : 'rgba(30, 58, 138, 0.25)',
        borderBottom: `1px solid ${isLight ? '#bfdbfe' : 'rgba(59, 130, 246, 0.3)'}`,
        padding: '0.4rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        fontSize: '0.8rem',
        color: isLight ? '#1e40af' : '#93c5fd',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0 }}>
        <LayoutGrid size={15} style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 500 }}>
          {t(
            'home.libreWidgetBanner',
            '¡Usa la pestaña de widgets arriba a la izquierda para añadir o eliminar los widgets que desees!'
          )}
        </span>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'currentColor',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
          opacity: 0.8,
          transition: 'opacity 0.15s ease, background-color 0.15s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.opacity = '0.8';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title={t('common.close', 'Cerrar')}
        aria-label="Cerrar banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}
