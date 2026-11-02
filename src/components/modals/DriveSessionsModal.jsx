import i18n from '../../languages/index.js';
import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Folder,
  FileText,
  LogOut,
  Calendar,
  HardDrive,
  Link,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../context/SessionContext';
import ConfirmModal from './ConfirmModal';

const DriveSessionsModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const {
    isDriveLinked,
    driveSyncStatus,
    driveUser,
    driveLastSync,
    driveFileName,
    driveFilesList,
    conectarGoogleDrive,
    desconectarGoogleDrive,
    sincronizarDriveManual,
    listarSesionesDrive,
    cargarSesionDesdeDrive,
    guardarNuevaSesionEnDrive,
    vincularArchivoDrive,
    eliminarSesionDrive,
    resolverConflictoDrive,
    nombreComite
  } = useSession();

  const [loading, setLoading] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [mensajeFeedback, setFeedback] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Inicializar nombre por defecto cuando se abre la creación
  useEffect(() => {
    if (isOpen) {
      const sanitizedComite = (nombreComite || 'Asamblea').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const fecha = new Date().toISOString().slice(0, 10);
      setNuevoNombre(`openmun_${sanitizedComite}_${fecha}.json`);
      if (isDriveLinked) {
        listarSesionesDrive();
      }
    }
  }, [isOpen, isDriveLinked, nombreComite]);

  if (!isOpen) return null;

  const showNotification = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await listarSesionesDrive();
    setLoading(false);
  };

  const handleCargarArchivo = (file) => {
    setConfirmConfig({
      title: t('ui.loadGoogleDriveSession'),
      message: t('ui.thisWillDownloadAndApplyAllDataFromTheSelected2'),
      highlightText: file.name,
      submessage: t('ui.currentBrowserDataWillBeReplacedWithTheFileData'),
      confirmText: t('header.loadSession'),
      cancelText: i18n.t('ui.cancel'),
      type: 'load',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        const ok = await cargarSesionDesdeDrive(file.id, file.name);
        setLoading(false);
        if (ok) {
          showNotification(t('ui.sessionLoadedSuccessfully2', { v0: file.name }));
        }
      }
    });
  };

  const handleGuardarNuevo = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setLoading(true);
    const res = await guardarNuevaSesionEnDrive(nuevoNombre.trim());
    setLoading(false);
    if (res) {
      showNotification(t('ui.sessionSavedToDriveAs', { v0: res.name }));
      setMostrarCrear(false);
    }
  };

  const handleEliminar = (file) => {
    setConfirmConfig({
      title: t('ui.deleteDriveFile'),
      message: t('ui.permanentlyDeleteThisFileFromYourGoogleDrive'),
      highlightText: file.name,
      submessage: t('ui.thisActionCannotBeUndone'),
      confirmText: t('ui.deleteFile'),
      cancelText: i18n.t('ui.cancel'),
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        const ok = await eliminarSesionDrive(file.id);
        setLoading(false);
        if (ok) {
          showNotification(`Archivo "${file.name}" eliminado de Drive`);
        }
      }
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--panel-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.4)',
          color: 'var(--text-color)',
          fontFamily: 'var(--font-family)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--subborder-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-header-bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <svg width="22" height="22" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47" />
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
            </svg>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>
                {t('ui.googleDriveSessionManager')}
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px' }}>
                <Folder size={12} />
                <span>{t('ui.dedicatedFolder')} <strong>Google Drive &gt; openMUN</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label={t('ui.closeModal')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--border-radius, 6px)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Notificación Feedback */}
        {mensajeFeedback && (
          <div
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: mensajeFeedback.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
              borderBottom: `1px solid ${mensajeFeedback.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`,
              color: mensajeFeedback.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            {mensajeFeedback.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{mensajeFeedback.msg}</span>
          </div>
        )}

        {/* Cuerpo */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Si no está conectado */}
          {!isDriveLinked ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <HardDrive size={42} style={{ color: 'var(--muted-text)', marginBottom: '0.8rem', opacity: 0.7 }} />
              <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1rem', fontWeight: '700' }}>{t('ui.connectYourGoogleAccount')}</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted-text)', maxWidth: '420px', margin: '0 auto 1.2rem auto', lineHeight: '1.4' }}>
                {t('ui.saveYourSessionsAutomaticallyInTheFolder')} <strong>openMUN/</strong> {t('ui.inYourGoogleDriveAndContinueYourDebateOnAny')}
              </p>
              <button
                onClick={conectarGoogleDrive}
                disabled={driveSyncStatus === 'connecting'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.6rem 1.2rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: driveSyncStatus === 'connecting' ? 'wait' : 'pointer'
                }}
              >
                {driveSyncStatus === 'connecting' ? (
                  <>
                    <RefreshCw size={15} className="spin-animation" />
                    <span>{t('ui.connecting')}</span>
                  </>
                ) : (
                  <span>{t('header.driveConnect')}</span>
                )}
              </button>

              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  color: 'var(--muted-text)',
                  lineHeight: '1.4'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--info-color)', fontWeight: '600', marginBottom: '0.25rem' }}>
                  <AlertCircle size={14} />
                  <span>{t('ui.privacyAndDataUse')}</span>
                </div>
                <p style={{ margin: 0 }}>
                  {t('ui.theApplicationRunsEntirelyOnYourDeviceYourInformation')} <strong>{t('ui.travelsOnlyBetweenYourGoogleDriveAndYourComputer')}</strong>{t('ui.noDataEverPassesThroughOrIsStoredOnExternal')}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Tarjeta de Cuenta y Estado de Sesión Activa */}
              <div
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '0.8rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>{t('ui.linkedAccount')}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                    {driveUser?.name || 'Google Drive'} {driveUser?.email && <span style={{ fontWeight: 'normal', color: 'var(--muted-text)', fontSize: '0.78rem' }}>({driveUser.email})</span>}
                  </div>
                  <div style={{
                    fontSize: '0.72rem',
                    color: driveSyncStatus === 'conflict' ? 'var(--warning-color)' : 'var(--success-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginTop: '3px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: driveSyncStatus === 'conflict' ? 'var(--warning-color)' : 'var(--success-color)'
                    }} />
                    <span>
                      {driveSyncStatus === 'conflict'
                        ? <>{t('ui.conflictDetectedIn')} <strong>{driveFileName || t('ui.activeSessionJson')}</strong></>
                        : <>{t('ui.activelySyncingWith')} <strong>{driveFileName || t('ui.activeSessionJson')}</strong></>}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => sincronizarDriveManual(false)}
                    title={t('ui.forceSyncNow')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'var(--accent-soft)',
                      border: '1px solid var(--accent-color)',
                      color: 'var(--accent-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '5px 9px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={13} className={driveSyncStatus === 'syncing' ? 'spin-animation' : ''} />
                    <span>{t('conferences.sync')}</span>
                  </button>

                  <button
                    onClick={() => {
                      desconectarGoogleDrive();
                      onClose();
                    }}
                    title={t('ui.disconnectAccount')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--danger-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '5px 9px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    <LogOut size={13} />
                    <span>{t('ui.disconnect')}</span>
                  </button>
                </div>
              </div>

              {/* Alerta de Conflicto de Concurrencia */}
              {driveSyncStatus === 'conflict' && (
                <div
                  style={{
                    backgroundColor: 'var(--warning-soft, rgba(203, 181, 141, 0.1))',
                    border: '1px solid var(--warning-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning-color)', fontWeight: '600', fontSize: '0.85rem' }}>
                    <AlertCircle size={16} />
                    <span>{t('ui.syncConflictDetected')}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: '1.4' }}>
                    {t('ui.aNewerVersionSavedFromAnotherDeviceOrTabWas')}
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={async () => {
                        setLoading(true);
                        const ok = await resolverConflictoDrive('recargar');
                        setLoading(false);
                        if (ok) showNotification(t('ui.sessionUpdatedFromGoogleDrive'), 'success');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--border-radius, 6px)',
                        border: 'none',
                        backgroundColor: 'var(--btn-bg)',
                        color: 'var(--btn-text)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t('ui.loadLatestVersionFromDrive')}
                    </button>
                    <button
                      onClick={async () => {
                        setLoading(true);
                        const ok = await resolverConflictoDrive('sobrescribir');
                        setLoading(false);
                        if (ok) showNotification(t('ui.driveFileOverwrittenWithLocalSession'), 'info');
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--border-radius, 6px)',
                        border: '1px solid var(--warning-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--warning-color)',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t('ui.overwriteDriveWithMyCurrentSession')}
                    </button>
                  </div>
                </div>
              )}

              {/* Botón y Formulario de Nueva Sesión */}
              {!mostrarCrear ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-color)' }}>
                    {t('ui.filesInGoogleDrive')}{driveFilesList.length})
                  </span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={handleRefresh}
                      disabled={loading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius, 6px)',
                        color: 'var(--text-color)',
                        padding: '5px 10px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <RefreshCw size={12} className={loading ? 'spin-animation' : ''} />
                      <span>{t('ui.refresh')}</span>
                    </button>

                    <button
                      onClick={() => setMostrarCrear(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: 'var(--btn-bg)',
                        border: 'none',
                        borderRadius: 'var(--border-radius, 6px)',
                        color: 'var(--btn-text)',
                        padding: '5px 12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={13} />
                      <span>{t('ui.saveAsNewFile')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleGuardarNuevo}
                  style={{
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius, 6px)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-color)' }}>
                    {t('ui.saveCurrentSessionAsANewFileInDrive')}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder={t('ui.fileNameEGSecurityCommitteeJson')}
                      style={{
                        flex: 1,
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius, 6px)',
                        color: 'var(--text-color)',
                        padding: '6px 10px',
                        fontSize: '0.8rem'
                      }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={loading || !nuevoNombre.trim()}
                      style={{
                        background: 'var(--btn-bg)',
                        color: 'var(--btn-text)',
                        border: 'none',
                        borderRadius: 'var(--border-radius, 6px)',
                        padding: '6px 14px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {t('ui.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarCrear(false)}
                      style={{
                        background: 'transparent',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius, 6px)',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {t('toast.cancelBtn')}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Archivos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '350px', overflowY: 'auto' }}>
                {driveFilesList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--muted-text)', fontSize: '0.8rem' }}>
                    {t('ui.noSessionFilesSavedInTheFolder')} <strong>openMUN</strong> {t('ui.inGoogleDrive')}
                  </div>
                ) : (
                  driveFilesList.map((file) => {
                    const isCurrent = file.name === driveFileName;
                    return (
                      <div
                        key={file.id}
                        style={{
                          backgroundColor: isCurrent ? 'var(--accent-soft)' : 'var(--card-header-bg)',
                          border: `1px solid ${isCurrent ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
                          borderRadius: 'var(--border-radius, 6px)',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.8rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0, flex: 1 }}>
                          <FileText size={18} style={{ color: isCurrent ? 'var(--accent-color)' : 'var(--muted-text)', flexShrink: 0 }} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.82rem',
                              fontWeight: '600',
                              color: 'var(--text-color)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}>
                              <span>{file.name}</span>
                              {isCurrent && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--border-radius, 6px)',
                                  backgroundColor: 'var(--accent-soft)',
                                  color: 'var(--accent-color)',
                                  border: '1px solid var(--accent-color)',
                                  fontWeight: 'bold'
                                }}>
                                  {t('agenda.active')}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', display: 'flex', gap: '0.8rem', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                              <span>{t('ui.modified')} {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : '---'}</span>
                              {file.size && <span>{formatFileSize(file.size)}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Acciones por archivo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          <button
                            onClick={() => handleCargarArchivo(file)}
                            title={t('ui.loadThisSessionAndReplaceLocalState')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'var(--btn-bg)',
                              border: 'none',
                              color: 'var(--btn-text)',
                              borderRadius: 'var(--border-radius, 6px)',
                              padding: '5px 10px',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            <Download size={12} />
                            <span>{t('ui.load')}</span>
                          </button>

                          {!isCurrent && (
                            <button
                              onClick={async () => {
                                await vincularArchivoDrive(file.id, file.name);
                                showNotification(t('ui.syncLinkedTo', { v0: file.name }));
                              }}
                              title={t('ui.linkAutosaveToThisFile')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-color)',
                                borderRadius: 'var(--border-radius, 6px)',
                                padding: '5px 9px',
                                fontSize: '0.72rem',
                                cursor: 'pointer'
                              }}
                            >
                              <Link size={12} />
                              <span>{t('ui.link')}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleEliminar(file)}
                            title={t('ui.deleteFileFromDrive')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--muted-text)',
                              borderRadius: 'var(--border-radius, 6px)',
                              padding: '5px',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger-color)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-text)'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Pie */}
        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--subborder-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            background: 'var(--card-header-bg)'
          }}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--muted-text)', opacity: 0.85, maxWidth: '420px', lineHeight: '1.4' }}>
            {t('ui.yourDataTravelsOnlyBetweenYourBrowserAndGoogleDrive')}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius, 6px)',
              color: 'var(--text-color)',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {t('ui.close')}
          </button>
        </div>
      </div>

      {/* Modal Estilizado de Confirmación */}
      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        loading={loading}
        {...confirmConfig}
      />
    </div>
  );
};

export default DriveSessionsModal;
