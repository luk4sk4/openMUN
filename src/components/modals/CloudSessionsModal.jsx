import i18n from '../../languages/index.js';
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  LogOut,
  Calendar,
  Cloud,
  Database,
  Eye,
  EyeOff,
  AlertCircle,
  Save
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import ConfirmModal from './ConfirmModal';

const CloudSessionsModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const {
    isCloudLinked,
    cloudAccount,
    cloudSyncStatus,
    cloudLastSync,
    cloudComitesList,
    cloudActiveComiteName,
    conectarCloud,
    desconectarCloud,
    listarComitesCloud,
    guardarComiteCloud,
    cargarComiteCloud,
    eliminarComiteCloud,
    nombreComite
  } = useSession();

  const [loading, setLoading] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [mostrarCrear, setMostrarCrear] = useState(false);
  const [mensajeFeedback, setFeedback] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Estados del formulario de autenticación
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [nombreConferencia, setNombreConferencia] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const sanitized = (nombreComite || 'Asamblea General').trim();
      const fecha = new Date().toISOString().slice(0, 10);
      setNuevoNombre(`${sanitized} - ${fecha}`);
      if (isCloudLinked) {
        listarComitesCloud();
      }
    }
  }, [isOpen, isCloudLinked, nombreComite]);

  if (!isOpen) return null;

  const showNotification = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), type === 'error' ? 7000 : 3500);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (!nombreConferencia.trim()) {
      showNotification(t('ui.enterTheConferenceOrAccountName'), 'error');
      return;
    }
    if (!password) {
      showNotification(t('ui.enterThePassword'), 'error');
      return;
    }

    setLoading(true);
    try {
      const isRegister = authMode === 'register';
      await conectarCloud(nombreConferencia.trim(), password, isRegister);
      showNotification(
        isRegister
          ? t('ui.accountRegisteredAndConnected', { v0: nombreConferencia.trim() })
          : t('ui.signedInAs', { v0: nombreConferencia.trim() })
      );
      setPassword('');
    } catch (err) {
      console.error('Error al autenticar en la nube:', err);
      showNotification(err.message || t('ui.errorConnectingToTheCloud'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await listarComitesCloud();
    setLoading(false);
  };

  const handleCargarComite = (comite) => {
    setConfirmConfig({
      title: t('ui.loadCommitteeFromTheCloud'),
      message: t('ui.thisWillDownloadAndApplyAllDataFromTheSelected'),
      highlightText: comite.name,
      submessage: t('ui.currentDebateDataInThisBrowserWillBeReplacedWith'),
      confirmText: t('ui.loadCommittee'),
      cancelText: i18n.t('ui.cancel'),
      type: 'load',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        try {
          await cargarComiteCloud(comite.id, comite.name);
          showNotification(t('ui.committeeLoadedSuccessfully', { v0: comite.name }));
        } catch (err) {
          showNotification(err.message || t('ui.errorLoadingCommittee'), 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleGuardarNuevo = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;
    setLoading(true);
    try {
      const res = await guardarComiteCloud(nuevoNombre.trim());
      showNotification(t('ui.committeeSavedSuccessfullyToTheCloud', { v0: res.name }));
      setMostrarCrear(false);
    } catch (err) {
      showNotification(err.message || t('ui.errorSavingCommittee'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSobrescribir = (comite) => {
    setConfirmConfig({
      title: t('ui.overwriteCommitteeInTheCloud'),
      message: t('ui.thisWillReplaceCloudDataWithTheSessionCurrentlyOn'),
      highlightText: comite.name,
      submessage: t('ui.thePreviousCloudDataForThisCommitteeWillBeUpdated'),
      confirmText: 'Sobrescribir',
      cancelText: i18n.t('ui.cancel'),
      type: 'warning',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        try {
          await guardarComiteCloud(comite.name);
          showNotification(t('ui.committeeUpdatedInTheCloud', { v0: comite.name }));
        } catch (err) {
          showNotification(err.message || t('ui.errorUpdatingCommittee'), 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleEliminar = (comite) => {
    setConfirmConfig({
      title: t('ui.deleteCommitteeFromTheCloud'),
      message: t('ui.permanentlyDeleteThisCommitteeFromYourCloudConference'),
      highlightText: comite.name,
      submessage: t('ui.thisActionCannotBeUndone'),
      confirmText: t('ui.deleteCommittee2'),
      cancelText: i18n.t('ui.cancel'),
      type: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        setLoading(true);
        try {
          await eliminarComiteCloud(comite.id);
          showNotification(t('ui.committeeDeletedFromTheCloud', { v0: comite.name }));
        } catch (err) {
          showNotification(err.message || t('ui.errorDeletingCommittee2'), 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Desconocida';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '640px',
          maxHeight: '88vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--border-radius, 6px)',
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color)'
              }}
            >
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {t('ui.cloudBackup')}
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                {isCloudLinked && cloudAccount
                  ? `Conferencia activa: ${cloudAccount.name}`
                  : t('ui.syncAndSaveYourConferenceCommittees')}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

        {/* Contenido Principal */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isCloudLinked ? (
            /* Vista de Inicio de Sesión / Registro */
            <div style={{ maxWidth: '420px', width: '100%', margin: '0.5rem auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                <Cloud size={40} style={{ color: 'var(--accent-color)', marginBottom: '0.6rem', opacity: 0.9 }} />
                <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '1.1rem', fontWeight: '700' }}>
                  {authMode === 'login' ? t('ui.connectToYourConference') : t('ui.createConferenceAccount')}
                </h4>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: '1.4' }}>
                  {authMode === 'login'
                    ? t('ui.enterYourConferenceNameAndPasswordToAccessAllSaved')
                    : t('ui.registerANameAndPasswordForYourConferencePasswordsAre')}
                </p>
              </div>

              {/* Selector de Modo */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  backgroundColor: 'var(--card-header-bg)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '3px',
                  marginBottom: '1rem',
                  border: '1px solid var(--subborder-color)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  aria-pressed={authMode === 'login'}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--border-radius, 6px)',
                    border: `1px solid ${authMode === 'login' ? 'var(--accent-color)' : 'transparent'}`,
                    backgroundColor: authMode === 'login' ? 'var(--accent-soft)' : 'transparent',
                    color: authMode === 'login' ? 'var(--accent-color)' : 'var(--muted-text)',
                    fontWeight: authMode === 'login' ? '700' : '500',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {t('ui.signIn')}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  aria-pressed={authMode === 'register'}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--border-radius, 6px)',
                    border: `1px solid ${authMode === 'register' ? 'var(--accent-color)' : 'transparent'}`,
                    backgroundColor: authMode === 'register' ? 'var(--accent-soft)' : 'transparent',
                    color: authMode === 'register' ? 'var(--accent-color)' : 'var(--muted-text)',
                    fontWeight: authMode === 'register' ? '700' : '500',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {t('ui.createAccount')}
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    {t('ui.conferenceAccountName')}
                  </label>
                  <input
                    type="text"
                    value={nombreConferencia}
                    onChange={(e) => setNombreConferencia(e.target.value)}
                    placeholder={t('ui.eGMunMadrid2026Urumun')}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--border-radius, 6px)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-color)',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.3rem' }}>
                    {t('ui.password')}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('ui.conferencePassword')}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 12px',
                        borderRadius: 'var(--border-radius, 6px)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        fontSize: '0.82rem',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t('ui.hidePassword') : t('ui.showPassword')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted-text)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: '0.4rem',
                    padding: '9px 16px',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {loading && <RefreshCw size={15} className="spin-animation" />}
                  <span>
                    {loading
                      ? t('ui.connecting')
                      : authMode === 'login'
                        ? t('ui.signInAndLoadCommittees')
                        : t('ui.createAndLinkConference')}
                  </span>
                </button>
              </form>
            </div>
          ) : (
            /* Vista de Gestión de Comités (Autenticado) */
            <>
              {/* Tarjeta de Cuenta Activa */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--accent-color)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {t('ui.linkedConference')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '1px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: '700' }}>
                      {cloudAccount?.name || t('ui.conference')}
                    </span>
                    <span style={{
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      padding: '1px 6px',
                      borderRadius: 'var(--border-radius, 6px)',
                      backgroundColor: cloudSyncStatus === 'syncing'
                        ? 'var(--info-soft, rgba(166, 184, 201, 0.15))'
                        : cloudSyncStatus === 'error'
                          ? 'var(--danger-soft)'
                          : 'var(--success-soft)',
                      color: cloudSyncStatus === 'syncing'
                        ? 'var(--info-color)'
                        : cloudSyncStatus === 'error'
                          ? 'var(--danger-color)'
                          : 'var(--success-color)',
                      border: `1px solid ${
                        cloudSyncStatus === 'syncing'
                          ? 'var(--info-color)'
                          : cloudSyncStatus === 'error'
                            ? 'var(--danger-color)'
                            : 'var(--success-color)'
                      }`
                    }}>
                      {cloudSyncStatus === 'syncing'
                        ? t('ui.savingChanges')
                        : cloudSyncStatus === 'error'
                          ? t('ui.errorSaving')
                          : t('ui.autosaveActive')}
                    </span>
                  </div>
                  {cloudActiveComiteName && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                      {t('ui.committeeOnScreen')} <strong>{cloudActiveComiteName}</strong>
                    </div>
                  )}
                  {cloudLastSync && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--muted-text)', marginTop: '2px', opacity: 0.85 }}>
                      {t('ui.lastSaved')} {cloudLastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    title={t('ui.refreshCommitteeList')}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      cursor: loading ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
                    <span>{t('ui.refresh')}</span>
                  </button>

                  <button
                    onClick={desconectarCloud}
                    title={t('ui.signOutOfTheConference')}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--danger-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      padding: '5px 10px',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <LogOut size={13} />
                    <span>{t('ui.disconnect')}</span>
                  </button>
                </div>
              </div>

              {/* Botón para Crear / Guardar Nuevo Comité */}
              {!mostrarCrear ? (
                <button
                  onClick={() => setMostrarCrear(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.7rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px dashed var(--accent-color)',
                    color: 'var(--accent-color)',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={16} />
                  <span>{t('ui.saveCurrentSessionAsANewCommitteeInTheCloud')}</span>
                </button>
              ) : (
                <form
                  onSubmit={handleGuardarNuevo}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}
                >
                  <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color)' }}>
                    {t('ui.committeeProjectName')}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder={t('ui.eGDisecSecurityCouncilCrisis')}
                      required
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: 'var(--border-radius, 6px)',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        fontSize: '0.82rem'
                      }}
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 'var(--border-radius, 6px)',
                        backgroundColor: 'var(--btn-bg)',
                        color: 'var(--btn-text)',
                        border: 'none',
                        fontWeight: '600',
                        fontSize: '0.78rem',
                        cursor: loading ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Save size={14} />
                      <span>{t('ui.save')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarCrear(false)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 'var(--border-radius, 6px)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      {t('toast.cancelBtn')}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Comités Guardados */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted-text)' }}>
                    {t('ui.savedCommittees')}{cloudComitesList.length})
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                    {t('ui.clickLoadToContinueTheDebate')}
                  </span>
                </div>

                {cloudComitesList.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2.5rem 1rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px dashed var(--subborder-color)',
                      borderRadius: 'var(--border-radius, 6px)'
                    }}
                  >
                    <FileText size={32} style={{ color: 'var(--muted-text)', opacity: 0.5, marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                      {t('ui.noCommitteesSavedInThisConference')}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', marginTop: '0.2rem' }}>
                      {t('ui.useTheButtonAboveToSaveTheCurrentSessionTo')}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '320px', overflowY: 'auto' }}>
                    {cloudComitesList.map((comite) => {
                      const isActive = cloudActiveComiteName === comite.name;
                      return (
                        <div
                          key={comite.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            borderRadius: 'var(--border-radius, 6px)',
                            backgroundColor: isActive ? 'var(--accent-soft)' : 'var(--card-header-bg)',
                            border: `1px solid ${isActive ? 'var(--accent-color)' : 'var(--subborder-color)'}`,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                            <div
                              style={{
                                color: isActive ? 'var(--accent-color)' : 'var(--muted-text)',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <FileText size={18} />
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontSize: '0.84rem',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  color: 'var(--text-color)'
                                }}
                              >
                                {comite.name}
                                {isActive && (
                                  <span
                                    style={{
                                      marginLeft: '0.5rem',
                                      fontSize: '0.65rem',
                                      backgroundColor: 'var(--accent-soft)',
                                      color: 'var(--accent-color)',
                                      border: '1px solid var(--accent-color)',
                                      padding: '1px 5px',
                                      borderRadius: 'var(--border-radius, 6px)',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {t('ui.loaded')}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                                <Calendar size={11} />
                                <span>{formatDate(comite.updated_at)}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            <button
                              onClick={() => handleCargarComite(comite)}
                              title={t('ui.loadAndApplyThisCommitteeSData')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                backgroundColor: 'var(--btn-bg)',
                                color: 'var(--btn-text)',
                                border: 'none',
                                borderRadius: 'var(--border-radius, 6px)',
                                padding: '5px 10px',
                                fontSize: '0.74rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              <Download size={12} />
                              <span>{t('ui.load')}</span>
                            </button>

                            <button
                              onClick={() => handleSobrescribir(comite)}
                              title={t('ui.updateThisCommitteeWithTheDataOnScreen')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                backgroundColor: 'transparent',
                                color: 'var(--text-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius, 6px)',
                                padding: '5px 9px',
                                fontSize: '0.74rem',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              <RefreshCw size={12} />
                              <span>{t('ui.overwrite')}</span>
                            </button>

                            <button
                              onClick={() => handleEliminar(comite)}
                              title={t('ui.deleteThisCommitteeFromTheCloud')}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: 'transparent',
                                color: 'var(--muted-text)',
                                border: 'none',
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
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal de Confirmación Reutilizado */}
        {confirmConfig && (
          <ConfirmModal
            isOpen={Boolean(confirmConfig)}
            onClose={() => setConfirmConfig(null)}
            onConfirm={confirmConfig.onConfirm}
            title={confirmConfig.title}
            message={confirmConfig.message}
            highlightText={confirmConfig.highlightText}
            submessage={confirmConfig.submessage}
            confirmText={confirmConfig.confirmText}
            cancelText={confirmConfig.cancelText}
            type={confirmConfig.type}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default CloudSessionsModal;
