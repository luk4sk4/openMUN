import React, { useState, useEffect, useRef, useId } from 'react';
import { ArrowLeft, Menu, Moon, Sun, Maximize2, Eye, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import DashboardSubheader from './DashboardSubheader';
import useTabIndicator from '../../hooks/useTabIndicator';
import useFullscreen from '../../hooks/useFullscreen';

const ConsoleNavbar = ({
  title,
  showContext = true,
  showBrand = true,
  backIconOnly = false,
  roleBadge,
  roomId,
  connectedPeersCount,
  nombreComite,
  agendaSesion,
  tipoSesion,
  cambiarTipoSesion,
  activeTab,
  setActiveTab,
  tabs = [],
  isLight,
  toggleThemeMode,
  setIsAccessOpen,
  onBack,
  hasBackDropdown = false,
  backDropdownOpen = false,
  setBackDropdownOpen,
  backOptions = [],
  sidebarActions,
  onExit,
  exitLabel,
  exitConfirmMessage
}) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const sidebarEdgeRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const backBtnRef = useRef(null);
  const sidebarId = useId();
  const { tabsNavRef, indicatorStyle } = useTabIndicator(activeTab, tabs);
  const { toggleMaximize } = useFullscreen();

  // Cerrar el panel al cambiar de pestaña
  useEffect(() => {
    setIsToolsOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (isToolsOpen) sidebarEdgeRef.current?.querySelector('button, select')?.focus({ preventScroll: true });
  }, [isToolsOpen]);

  // Cerrar al pulsar Escape o al hacer clic fuera del sidebar
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
      if (event.key === 'Escape') {
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
  }, [isToolsOpen]);

  useEffect(() => {
    if (!backDropdownOpen) return;
    const handlePointerDown = (event) => {
      if (!backBtnRef.current?.contains(event.target)) setBackDropdownOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setBackDropdownOpen(false);
        backBtnRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [backDropdownOpen, setBackDropdownOpen]);

  const handleExitClick = async () => {
    setIsToolsOpen(false);
    if (!onExit) return;
    if (exitConfirmMessage) {
      const confirmed = await confirm({
        title: t('common.exit', 'Salir'),
        message: exitConfirmMessage,
        confirmText: t('common.exit', 'Salir'),
        cancelText: t('common.cancel', 'Cancelar'),
        type: 'warning'
      });
      if (confirmed) {
        onExit();
      }
    } else {
      onExit();
    }
  };

  return (
    <>
      <header className={`dashboard-navigation${tabs.length === 0 && !title ? " is-compact" : ""}`}>

        <div className="dashboard-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            {onBack && (
              <div style={{ position: 'relative' }} ref={backBtnRef}>
                <button
                  type="button"
                  className={`dashboard-back-btn${backIconOnly ? ' is-icon-only' : ''}`}
                  onClick={onBack}
                  aria-expanded={hasBackDropdown ? backDropdownOpen : undefined}
                  title={t('common.back', 'Volver')}
                  aria-label={t('common.back', 'Volver')}
                >
                  <ArrowLeft size={16} />
                  {!backIconOnly && <span>{t('common.back', 'Volver')}</span>}
                  {hasBackDropdown && <ChevronDown size={13} style={{ opacity: 0.7 }} />}
                </button>

                {hasBackDropdown && backDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: '230px',
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    padding: '6px',
                    zIndex: 1050,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {backOptions.map((opt, idx) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (setBackDropdownOpen) setBackDropdownOpen(false);
                            opt.onClick();
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '5px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: opt.danger ? 'var(--danger-color)' : 'var(--text-color)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            textAlign: 'left',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--card-hover)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          {Icon && <Icon size={15} color={opt.color} />}
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {showBrand && (
              <div className="dashboard-brand" style={{ cursor: 'default' }}>
                <OpenMunLogo height={28} isLight={isLight} />
              </div>
            )}
          </div>

          <div className="dashboard-nav-row">
            {tabs.length === 0 && Boolean(title) && <span className="dashboard-nav-title">{title}</span>}
            <nav
              hidden={tabs.length === 0}
              ref={tabsNavRef}
              className="dashboard-tabs-scroll"
              aria-label={title || t('header.navigation', 'Navegación')}
            >
              {tabs.map(tab => {
                const TabIcon = tab.icon;
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isCurrent ? 'page' : undefined}
                    title={tab.label}
                  >
                    {TabIcon && <TabIcon size={16} />}
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <b className="dashboard-unread">{tab.badge}</b>
                    )}
                  </button>
                );
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
              <button
                ref={toggleBtnRef}
                type="button"
                className={`dashboard-sidebar-toggle${isToolsOpen ? ' is-active' : ''}`}
                onClick={() => setIsToolsOpen(prev => !prev)}
                aria-label={t('header.toggleTools', 'Herramientas y opciones')}
                aria-expanded={isToolsOpen}
                aria-controls={sidebarId}
                title={t('header.tools', 'Herramientas y opciones')}
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>

        {showContext && <DashboardSubheader
          nombreComite={nombreComite}
          agendaSesion={agendaSesion}
          tipoSesion={tipoSesion}
          cambiarTipoSesion={cambiarTipoSesion}
          roleBadge={roleBadge}
          roomId={roomId}
        />}
      </header>

      {/* Barra lateral desplegable (idéntica a la pestaña principal) */}
      <div
        ref={sidebarEdgeRef}
        className={`dashboard-sidebar-edge${showContext ? ' has-context' : ''}${isToolsOpen ? ' is-open' : ''}`}
      >
        <aside id={sidebarId} className="dashboard-sidebar" aria-label={t('header.tools', 'Herramientas')}>
          {/* Información de sala y conexiones */}
          {roomId && (
            <div className="dashboard-toolbar-actions">
              <div style={{
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--subborder-color)',
                fontSize: '0.74rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 650, color: 'var(--text-color)' }}>
                  <span className="dashboard-room-dot" />
                  <span>{t('liveSession.roomCode', 'Sala')}: {roomId}</span>
                </div>
                {connectedPeersCount !== undefined && (
                  <div style={{ color: 'var(--muted-text)', fontSize: '0.7rem' }}>
                    {connectedPeersCount} {t('liveSession.connectedCount', 'conectados')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acciones contextuales / personalizadas de la vista */}
          {sidebarActions && (
            <div className="dashboard-toolbar-actions" onClick={(event) => {
              if (event.target.closest('button')) setIsToolsOpen(false);
            }}>
              {sidebarActions}
            </div>
          )}

          {/* Destinos de navegación rápida */}
          {backOptions && backOptions.length > 0 && (
            <div className="dashboard-session-actions dashboard-toolbar-actions">
              {backOptions.map((opt, idx) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      opt.onClick();
                    }}
                    style={opt.danger ? { color: 'var(--danger-color)' } : {}}
                    title={opt.label}
                  >
                    {Icon && <Icon size={16} color={opt.color} />}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Utilidades de cabecera */}
          <div className="dashboard-utilities">
            <button
              type="button"
              onClick={toggleThemeMode}
              title={isLight ? t('header.darkMode', 'Cambiar a modo oscuro') : t('header.lightMode', 'Cambiar a modo claro')}
            >
              {isLight ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              type="button"
              onClick={toggleMaximize}
              title={t('header.fullscreen', 'Pantalla completa (F11)')}
            >
              <Maximize2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsToolsOpen(false);
                if (setIsAccessOpen) setIsAccessOpen(true);
              }}
              title={t('accessibility.title', 'Accesibilidad y tema')}
            >
              <Eye size={16} />
            </button>
          </div>

          {/* Selector de idioma */}
          <LanguageSelector showIcon={false} />

          {/* Botón Salir */}
          {onExit && (
            <button
              type="button"
              onClick={handleExitClick}
              style={{
                marginTop: 'auto',
                color: 'var(--danger-color)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '8px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                fontWeight: 650,
                cursor: 'pointer',
                textAlign: 'left'
              }}
              title={exitLabel || t('common.exit', 'Salir')}
            >
              <LogOut size={16} />
              <span>{exitLabel || t('common.exit', 'Salir')}</span>
            </button>
          )}
        </aside>
      </div>
    </>
  );
};

export default ConsoleNavbar;
