import React, { useState, useRef } from 'react';
import { Minimize2, ChevronRight, Landmark, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TAB_CONFIG } from '../../utils/dashboardTabs';

const FullscreenMenu = ({ activeTab, setActiveTab, tabs, toggleMaximize, isLight, nombreComite }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const startClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  const cancelClose = () => {
    clearTimeout(closeTimer.current);
  };

  const ActiveIcon = TAB_CONFIG[activeTab]?.Icon || Home;
  const currentTabLabel = t(TAB_CONFIG[activeTab]?.labelKey, TAB_CONFIG[activeTab]?.label || activeTab);

  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.4rem',
        pointerEvents: 'none' // el contenedor nunca intercepta eventos
      }}
    >
      {/* Botón principal — único activador del hover */}
      <div
        onMouseEnter={() => { cancelClose(); setOpen(true); }}
        onMouseLeave={startClose}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          backgroundColor: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(15,15,18,0.95)',
          border: `1px solid ${open ? 'var(--btn-bg)' : (isLight ? '#e2e8f0' : '#27272a')}`,
          borderRadius: '8px',
          padding: '0.4rem 0.65rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.45)',
          cursor: 'default',
          transition: 'border-color 0.2s ease',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'auto' // solo la pastilla captura eventos
        }}
      >
        <Minimize2 size={15} color={isLight ? '#0f172a' : '#ffffff'} />
        <ActiveIcon size={14} color={isLight ? '#0f172a' : '#ffffff'} />
        <span style={{
          fontSize: '0.72rem',
          fontWeight: '700',
          color: isLight ? '#0f172a' : '#ffffff',
          transition: 'color 0.2s ease'
        }}>
          {currentTabLabel}
        </span>
        <ChevronRight
          size={13}
          color={isLight ? '#64748b' : '#71717a'}
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        />
      </div>

      {/* Panel desplegable */}
      <div
        onMouseEnter={cancelClose}
        onMouseLeave={startClose}
        style={{
          backgroundColor: isLight ? 'rgba(255,255,255,0.97)' : 'rgba(15,15,18,0.97)',
          border: `1px solid ${isLight ? '#cbd5e1' : '#3f3f46'}`,
          borderRadius: '10px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          overflow: 'hidden',
          minWidth: '180px',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.97)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
          pointerEvents: open ? 'auto' : 'none'
        }}
      >
        {/* Nombre del comité */}
        {nombreComite && (
          <div style={{
            padding: '0.55rem 0.85rem',
            borderBottom: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`,
            fontSize: '0.7rem',
            fontWeight: '800',
            color: 'var(--text-color)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Landmark size={13} />
            <span>{nombreComite}</span>
          </div>
        )}

        {/* Tabs */}
        <div style={{ padding: '0.35rem' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            const TabIcon = TAB_CONFIG[tab]?.Icon || Home;
            const tabLabel = t(TAB_CONFIG[tab]?.labelKey, TAB_CONFIG[tab]?.label || tab);
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--btn-bg)' : 'transparent',
                  color: isActive ? 'var(--btn-text)' : 'var(--text-color)',
                  fontWeight: isActive ? '800' : '500',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.12s ease'
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = isLight ? '#f1f5f9' : '#18181b'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <TabIcon size={14} />
                <span>{tabLabel}</span>
                {isActive && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', opacity: 0.7 }}>◀</span>}
              </button>
            );
          })}
        </div>

        {/* Divider + Salir de pantalla completa */}
        <div style={{ borderTop: `1px solid ${isLight ? '#e2e8f0' : '#27272a'}`, padding: '0.35rem' }}>
          <button
            onClick={() => { toggleMaximize(); setOpen(false); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#ef4444',
              fontWeight: '700',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.12s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = isLight ? '#fee2e2' : '#271212'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Minimize2 size={14} />
            {t('header.exitFullscreen', 'Salir de Pantalla Completa')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullscreenMenu;
