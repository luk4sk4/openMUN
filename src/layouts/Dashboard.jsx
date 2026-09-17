import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { lazyWithRetry } from '../utils/lazyWithRetry';

// Modales y Componentes Comunes (Lazy loaded para agilizar carga inicial)
const AccessibilityModal = lazyWithRetry(() => import('../components/modals/AccessibilityModal'), 'AccessibilityModal');
const LiveSessionModal = lazyWithRetry(() => import('../components/modals/LiveSessionModal'), 'LiveSessionModal');
const DriveSessionsModal = lazyWithRetry(() => import('../components/modals/DriveSessionsModal'), 'DriveSessionsModal');
const ExportSessionModal = lazyWithRetry(() => import('../components/modals/ExportSessionModal'), 'ExportSessionModal');
const CommandPaletteModal = lazyWithRetry(() => import('../components/modals/CommandPaletteModal'), 'CommandPaletteModal');
const QuickAddCountryModal = lazyWithRetry(() => import('../components/modals/QuickAddCountryModal'), 'QuickAddCountryModal');
const AvisosModal = lazyWithRetry(() => import('../components/modals/AvisosModal'), 'AvisosModal');
const WidgetSidebar = lazyWithRetry(() => import('../components/panels/WidgetSidebar'), 'WidgetSidebar');


import ConferenceBanner from '../components/common/ConferenceBanner';
import PermanentCrisisBanner from '../components/common/PermanentCrisisBanner';
import LibreWidgetBanner from '../components/common/LibreWidgetBanner';
import { useToast } from '../context/ToastContext';
import HomePage from '../components/pages/HomePage';

// Componentes modulares del Dashboard
import FullscreenMenu from '../components/dashboard/FullscreenMenu';
import DashboardNavbar from '../components/dashboard/DashboardNavbar';
import DashboardSubheader from '../components/dashboard/DashboardSubheader';
import WidgetGridBoard from '../components/dashboard/WidgetGridBoard';

// Contextos
import { useSession } from '../context/SessionContext';
import { useP2P } from '../context/P2PContext';
import { useAccessibility } from '../context/AccessibilityContext';
import conferenceService from '../services/conferenceService';

// Utilidades y Hooks personalizados
import { validateSessionJSON } from '../utils/sessionValidator';
import { TAB_CONFIG, DASHBOARD_TABS, updateDocumentTitleForTab } from '../utils/dashboardTabs';
import { useFullscreen } from '../hooks/useFullscreen';
import { useDashboardP2P } from '../hooks/useDashboardP2P';
import { useGridLayout } from '../hooks/useGridLayout';
import { useGlobalHotkeys } from '../hooks/useGlobalHotkeys';

const Dashboard = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  // Estados de navegación y UI
  const [activeTab, setActiveTab] = useState('HOME');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLibreBanner, setShowLibreBanner] = useState(true);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickCountryOpen, setIsQuickCountryOpen] = useState(false);
  const [isAvisosModalOpen, setIsAvisosModalOpen] = useState(false);
  const { addToast } = useToast();

  // Contextos globales
  const session = useSession();
  const p2p = useP2P();
  const {
    config,
    setConfig,
    isLight,
    toggleThemeMode,
    isAccessOpen,
    setIsAccessOpen
  } = useAccessibility();

  // Hook de atajos de teclado globales
  useGlobalHotkeys({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(prev => !prev),
    onOpenQuickAddCountry: () => setIsQuickCountryOpen(prev => !prev),
    onSwitchTab: (tab) => setActiveTab(tab),
    activeTab
  });

  // Hook de pantalla completa
  const { isMaximized, toggleMaximize } = useFullscreen();

  // Hook de sincronización y handlers P2P
  useDashboardP2P({ session, p2p });

  // Hook de cuadrícula de widgets (Drag & Drop, Resize, Toggles, Dimensiones)
  const {
    boardRef,
    boardW,
    widgets,
    cellW,
    cellH,
    maxRowUsed,
    boardHeight,
    focusedWidgetId,
    setFocusedWidgetId,
    activeInteraction,
    handleStartDrag,
    handleStartResize,
    handleToggleWidget,
    handleActivateAll,
    handleDeactivateAll,
    handleResetDefault,
    handleApplyTemplate,
    removeWidget
  } = useGridLayout({ activeTab, config, setConfig });

  // Actualización dinámica del título del documento
  useEffect(() => {
    updateDocumentTitleForTab(activeTab);
  }, [activeTab]);

  // Verificar si hay navegación pendiente (ej. entrar como Mesa desde Conferencia)
  useEffect(() => {
    try {
      const pendingNav = localStorage.getItem('openmun_pending_nav_tab');
      if (pendingNav) {
        localStorage.removeItem('openmun_pending_nav_tab');
        if (TAB_CONFIG[pendingNav]) {
          setActiveTab(pendingNav);
        }
      }
    } catch (e) {
      console.error('Error procesando navegación pendiente:', e);
    }
  }, []);

  // Manejador de importación de archivo JSON de sesión
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawContent = event.target.result;
        const validation = validateSessionJSON(rawContent);

        if (!validation.valid) {
          if (validation.errorType === 'SYNTAX_ERROR') {
            addToast({
              type: 'error',
              title: t('toast.invalidJsonSyntaxTitle', 'Error de Sintaxis JSON'),
              message: `${t('toast.invalidJsonSyntaxDesc', 'El archivo no contiene un JSON válido o está corrupto.')} (${validation.message})`,
              duration: 5000
            });
          } else {
            addToast({
              type: 'error',
              title: t('toast.invalidSessionFormatTitle', 'Estructura de Sesión Inválida'),
              message: validation.message || t('toast.invalidSessionFormatDesc', 'El archivo no contiene una estructura reconocida de sesión de OpenMUN.'),
              duration: 5000
            });
          }
          return;
        }

        const ok = session.cargarSesionJSON(validation.data, (newConfig) => {
          if (newConfig) {
            setConfig(newConfig);
          }
        });

        if (ok) {
          const cfg = validation.data.config || validation.data.openmun_config || (validation.data.localStorageSnapshot && validation.data.localStorageSnapshot.openmun_config);
          if (cfg) {
            try {
              const parsedCfg = typeof cfg === 'string' ? JSON.parse(cfg) : cfg;
              setConfig(parsedCfg);
            } catch (err) {
              console.error('Error parseando config importada:', err);
            }
          }
          addToast({
            type: 'success',
            title: t('toast.sessionLoadedTitle', '¡Sesión Cargada con Éxito!'),
            message: t('toast.sessionLoadedDesc', 'Todos los datos de la sesión han sido procesados y restaurados correctamente.'),
            duration: 4000
          });
        } else {
          addToast({
            type: 'error',
            title: t('toast.importErrorTitle', 'Error al Importar Sesión'),
            message: 'No se pudo aplicar la sesión.',
            duration: 5000
          });
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: t('toast.importErrorTitle', 'Error al Leer Archivo'),
          message: err.message,
          duration: 5000
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Estilos del tema base
  const themeStyles = {
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontFamily: 'var(--font-family)',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    transition: 'background-color 0.25s ease, color 0.25s ease'
  };

  return (
    <div style={themeStyles}>
      {/* File Input Oculto para Cargar Sesión */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Modales y Notificaciones */}
      <Suspense fallback={null}>
        <AccessibilityModal
          isOpen={isAccessOpen}
          onClose={() => setIsAccessOpen(false)}
          config={config}
          setConfig={setConfig}
        />
        <LiveSessionModal
          isOpen={p2p.isLiveModalOpen}
          onClose={p2p.closeLiveModal}
          isLight={isLight}
        />
        <DriveSessionsModal
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
        />
        <ExportSessionModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openLiveModal={p2p.openLiveModal}
          openExportModal={() => setIsExportModalOpen(true)}
          openAccessModal={() => setIsAccessOpen(true)}
          openQuickAddCountry={() => setIsQuickCountryOpen(true)}
          openAvisosModal={() => setIsAvisosModalOpen(true)}
        />
        <AvisosModal
          isOpen={isAvisosModalOpen}
          onClose={() => setIsAvisosModalOpen(false)}
          isLight={isLight}
          currentRole="chair"
          currentComiteId={(typeof window !== 'undefined' ? localStorage.getItem('openmun_current_comite_id') : null) || p2p.roomId || null}
          currentComiteNombre={session.nombreComite}
          conferenciaId={(typeof window !== 'undefined' ? localStorage.getItem('openmun_current_conf_id') : null) || conferenceService.obtenerSesionActiva()?.id || (p2p.roomId ? (p2p.roomId.includes('_') ? p2p.roomId.split('_')[0] : p2p.roomId) : null)}
        />
        <QuickAddCountryModal
          isOpen={isQuickCountryOpen}
          onClose={() => setIsQuickCountryOpen(false)}
          activeTab={activeTab}
        />
        <WidgetSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentLayout={widgets}
          activeTab={activeTab}
          onToggleWidget={handleToggleWidget}
          onActivateAll={handleActivateAll}
          onDeactivateAll={handleDeactivateAll}
          onResetDefault={handleResetDefault}
          onApplyTemplate={handleApplyTemplate}
        />
      </Suspense>

      {/* Menú flotante en pantalla completa */}
      {isMaximized && (
        <FullscreenMenu
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={DASHBOARD_TABS}
          toggleMaximize={toggleMaximize}
          isLight={isLight}
          nombreComite={session.nombreComite}
        />
      )}

      {/* Barra de Navegación y Subheader Superior */}
      {!isMaximized && (
        <>
          <DashboardNavbar
            setIsSidebarOpen={setIsSidebarOpen}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={DASHBOARD_TABS}
            isLight={isLight}
            toggleThemeMode={toggleThemeMode}
            toggleMaximize={toggleMaximize}
            setIsAccessOpen={setIsAccessOpen}
            openCommandPalette={() => setIsCommandPaletteOpen(true)}
            openQuickAddCountry={() => setIsQuickCountryOpen(true)}
            openAvisosModal={() => setIsAvisosModalOpen(true)}
            openLiveModal={p2p.openLiveModal}
            connectionStatus={p2p.connectionStatus}
            connectedPeers={p2p.connectedPeers}
            speakingRequests={p2p.speakingRequests}
            roomSettings={p2p.roomSettings}
            roomId={p2p.roomId}
            sessionMenuOpen={sessionMenuOpen}
            setSessionMenuOpen={setSessionMenuOpen}
            isDriveLinked={session.isDriveLinked}
            driveSyncStatus={session.driveSyncStatus}
            driveUser={session.driveUser}
            driveFileName={session.driveFileName}
            fileInputRef={fileInputRef}
            setIsExportModalOpen={setIsExportModalOpen}
            setIsDriveModalOpen={setIsDriveModalOpen}
            conectarGoogleDrive={session.conectarGoogleDrive}
            desconectarGoogleDrive={session.desconectarGoogleDrive}
            sincronizarDriveManual={session.sincronizarDriveManual}
            borrarDatosLocales={session.borrarDatosLocales}
            addToast={addToast}
          />

          {/* Banner de Avisos Oficiales de la Conferencia y Sala */}
          <ConferenceBanner
            isLight={isLight}
            role="chair"
            comiteId={(typeof window !== 'undefined' ? localStorage.getItem('openmun_current_comite_id') : null) || p2p.roomId || null}
          />

          {/* Banner Permanente de Alerta de Crisis Activa */}
          <PermanentCrisisBanner isLight={isLight} />

          {/* Banner Informativo de pestaña libre */}
          {activeTab === 'LIBRE' && showLibreBanner && (
            <LibreWidgetBanner
              isLight={isLight}
              onClose={() => setShowLibreBanner(false)}
            />
          )}

          {/* Subheader Persistente de Comité + Agenda + Estado de Sesión (Fuera de HOME) */}
          {activeTab !== 'HOME' && (
            <DashboardSubheader
              nombreComite={session.nombreComite}
              agendaSesion={session.agendaSesion}
              tipoSesion={session.tipoSesion}
              cambiarTipoSesion={session.cambiarTipoSesion}
              isLight={isLight}
            />
          )}
        </>
      )}

      {/* Vista Principal (HOME o Cuadrícula de Widgets) */}
      {activeTab === 'HOME' ? (
        <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          <HomePage
            onNavigateToComienzo={() => setActiveTab('COMIENZO')}
            onNavigateToJoin={() => p2p.setViewMode && p2p.setViewMode('join')}
            isLight={isLight}
          />
        </main>
      ) : (
        <WidgetGridBoard
          boardRef={boardRef}
          boardW={boardW}
          boardHeight={boardHeight}
          maxRowUsed={maxRowUsed}
          cellW={cellW}
          cellH={cellH}
          widgets={widgets}
          isLight={isLight}
          activeInteraction={activeInteraction}
          focusedWidgetId={focusedWidgetId}
          setFocusedWidgetId={setFocusedWidgetId}
          handleStartDrag={handleStartDrag}
          handleStartResize={handleStartResize}
          removeWidget={removeWidget}
        />
      )}
    </div>
  );
};

export default Dashboard;
