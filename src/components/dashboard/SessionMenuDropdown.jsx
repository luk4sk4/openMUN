import i18n from '../../languages/index.js';
import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  RefreshCw,
  Upload,
  Download,
  Trash2,
  Cloud,
  FolderOpen,
  LogOut,
  ShieldCheck,
  Building2,
  Save
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';
import { navigateTo } from '../../utils/router';
import conferenceService from '../../services/conferenceService';

const SessionMenuDropdown = ({
  placement,
  sessionMenuOpen,
  setSessionMenuOpen,
  isLight,
  fileInputRef,
  setIsExportModalOpen,
  setIsCloudModalOpen,
  borrarDatosLocales,
  addToast
}) => {
  const { t } = useTranslation();
  const menuContainerRef = useRef(null);

  const {
    isCloudLinked,
    cloudAccount,
    cloudSyncStatus,
    cloudComitesList,
    cloudLastSync,
    cloudActiveComiteName,
    desconectarCloud,
    guardarComiteCloud,
    nombreComite
  } = useSession();

  const [quickSaveOpen, setQuickSaveOpen] = useState(false);
  const [quickSaveName, setQuickSaveName] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);

  // Cerrar al pulsar tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sessionMenuOpen) {
        setSessionMenuOpen(false);
      }
    };
    if (sessionMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionMenuOpen, setSessionMenuOpen]);

  return (
    <div style={{ position: 'relative' }} ref={menuContainerRef}>
      {/* Botón Principal de Sesión */}
      <button
        type="button"
        onClick={() => setSessionMenuOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={sessionMenuOpen}
        aria-label={t('header.sessionMenuTooltip', 'Gestión de Sesión: Guardar en la nube, Importar y Exportar')}
        style={{
          width: '100%',
          backgroundColor: sessionMenuOpen ? 'var(--accent-soft)' : undefined,
          color: sessionMenuOpen ? 'var(--accent-color)' : undefined
        }}
        title={t('header.sessionMenuTooltip', 'Gestión de Sesión: Guardar en la nube, Importar y Exportar')}
      >
        <Folder
          size={16}
          style={{
            color: sessionMenuOpen ? 'var(--accent-color)' : (isCloudLinked ? 'var(--accent-color)' : 'currentColor'),
            flexShrink: 0
          }}
        />
        <span>{t('header.sessionMenu', 'Sesión')}</span>

        {/* Indicador de estado de sincronización */}
        {cloudSyncStatus === 'syncing' ? (
          <RefreshCw size={11} className="spin-animation" style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
        ) : isCloudLinked && cloudSyncStatus === 'synced' ? (
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--success-color)',
            flexShrink: 0
          }} />
        ) : cloudSyncStatus === 'error' ? (
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger-color)',
            flexShrink: 0
          }} />
        ) : null}
      </button>

      {/* Overlay de Fondo Opaco + Menú Desplegable Rediseñado */}
      {sessionMenuOpen && (
        <>
          {/* Telón de fondo opacado (Backdrop) */}
          <div
            onClick={() => setSessionMenuOpen(false)}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              zIndex: 9998,
              animation: 'fadeIn 0.15s ease'
            }}
          />

          {/* Menú Desplegable Ampliado y Limpio */}
          <div
            role="menu"
            className={placement === 'sidebar' ? 'dashboard-sidebar-session-menu' : undefined}
            aria-label={t('header.sessionMenu', 'Sesión')}
            style={{
              position: placement === 'sidebar' ? 'fixed' : 'absolute',
              top: placement === 'sidebar' ? 'calc(var(--dashboard-tools-top, 64px) + 8px)' : 'calc(100% + 8px)',
              left: undefined,
              right: placement === 'sidebar' ? 'calc(var(--dashboard-sidebar-width, 60px) + 12px)' : 0,
              width: placement === 'sidebar'
                ? 'min(360px, calc(100vw - var(--dashboard-sidebar-width, 60px) - 24px))'
                : 'min(360px, calc(100vw - 24px))',
              maxHeight: placement === 'sidebar'
                ? 'calc(100dvh - var(--dashboard-tools-top, 64px) - 24px)'
                : 'calc(100dvh - 80px)',
              overflowY: 'auto',
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius, 8px)',
              boxShadow: isLight
                ? '0 10px 32px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)'
                : '0 16px 42px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3)',
              padding: '0.8rem',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              color: 'var(--text-color)',
              fontFamily: 'var(--font-family)',
              animation: 'fadeIn 0.15s ease'
            }}
          >
            {/* SECCIÓN 1: ARCHIVOS LOCALES (JSON) */}
            <div style={{
              fontSize: '0.74rem',
              fontWeight: '750',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--muted-text)',
              padding: '0.35rem 0.65rem 0.15rem'
            }}>
              {t('header.sessionSectionLocal', 'Archivos Locales (JSON)')}
            </div>

            {/* Botón Cargar Sesión */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSessionMenuOpen(false);
                fileInputRef.current?.click();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: '1px solid transparent',
                backgroundColor: 'transparent',
                color: 'var(--text-color)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--card-hover)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--border-radius, 6px)',
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Upload size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-color)', lineHeight: 1.25 }}>
                  {t('header.importSession', 'Cargar Sesión (JSON)')}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: 1.3, marginTop: '3px' }}>
                  {t('header.importSessionDesc', 'Restaurar datos desde archivo .json')}
                </span>
              </div>
            </button>

            {/* Botón Exportar Sesión */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSessionMenuOpen(false);
                setIsExportModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: '1px solid transparent',
                backgroundColor: 'transparent',
                color: 'var(--text-color)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--card-hover)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--border-radius, 6px)',
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Download size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-color)', lineHeight: 1.25 }}>
                  {t('header.exportSession', 'Exportar sesión')}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: 1.3, marginTop: '3px' }}>
                  {t('header.exportSessionDesc', 'Guardar copia de seguridad en JSON')}
                </span>
              </div>
            </button>

            {/* Botón Eliminar Sesión */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSessionMenuOpen(false);
                addToast({
                  type: 'confirm',
                  isLarge: true,
                  title: t('toast.confirmClearSessionTitle', '¿Eliminar sesión y datos locales?'),
                  message: t('toast.confirmClearSessionDesc', 'Esta acción restablecerá el comité actual, la conferencia conectada, lista de oradores, votaciones y datos guardados en el navegador. No se puede deshacer si no tienes una copia de seguridad.'),
                  confirmText: t('toast.confirmClearSessionBtn', 'Eliminar sesión'),
                  cancelText: t('toast.cancelBtn', 'Cancelar'),
                  onConfirm: () => {
                    borrarDatosLocales();
                    addToast({
                      type: 'success',
                      title: t('toast.sessionClearedTitle', '¡Sesión eliminada!'),
                      message: t('toast.sessionClearedDesc', 'Se ha restablecido la sesión local y la información de la conferencia por completo.'),
                      duration: 3500
                    });
                  }
                });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--border-radius, 6px)',
                border: '1px solid transparent',
                backgroundColor: 'transparent',
                color: 'var(--text-color)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--danger-soft)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--border-radius, 6px)',
                backgroundColor: 'var(--danger-soft)',
                color: 'var(--danger-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Trash2 size={18} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--danger-color)', lineHeight: 1.25 }}>
                  {t('header.clearLocalData', 'Eliminar sesión')}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: 1.3, marginTop: '3px' }}>
                  {t('header.clearLocalDataDesc', 'Restablecer comités, oradores y conferencia')}
                </span>
              </div>
            </button>

            {/* Separador */}
            <div style={{ height: '1px', backgroundColor: 'var(--subborder-color)', margin: '0.35rem 0.2rem' }} />

            {/* SECCIÓN 2: NUBE */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.65rem 0.15rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Cloud
                  size={15}
                  style={{
                    color: isCloudLinked ? 'var(--accent-color)' : 'var(--muted-text)',
                    flexShrink: 0
                  }}
                />
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: '750',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--muted-text)'
                }}>
                  {t('header.sessionSectionCloud', 'Nube')}
                </span>
              </div>

              {isCloudLinked && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  border: `1px solid ${
                    cloudSyncStatus === 'syncing'
                      ? 'var(--info-color)'
                      : cloudSyncStatus === 'error'
                        ? 'var(--danger-color)'
                        : 'var(--success-color)'
                  }`,
                  backgroundColor:
                    cloudSyncStatus === 'syncing'
                      ? 'var(--info-soft)'
                      : cloudSyncStatus === 'error'
                        ? 'var(--danger-soft)'
                        : 'var(--success-soft)',
                  color:
                    cloudSyncStatus === 'syncing'
                      ? 'var(--info-color)'
                      : cloudSyncStatus === 'error'
                        ? 'var(--danger-color)'
                        : 'var(--success-color)'
                }}>
                  {cloudSyncStatus === 'syncing'
                    ? t('ui.saving')
                    : cloudSyncStatus === 'error'
                      ? t('ui.error')
                      : t('ui.synced')}
                </span>
              )}
            </div>

            {!isCloudLinked ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSessionMenuOpen(false);
                  if (setIsCloudModalOpen) setIsCloudModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid transparent',
                  backgroundColor: 'transparent',
                  color: 'var(--text-color)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--card-hover)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Cloud size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: '600', color: 'var(--text-color)', lineHeight: 1.25 }}>
                    {t('header.saveInCloud', 'Guardar en la nube')}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: 1.3, marginTop: '3px' }}>
                    {t('header.saveInCloudDesc', 'Vincular o sincronizar comités')}
                  </span>
                </div>
                <FolderOpen size={16} style={{ color: 'var(--muted-text)', flexShrink: 0, opacity: 0.7 }} />
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.2rem 0' }}>
                <div style={{
                  backgroundColor: 'var(--input-bg)',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  border: '1px solid var(--subborder-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                    <div style={{
                      fontSize: '0.84rem',
                      fontWeight: '600',
                      color: 'var(--text-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--success-color)',
                        display: 'inline-block',
                        flexShrink: 0
                      }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cloudAccount?.name || t('ui.conferenceConnected')}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.66rem',
                      backgroundColor: 'var(--success-soft)',
                      color: 'var(--success-color)',
                      border: '1px solid var(--success-color)',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontWeight: '700',
                      flexShrink: 0
                    }}>
                      {t('ui.active')}
                    </span>
                  </div>

                  {cloudActiveComiteName && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t('ui.committee')} <strong style={{ color: 'var(--text-color)' }}>{cloudActiveComiteName}</strong>
                    </div>
                  )}

                  {cloudLastSync && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
                      {t('ui.lastSaved')} {cloudLastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  )}
                </div>

                {/* Explorar comités */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSessionMenuOpen(false);
                    if (setIsCloudModalOpen) setIsCloudModalOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    color: 'var(--text-color)',
                    padding: '8px 12px',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--card-hover)';
                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--subborder-color)';
                  }}
                >
                  <FolderOpen size={15} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                  <span>{t('ui.browseCommittees')}{cloudComitesList.length})</span>
                </button>

                {/* Guardado rápido de comité actual */}
                {!quickSaveOpen ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setQuickSaveName(nombreComite || i18n.t('ui.mainCommittee'));
                      setQuickSaveOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      color: 'var(--text-color)',
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'var(--card-hover)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Save size={15} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
                    <span>{t('ui.saveCurrentSessionToTheCloud')}</span>
                  </button>
                ) : (
                  <div style={{
                    padding: '0.6rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'var(--card-hover)',
                    border: '1px solid var(--subborder-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem'
                  }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: '600', color: 'var(--muted-text)' }}>
                      {t('ui.committeeNameToSave')}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <input
                        type="text"
                        value={quickSaveName}
                        onChange={(e) => setQuickSaveName(e.target.value)}
                        placeholder={t('ui.eGDisec')}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: 'var(--border-radius, 6px)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-color)',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!quickSaveName.trim()) return;
                          setCloudLoading(true);
                          try {
                            await guardarComiteCloud(quickSaveName.trim());
                            if (addToast) addToast(t('ui.committeeSavedToTheCloud', { v0: quickSaveName.trim() }), 'success');
                            setQuickSaveOpen(false);
                          } catch (err) {
                            if (addToast) addToast(err.message || t('ui.errorSaving'), 'error');
                          } finally {
                            setCloudLoading(false);
                          }
                        }}
                        disabled={cloudLoading}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--border-radius, 6px)',
                          backgroundColor: 'var(--btn-bg)',
                          color: 'var(--btn-text)',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        {cloudLoading ? '...' : t('ui.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickSaveOpen(false)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 'var(--border-radius, 6px)',
                          backgroundColor: 'transparent',
                          color: 'var(--muted-text)',
                          border: '1px solid var(--subborder-color)',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Desconectar */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    desconectarCloud();
                    setSessionMenuOpen(false);
                    if (addToast) addToast(t('ui.conferenceDisconnectedFromTheCloud'), 'info');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    backgroundColor: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: 'var(--border-radius, 6px)',
                    color: 'var(--danger-color)',
                    padding: '7px 10px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--danger-soft)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut size={14} style={{ flexShrink: 0 }} />
                  <span>{t('ui.disconnectCloud')}</span>
                </button>
              </div>
            )}

            {/* Separador */}
            <div style={{ height: '1px', backgroundColor: 'var(--subborder-color)', margin: '0.35rem 0.2rem' }} />

            {/* Acceso a Conferencias */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSessionMenuOpen(false);
                const activeConf = conferenceService.obtenerSesionActiva();
                window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
                  detail: {
                    view: 'conference',
                    confId: activeConf?.id || '',
                    mode: 'explore'
                  }
                }));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--border-radius, 6px)',
                color: 'var(--text-color)',
                padding: '0.5rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Building2 size={15} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
              <span>{t('header.goToConferences', 'Panel de Conferencias')}</span>
            </button>

            {/* Enlace Política de Privacidad */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setSessionMenuOpen(false);
                navigateTo('/privacy');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--border-radius, 6px)',
                color: 'var(--muted-text)',
                padding: '0.5rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--card-hover)';
                e.currentTarget.style.color = 'var(--text-color)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--muted-text)';
              }}
            >
              <ShieldCheck size={15} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
              <span>{t('legalBanner.privacyLink', 'Política de Privacidad')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SessionMenuDropdown;
