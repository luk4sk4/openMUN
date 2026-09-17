import React, { useEffect, useRef } from 'react';
import {
  FolderArchive,
  RefreshCw,
  ChevronDown,
  Upload,
  Download,
  Trash2,
  Cloud,
  FolderOpen,
  LogOut
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SessionMenuDropdown = ({
  sessionMenuOpen,
  setSessionMenuOpen,
  isLight,
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
  const menuContainerRef = useRef(null);

  // Cerrar al hacer clic fuera del menú
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setSessionMenuOpen(false);
      }
    };
    if (sessionMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sessionMenuOpen, setSessionMenuOpen]);

  return (
    <div style={{ position: 'relative' }} ref={menuContainerRef}>
      {/* Botón Principal de Sesión */}
      <button
        onClick={() => setSessionMenuOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          backgroundColor: sessionMenuOpen
            ? (isLight ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.2)')
            : (isDriveLinked ? 'rgba(66, 133, 244, 0.08)' : 'transparent'),
          border: `1px solid ${sessionMenuOpen ? 'var(--btn-bg)' : isDriveLinked ? 'rgba(66, 133, 244, 0.4)' : 'var(--subborder-color)'}`,
          borderRadius: '6px',
          color: 'var(--text-color)',
          padding: '0.4rem 0.65rem',
          fontSize: '0.78rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        title={t('header.sessionMenuTooltip', 'Gestión de Sesión: Importar, Exportar y Google Drive')}
      >
        <FolderArchive size={15} style={{ color: isDriveLinked ? '#2684fc' : 'currentColor' }} />
        <span>{t('header.sessionMenu', 'Sesión')}</span>

        {/* Indicador de estado de Google Drive */}
        {driveSyncStatus === 'syncing' || driveSyncStatus === 'connecting' ? (
          <RefreshCw size={11} className="spin-animation" style={{ color: '#2684fc' }} />
        ) : isDriveLinked && driveSyncStatus === 'synced' ? (
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#00ac47',
            boxShadow: '0 0 5px #00ac47'
          }} />
        ) : isDriveLinked && driveSyncStatus === 'conflict' ? (
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#f59e0b',
            boxShadow: '0 0 5px #f59e0b'
          }} />
        ) : isDriveLinked && driveSyncStatus === 'error' ? (
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#ea4335',
            boxShadow: '0 0 5px #ea4335'
          }} />
        ) : null}

        <ChevronDown
          size={13}
          style={{
            transform: sessionMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            opacity: 0.7
          }}
        />
      </button>

      {/* Menú Desplegable Unificado */}
      {sessionMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '275px',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(22, 27, 39, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--subborder-color)',
            borderRadius: '10px',
            boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.12)' : '0 16px 36px rgba(0,0,0,0.5)',
            padding: '0.65rem',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {/* SECCIÓN 1: ARCHIVOS LOCALES (JSON) */}
          <div style={{
            fontSize: '0.68rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--muted-text)',
            padding: '0.2rem 0.4rem 0.1rem'
          }}>
            {t('header.sessionSectionLocal', 'Archivos Locales (JSON)')}
          </div>

          {/* Botón Cargar Sesión */}
          <button
            onClick={() => {
              setSessionMenuOpen(false);
              fileInputRef.current?.click();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.5rem 0.6rem',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-color)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Upload size={15} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                {t('header.importSession', 'Cargar Sesión (JSON)')}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                {t('header.importSessionDesc', 'Restaurar datos desde archivo .json')}
              </span>
            </div>
          </button>

          {/* Botón Exportar Sesión */}
          <button
            onClick={() => {
              setSessionMenuOpen(false);
              setIsExportModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.5rem 0.6rem',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-color)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Download size={15} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                {t('header.exportSession', 'Exportar sesión')}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                {t('header.exportSessionDesc', 'Guardar copia de seguridad en JSON')}
              </span>
            </div>
          </button>

          {/* Botón Borrar Datos Locales */}
          <button
            onClick={() => {
              setSessionMenuOpen(false);
              addToast({
                type: 'confirm',
                isLarge: true,
                title: t('toast.confirmClearSessionTitle', '¿Borrar todos los datos locales?'),
                message: t('toast.confirmClearSessionDesc', 'Esta acción restablecerá el comité actual, lista de oradores, votaciones y datos guardados en el navegador. No se puede deshacer si no tienes una copia de seguridad.'),
                confirmText: t('toast.confirmClearSessionBtn', 'Borrar datos locales'),
                cancelText: t('toast.cancelBtn', 'Cancelar'),
                onConfirm: () => {
                  borrarDatosLocales();
                  addToast({
                    type: 'success',
                    title: t('toast.sessionClearedTitle', '¡Datos locales borrados!'),
                    message: t('toast.sessionClearedDesc', 'Se ha restablecido la sesión local por completo.'),
                    duration: 3500
                  });
                }
              });
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.5rem 0.6rem',
              borderRadius: '7px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--text-color)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Trash2 size={15} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ef4444' }}>
                {t('header.clearLocalData', 'Borrar datos locales')}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--muted-text)' }}>
                {t('header.clearLocalDataDesc', 'Restablecer comités, oradores y estado')}
              </span>
            </div>
          </button>

          {/* Separador */}
          <div style={{ height: '1px', backgroundColor: 'var(--subborder-color)', margin: '0.2rem 0' }} />

          {/* SECCIÓN 2: GOOGLE DRIVE */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.1rem 0.4rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <svg width="13" height="13" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
              </svg>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--muted-text)'
              }}>
                Google Drive
              </span>
            </div>

            <span style={{
              fontSize: '0.65rem',
              fontWeight: '700',
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: !isDriveLinked
                ? (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)')
                : driveSyncStatus === 'synced'
                  ? 'rgba(0, 172, 71, 0.15)'
                  : driveSyncStatus === 'syncing'
                    ? 'rgba(38, 132, 252, 0.15)'
                    : driveSyncStatus === 'conflict'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(234, 67, 53, 0.15)',
              color: !isDriveLinked
                ? 'var(--muted-text)'
                : driveSyncStatus === 'synced'
                  ? '#00ac47'
                  : driveSyncStatus === 'syncing'
                    ? '#2684fc'
                    : driveSyncStatus === 'conflict'
                      ? '#f59e0b'
                      : '#ea4335'
            }}>
              {!isDriveLinked
                ? 'Offline'
                : driveSyncStatus === 'synced'
                  ? 'Sincronizado'
                  : driveSyncStatus === 'syncing'
                    ? 'Guardando...'
                    : driveSyncStatus === 'conflict'
                      ? 'Conflicto'
                      : 'Error'}
            </span>
          </div>

          {!isDriveLinked ? (
            <button
              onClick={() => {
                setSessionMenuOpen(false);
                conectarGoogleDrive().then(ok => {
                  if (ok) setIsDriveModalOpen(true);
                });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 0.6rem',
                borderRadius: '7px',
                border: '1px solid rgba(66, 133, 244, 0.3)',
                backgroundColor: 'rgba(66, 133, 244, 0.08)',
                color: '#2684fc',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(66, 133, 244, 0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(66, 133, 244, 0.08)'; }}
            >
              <Cloud size={16} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700' }}>
                  {t('header.driveConnect', 'Conectar con Google Drive')}
                </span>
                <span style={{ fontSize: '0.66rem', opacity: 0.8 }}>
                  Copia y sincronización en la nube
                </span>
              </div>
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {driveUser && (
                <div style={{
                  backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--subborder-color)'
                }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-color)' }}>
                    {driveUser.name || 'Google Drive'}
                  </div>
                  {driveUser.email && (
                    <div style={{ fontSize: '0.66rem', color: 'var(--muted-text)', wordBreak: 'break-all' }}>
                      {driveUser.email}
                    </div>
                  )}
                  <div style={{ fontSize: '0.66rem', color: 'var(--muted-text)', marginTop: '0.15rem' }}>
                    Archivo: <strong>{driveFileName || 'sesion_activa.json'}</strong>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setSessionMenuOpen(false);
                  setIsDriveModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(38, 132, 252, 0.1)',
                  border: '1px solid rgba(38, 132, 252, 0.3)',
                  borderRadius: '5px',
                  color: '#2684fc',
                  padding: '5px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <FolderOpen size={13} />
                <span>{t('header.driveExplore', 'Explorar / Gestionar Sesiones')}</span>
              </button>

              <button
                onClick={async () => {
                  await sincronizarDriveManual();
                  setSessionMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--card-hover, rgba(255,255,255,0.05))',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '5px',
                  color: 'var(--text-color)',
                  padding: '5px 8px',
                  fontSize: '0.74rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <RefreshCw size={12} className={driveSyncStatus === 'syncing' ? 'spin-animation' : ''} />
                <span>{t('header.driveSyncNow', 'Sincronizar ahora')}</span>
              </button>

              <button
                onClick={() => {
                  desconectarGoogleDrive();
                  setSessionMenuOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'transparent',
                  border: '1px solid rgba(234, 67, 53, 0.3)',
                  borderRadius: '5px',
                  color: '#ea4335',
                  padding: '5px 8px',
                  fontSize: '0.74rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <LogOut size={12} />
                <span>{t('header.driveDisconnect', 'Desconectar Google Drive')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionMenuDropdown;
