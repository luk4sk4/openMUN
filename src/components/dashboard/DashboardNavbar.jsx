import React from 'react';
import { Radio, Moon, Sun, Maximize2, Eye, Search, Megaphone, LayoutGrid } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import SessionMenuDropdown from './SessionMenuDropdown';
import { TAB_CONFIG } from '../../utils/dashboardTabs';
import useTopBarOverflow from '../../hooks/useTopBarOverflow';

const DashboardNavbar = ({
  setIsSidebarOpen,
  activeTab,
  setActiveTab,
  tabs,
  isLight,
  toggleThemeMode,
  toggleMaximize,
  setIsAccessOpen,
  openCommandPalette,
  openAvisosModal,
  // Props P2P
  openLiveModal,
  connectionStatus,
  connectedPeers,
  speakingRequests,
  roomSettings,
  roomId,
  // Props Session Dropdown
  sessionMenuOpen,
  setSessionMenuOpen,
  isDriveLinked,
  driveSyncStatus,
  driveUser,
  driveFileName,
  fileInputRef,
  setIsExportModalOpen,
  setIsDriveModalOpen,
  conectarGoogleDrive,
  desconectarGoogleDrive,
  sincronizarDriveManual,
  borrarDatosLocales,
  addToast
}) => {
  const { t } = useTranslation();

  const isLiveActive = connectionStatus === 'host_active';

  // Hook de detección dinámica de overflow y compactación adaptativa de la barra superior
  const { containerRef, isLogoCompact, isExtraCompact } = useTopBarOverflow([tabs, activeTab, roomId, connectionStatus]);

  return (
    <nav
      ref={containerRef}
      style={{
        position: 'relative',
        zIndex: 1000,
        display: 'flex',
        padding: isExtraCompact ? '0.4rem 0.75rem' : '0.75rem 1.5rem',
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--subborder-color)',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isExtraCompact ? '0.4rem' : '0.75rem',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        transition: 'background-color 0.3s ease, border-color 0.3s ease',
        userSelect: 'none'
      }}
    >
      {/* ── ZONA 1 (IZQUIERDA): Marca OpenMUN + Herramientas de Trabajo (Comandos & Widgets) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isExtraCompact ? '0.35rem' : '0.6rem', flexShrink: 0 }}>
        {/* Logo OpenMUN como ancla fija a la izquierda: se reduce a solo icono si hay overflow */}
        <div
          onClick={() => setActiveTab('HOME')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'opacity 0.15s ease'
          }}
          title={t('header.homeTooltip', 'OpenMUN - Ir a Inicio')}
        >
          <OpenMunLogo height={30} isLight={isLight} showText={!isLogoCompact} />
        </div>

        {/* Separador vertical sutil */}
        <div style={{
          width: '1px',
          height: '18px',
          backgroundColor: 'var(--subborder-color)',
          opacity: 0.8
        }} />

        {/* Grupo de Herramientas: Comandos (⌘K) y Gestor de Widgets */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--subborder-color)',
          borderRadius: '7px',
          padding: '2px',
          gap: '2px'
        }}>
          {/* Botón Command Palette (Ctrl+K / ⌘K) */}
          <button
            onClick={openCommandPalette}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.3rem 0.5rem',
              borderRadius: '5px',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              fontWeight: '500',
              transition: 'background-color 0.15s ease'
            }}
            title={t('palette.buttonTooltip', 'Comandos y Acciones Rápidas (Ctrl+K)')}
          >
            <Search size={12} style={{ opacity: 0.7 }} />
            {!isExtraCompact && <span style={{ opacity: 0.85 }}>{t('header.search', 'Buscar')}</span>}
            <kbd
              style={{
                fontSize: '0.62rem',
                padding: '1px 4px',
                borderRadius: '3px',
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--subborder-color)',
                color: 'var(--muted-text)',
                fontWeight: '700'
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Micro Separador */}
          <div style={{ width: '1px', height: '12px', backgroundColor: 'var(--subborder-color)' }} />

          {/* Botón Widgets (Gestor de Cuadrícula) */}
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              padding: '0.3rem 0.5rem',
              borderRadius: '5px',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              transition: 'background-color 0.15s ease'
            }}
            title={t('header.widgetsTooltip', 'Abrir Gestor de Widgets')}
          >
            <LayoutGrid size={13} style={{ opacity: 0.8 }} />
            {!isExtraCompact && <span>{t('header.widgets', 'Widgets')}</span>}
          </button>
        </div>
      </div>

      {/* ── ZONA 2 (CENTRO): Pestañas de Navegación Segmentadas ── */}
      <div
        className="dashboard-tabs-scroll"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          backgroundColor: 'var(--subnav-bg)',
          padding: '2px',
          borderRadius: '8px',
          border: '1px solid var(--subborder-color)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
          transition: 'background-color 0.3s ease',
          flexShrink: 1,
          minWidth: 0,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {tabs.map(tab => {
          const TabIcon = TAB_CONFIG[tab]?.Icon;
          const label = t(TAB_CONFIG[tab]?.labelKey, TAB_CONFIG[tab]?.label || tab);
          const isActiva = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: isExtraCompact ? '0.24rem 0.45rem' : '0.28rem 0.55rem',
                backgroundColor: isActiva ? 'var(--btn-bg)' : 'transparent',
                color: isActiva ? 'var(--btn-text)' : 'var(--muted-text)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: isActiva ? '700' : '500',
                fontSize: isExtraCompact ? '0.72rem' : '0.77rem',
                letterSpacing: '0.01em',
                transition: 'all 0.15s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                whiteSpace: 'nowrap',
                boxShadow: isActiva ? '0 1px 3px rgba(0,0,0,0.25)' : 'none'
              }}
            >
              {TabIcon && <TabIcon size={13} />}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── ZONA 3 (DERECHA): Grupos de Conectividad, Sesión, Utilidades y Configuración ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isExtraCompact ? '0.35rem' : '0.5rem', justifyContent: 'flex-end', flexShrink: 0 }}>
        {/* Grupo 1: Sala en Vivo & Avisos Oficiales */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${isLiveActive ? 'rgba(34, 197, 94, 0.4)' : 'var(--subborder-color)'}`,
          borderRadius: '7px',
          padding: '2px',
          gap: '2px',
          transition: 'all 0.2s ease'
        }}>
          {/* Botón Sesión en Vivo P2P */}
          <button
            onClick={openLiveModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: isLiveActive ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '5px',
              color: isLiveActive ? '#22c55e' : 'var(--text-color)',
              padding: '0.3rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
            title={t('liveSession.title', 'Sesión en Vivo')}
          >
            {(!isExtraCompact || isLiveActive) && (
              <span>
                {isLiveActive
                  ? (roomSettings?.privacyMode === 'hidden'
                    ? (isExtraCompact ? `(${connectedPeers?.length || 0})` : `${t('liveSession.live', 'En Vivo')} (${connectedPeers?.length || 0})`)
                    : (isExtraCompact ? `${roomId || 'Live'} (${connectedPeers?.length || 0})` : `${roomId || t('liveSession.live', 'En Vivo')} (${connectedPeers?.length || 0})`))
                  : t('liveSession.live', 'En Vivo')}
              </span>
            )}
            {speakingRequests?.length > 0 && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                position: 'absolute',
                top: '2px',
                right: '2px',
                boxShadow: '0 0 4px #ef4444'
              }} />
            )}
          </button>

          {/* Micro Separador */}
          <div style={{ width: '1px', height: '12px', backgroundColor: 'var(--subborder-color)' }} />

          {/* Botón Centro de Avisos (Mesa / Staff / Conferencia) */}
          <button
            onClick={openAvisosModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '5px',
              color: 'var(--text-color)',
              padding: '0.3rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Centro de Avisos & Comunicados Oficiales"
          >
            <Megaphone size={12} color="#3b82f6" />
            {!isExtraCompact && <span>{t('header.announcements', 'Avisos')}</span>}
          </button>
        </div>

        {/* Grupo 2: Menú Desplegable Unificado de Sesión */}
        <SessionMenuDropdown
          sessionMenuOpen={sessionMenuOpen}
          setSessionMenuOpen={setSessionMenuOpen}
          isLight={isLight}
          isDriveLinked={isDriveLinked}
          driveSyncStatus={driveSyncStatus}
          driveUser={driveUser}
          driveFileName={driveFileName}
          fileInputRef={fileInputRef}
          setIsExportModalOpen={setIsExportModalOpen}
          setIsDriveModalOpen={setIsDriveModalOpen}
          conectarGoogleDrive={conectarGoogleDrive}
          desconectarGoogleDrive={desconectarGoogleDrive}
          sincronizarDriveManual={sincronizarDriveManual}
          borrarDatosLocales={borrarDatosLocales}
          addToast={addToast}
        />

        {/* Grupo 3: Barra de Utilidades del Sistema (Tema, Maximizar, Accesibilidad) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--subborder-color)',
          borderRadius: '8px',
          padding: '2px',
          gap: '1px'
        }}>
          {/* Botón Modo Claro / Oscuro */}
          <button
            onClick={toggleThemeMode}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 7px',
              opacity: 0.85,
              transition: 'all 0.15s ease'
            }}
            title={isLight ? t('header.darkMode', "Cambiar a Modo Oscuro") : t('header.lightMode', "Cambiar a Modo Claro")}
          >
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* Micro Separador */}
          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--subborder-color)' }} />

          {/* Botón Pantalla Completa */}
          <button
            onClick={toggleMaximize}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 7px',
              opacity: 0.85,
              transition: 'all 0.15s ease'
            }}
            title={t('header.fullscreen', "Maximizar / Pantalla Completa (F11)")}
          >
            <Maximize2 size={15} />
          </button>

          {/* Micro Separador */}
          <div style={{ width: '1px', height: '14px', backgroundColor: 'var(--subborder-color)' }} />

          {/* Botón Accesibilidad */}
          <button
            onClick={() => setIsAccessOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--text-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 7px',
              opacity: 0.85,
              transition: 'all 0.15s ease'
            }}
            title={t('accessibility.title', "Accesibilidad y Tema")}
          >
            <Eye size={15} />
          </button>
        </div>

        {/* Grupo 4: Selector de Idioma */}
        <LanguageSelector showIcon={false} />
      </div>
    </nav>
  );
};

export default DashboardNavbar;
