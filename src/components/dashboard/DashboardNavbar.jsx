import React, { useState, useEffect, useRef, useId } from 'react';
import { Radio, Moon, Sun, Maximize2, Eye, Search, Megaphone, LayoutGrid, ToggleLeft, ToggleRight, Menu, Building2, MessageSquare, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import SessionMenuDropdown from './SessionMenuDropdown';
import { TAB_CONFIG } from '../../utils/dashboardTabs';
import DashboardSubheader from './DashboardSubheader';
import conferenceService from '../../services/conferenceService';
import useTabIndicator from '../../hooks/useTabIndicator';

const DashboardNavbar = ({
  nombreComite,
  agendaSesion,
  tipoSesion,
  cambiarTipoSesion,
  isModular,
  toggleModulation,
  isSidebarOpen,
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
  speakingRequests = [],
  enmiendasPropuestas = [],
  roomSettings,
  roomId,
  unreadNotesCount = 0,
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
  isCloudModalOpen,
  setIsCloudModalOpen,
  conectarGoogleDrive,
  desconectarGoogleDrive,
  sincronizarDriveManual,
  borrarDatosLocales,
  addToast
}) => {
  const { t } = useTranslation();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const sidebarEdgeRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const sidebarId = useId();
  const { tabsNavRef, indicatorStyle } = useTabIndicator(activeTab, tabs);



  const isLiveActive = connectionStatus === 'host_active';
  const totalSolicitudes = (speakingRequests?.length || 0) + (enmiendasPropuestas?.length || 0);

  // Cerrar el panel al cambiar de pestaña
  useEffect(() => {
    setIsToolsOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (isToolsOpen) sidebarEdgeRef.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [isToolsOpen]);

  // Cerrar al pulsar Escape o al hacer clic fuera
  useEffect(() => {
    if (!isToolsOpen) return;

    const handleClickOutside = (event) => {
      if (
        sidebarEdgeRef.current && !sidebarEdgeRef.current.contains(event.target) &&
        toggleBtnRef.current && !toggleBtnRef.current.contains(event.target)
      ) {
        setIsToolsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !sessionMenuOpen) {
        setIsToolsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isToolsOpen, sessionMenuOpen]);

  return (
    <>
    <header className="dashboard-navigation">
      <div className="dashboard-toolbar">
        <button className="dashboard-brand" onClick={() => setActiveTab('HOME')} title={t('header.homeTooltip', 'OpenMUN - Ir a Inicio')}>
          <OpenMunLogo height={28} isLight={isLight} />
        </button>
        <div className="dashboard-nav-row">
          <nav
            ref={tabsNavRef}
            className="dashboard-tabs-scroll"
            aria-label={t('header.navigation', 'Navegación del comité')}
          >
            {tabs.map(tab => {
              const TabIcon = TAB_CONFIG[tab]?.Icon;
              const label = t(TAB_CONFIG[tab]?.labelKey, TAB_CONFIG[tab]?.label || tab);
              return <button key={tab} onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? 'page' : undefined}>
                {TabIcon && <TabIcon size={16} />}<span>{label}</span>
              </button>;
            })}
            <span
              className="dashboard-tab-indicator"
              style={{
                transform: `translateX(${indicatorStyle.left}px)`,
                width: `${indicatorStyle.width}px`,
                opacity: indicatorStyle.opacity
              }}
              aria-hidden="true"
            />
          </nav>
          <div className="dashboard-toolbar-right">
            {isModular && (
            <button
              type="button"
              className={`dashboard-sidebar-toggle dashboard-widgets-toggle${isSidebarOpen ? ' is-active' : ''}`}
              onClick={() => {
                setIsToolsOpen(false);
                setIsSidebarOpen(prev => !prev);
              }}
              aria-label={t('header.widgetsTooltip', 'Abrir Gestor de Widgets')}
              aria-expanded={isSidebarOpen}
              title={t('header.widgetsTooltip', 'Abrir Gestor de Widgets')}
            >
              <LayoutGrid size={18} />
            </button>
          )}
          <button className="dashboard-modulation" role="switch" aria-checked={isModular} onClick={toggleModulation}
              title={isModular ? t('header.fixedMode', 'Volver a la vista fija') : t('header.modularMode', 'Personalizar los módulos')}>
              {isModular ? <ToggleRight size={23} /> : <ToggleLeft size={23} />}<span>{t('header.modulation')}</span>
            </button>
            <button
              ref={toggleBtnRef}
              type="button"
              className={`dashboard-sidebar-toggle${isToolsOpen ? ' is-active' : ''}`}
              onClick={() => setIsToolsOpen(prev => !prev)}
              aria-label={t('header.toggleTools', 'Abrir o cerrar herramientas del comité')}
              aria-expanded={isToolsOpen}
              aria-controls={sidebarId}
              title={t('header.tools', 'Herramientas del comité')}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>
      {activeTab !== 'HOME' && <DashboardSubheader
        nombreComite={nombreComite} agendaSesion={agendaSesion}
        tipoSesion={tipoSesion} cambiarTipoSesion={cambiarTipoSesion}
      />}
    </header>
    <div
      ref={sidebarEdgeRef}
      className={`dashboard-sidebar-edge${activeTab !== 'HOME' ? ' has-context' : ''}${sessionMenuOpen || isToolsOpen ? ' is-open' : ''}`}
    >
      <aside id={sidebarId} className="dashboard-sidebar" aria-label={t('header.tools', 'Herramientas del comité')}>
        <div className="dashboard-toolbar-actions">
          <button onClick={() => { setIsToolsOpen(false); openCommandPalette(); }} title={t('palette.buttonTooltip', 'Buscar comandos (Ctrl+K)')}>
            <Search size={16} /><span>{t('header.search', 'Buscar')}</span><kbd>Ctrl K</kbd>
          </button>
          {isModular && <button onClick={() => { setIsToolsOpen(false); setIsSidebarOpen(prev => !prev); }} title={t('header.widgetsTooltip', 'Abrir Gestor de Widgets')}>
            <LayoutGrid size={16} /><span>{t('header.widgets', 'Widgets')}</span>
          </button>}
        </div>
        <div className="dashboard-toolbar-actions dashboard-session-actions">
          <button onClick={() => { setIsToolsOpen(false); openLiveModal(); }} className={isLiveActive ? 'is-live' : ''}
            title={isLiveActive ? `${roomSettings?.privacyMode === 'hidden' ? t('liveSession.live', 'En vivo') : roomId || ''} · ${connectedPeers?.length || 0} conectados` : t('liveSession.title', 'Sesión en vivo')}>
            <Radio size={16} /><span>{t('liveSession.live', 'En vivo')}{isLiveActive ? ` (${connectedPeers?.length || 0})` : ''}</span>
            {speakingRequests?.length > 0 && <span className="dashboard-notification-dot" />}
          </button>
          <button onClick={() => { setIsToolsOpen(false); openAvisosModal(); }} title={t('avisos.navTitle', 'Mensajería y avisos')}>
            <Megaphone size={16} /><span>{t('header.announcements', 'Mensajería')}</span>
            {unreadNotesCount > 0 && <b className="dashboard-unread">{unreadNotesCount}</b>}
          </button>
          <button
            onClick={() => {
              setIsToolsOpen(false);
              openLiveModal('SOLICITUDES');
            }}
            title={t('header.requestsTooltip', 'Solicitudes de delegaciones y mociones pendientes')}
          >
            <MessageSquare size={16} /><span>{t('header.requests', 'Solicitudes')}</span>
            {totalSolicitudes > 0 && <b className="dashboard-unread">{totalSolicitudes}</b>}
          </button>
          <button
            onClick={() => {
              setIsToolsOpen(false);
              if (typeof window !== 'undefined') {
                window.open(`${window.location.origin}${window.location.pathname}?mode=secretariat&local=true`, '_blank');
              }
            }}
            title={t('header.localSecretariatTooltip', 'Abrir Secretaría Local en una nueva pestaña (segunda pantalla o pajes)')}
          >
            <Layers size={16} /><span>{t('header.localSecretariat', 'Secretaría Local')}</span>
          </button>
          <SessionMenuDropdown
            placement="sidebar"
            sessionMenuOpen={sessionMenuOpen} setSessionMenuOpen={setSessionMenuOpen}
            isLight={isLight} isDriveLinked={isDriveLinked} driveSyncStatus={driveSyncStatus}
            driveUser={driveUser} driveFileName={driveFileName} fileInputRef={fileInputRef}
            setIsExportModalOpen={setIsExportModalOpen} setIsDriveModalOpen={setIsDriveModalOpen}
            isCloudModalOpen={isCloudModalOpen} setIsCloudModalOpen={setIsCloudModalOpen}
            conectarGoogleDrive={conectarGoogleDrive} desconectarGoogleDrive={desconectarGoogleDrive}
            sincronizarDriveManual={sincronizarDriveManual} borrarDatosLocales={borrarDatosLocales} addToast={addToast}
          />
          <button
            onClick={() => {
              setIsToolsOpen(false);
              const activeConf = conferenceService.obtenerSesionActiva();
              window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
                detail: {
                  view: 'conference',
                  confId: activeConf?.id || '',
                  mode: 'explore'
                }
              }));
            }}
            title={t('header.conferencesTooltip', 'Ir a Conferencias')}
          >
            <Building2 size={16} /><span>{t('header.conferences', 'Conferencias')}</span>
          </button>
          <div className="dashboard-utilities">
            <button onClick={toggleThemeMode} title={isLight ? t('header.darkMode', 'Cambiar a modo oscuro') : t('header.lightMode', 'Cambiar a modo claro')}>
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button onClick={toggleMaximize} title={t('header.fullscreen', 'Pantalla completa (F11)')}><Maximize2 size={16} /></button>
            <button onClick={() => { setIsToolsOpen(false); setIsAccessOpen(true); }} title={t('accessibility.title', 'Accesibilidad y tema')}><Eye size={16} /></button>
          </div>
          <LanguageSelector showIcon={false} />
        </div>
      </aside>
    </div>
    </>
  );
};

export default DashboardNavbar;
