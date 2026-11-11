import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
  AlertCircle,
  Copy,
  Check,
  HelpCircle,
  Clock,
  Coffee
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import conferenceService from '../../services/conferenceService';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import ConsoleNavbar from '../dashboard/ConsoleNavbar';

const CreateConferenceView = ({ onBack, isLight: propIsLight, onConferenceCreated }) => {
  const { t } = useTranslation();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const [nombre, setNombre] = useState('');
  const [confId, setConfId] = useState('');
  const [emailAdmin, setEmailAdmin] = useState('');
  const [pinAdmin, setPinAdmin] = useState('');
  const [requierePinAcceso, setRequierePinAcceso] = useState(false);
  const [pinAcceso, setPinAcceso] = useState('');

  const [mostrarPinAdmin, setMostrarPinAdmin] = useState(false);
  const [mostrarPinAcceso, setMostrarPinAcceso] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [creacionExitosa, setCreacionExitosa] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const slugify = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '')
      .substring(0, 16);
  };

  const handleNombreChange = (e) => {
    const val = e.target.value;
    setNombre(val);
    if (!confId || confId === slugify(nombre)) {
      setConfId(slugify(val));
    }
  };

  const handleCopy = (text, key) => {
    if (!navigator?.clipboard?.writeText) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }).catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombre.trim()) {
      setErrorMsg(t('ui.conferenceNameIsRequired', 'El nombre de la conferencia es obligatorio'));
      return;
    }
    if (!confId.trim()) {
      setErrorMsg(t('ui.conferenceCodeIdIsRequired', 'El código o ID es obligatorio'));
      return;
    }
    if (!pinAdmin.trim()) {
      setErrorMsg(t('ui.theSecretariatAdminPinIsRequiredToProtectTheEvent', 'El PIN de Administración es obligatorio'));
      return;
    }
    if (requierePinAcceso && !pinAcceso.trim()) {
      setErrorMsg(t('ui.pleaseEnterTheGeneralAccessPinOrUncheckTheOption', 'Introduce el PIN de acceso o desmarca la opción'));
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanEmail = emailAdmin.trim() || null;
      const res = await conferenceService.crearConferencia({
        id: confId.trim().toLowerCase(),
        nombre: nombre.trim(),
        pin_admin: pinAdmin.trim(),
        pin_acceso: requierePinAcceso ? pinAcceso.trim() : null,
        email_admin: cleanEmail
      });

      const confResult = {
        id: res.id || confId.trim().toLowerCase(),
        nombre: nombre.trim(),
        pin_admin: pinAdmin.trim(),
        pin_acceso: requierePinAcceso ? pinAcceso.trim() : null,
        email_admin: cleanEmail
      };

      conferenceService.guardarSesionActiva(confResult);
      setCreacionExitosa(confResult);

      if (typeof onConferenceCreated === 'function') {
        onConferenceCreated(confResult);
      }
    } catch (err) {
      setErrorMsg(err.message || t('ui.errorCreatingTheConferenceOnTheServer', 'Error al crear la conferencia'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToConference = (mode) => {
    window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
      detail: {
        view: 'conference',
        confId: creacionExitosa?.id,
        mode: mode
      }
    }));
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
        fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
        boxSizing: 'border-box'
      }}
    >
      <AccessibilityModal
        isOpen={isAccessModalOpen}
        onClose={() => setIsAccessModalOpen(false)}
      />

      <ConsoleNavbar
        title={t('conferences.createTitle', 'Crear Nueva Conferencia')}
        showContext={false}
        isLight={isLight}
        toggleThemeMode={toggleThemeMode}
        setIsAccessOpen={setIsAccessModalOpen}
        onBack={onBack}
      />

      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '960px',
          margin: '0 auto',
          padding: '1.25rem 1.25rem 2rem',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <div style={{ marginBottom: '1.25rem' }}>
          <h1
            data-tooltip={t(
              'conferences.createSubtitle',
              'Genera el espacio central de tu evento para gestionar múltiples comités y sincronizarlos en vivo.'
            )}
            data-tooltip-align="left"
            style={{
              fontSize: '1.4rem',
              fontWeight: '700',
              margin: 0,
              color: 'var(--text-color)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'help'
            }}
          >
            <span>{t('conferences.createTitle', 'Crear Nueva Conferencia')}</span>
            <HelpCircle size={15} className="openmun-field-label-icon" />
          </h1>
        </div>

        {creacionExitosa ? (
          /* Vista de Éxito Compacta */
          <div className="openmun-create-panel" style={{ gap: '1.25rem' }}>
            <div
              data-tooltip={t(
                'ui.yourEventIsReadyOnTheServerShareTheCode',
                'Tu conferencia ya está activa en el servidor. Comparte el código con tus participantes.'
              )}
              data-tooltip-align="left"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.65rem',
                color: 'var(--success-color)',
                alignSelf: 'flex-start',
                cursor: 'help'
              }}
            >
              <CheckCircle2 size={20} />
              <strong style={{ fontSize: '1rem', color: 'var(--text-color)' }}>
                {t('conferences.createdSuccess', '¡Conferencia creada con éxito!')}
              </strong>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                backgroundColor: 'var(--card-header-bg)',
                border: '1px solid var(--subborder-color)',
                borderRadius: 'var(--border-radius, 6px)',
                padding: '0.85rem 1rem'
              }}
            >
              <div
                data-tooltip={t(
                  'conferences.confNameSummaryTooltip',
                  'Nombre público con el que se mostrará la conferencia a todos los participantes.'
                )}
                data-tooltip-align="left"
                style={{ cursor: 'help' }}
              >
                <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                  {t('conferences.confName', 'Conferencia')}
                </span>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', marginTop: '0.15rem' }}>
                  {creacionExitosa.nombre}
                </div>
              </div>

              <div>
                <span
                  data-tooltip={t(
                    'conferences.confIdShareTooltip',
                    'Comparte este identificador único con delegados y mesas para que se unan a la conferencia.'
                  )}
                  data-tooltip-align="left"
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--muted-text)',
                    textTransform: 'uppercase',
                    cursor: 'help'
                  }}
                >
                  {t('conferences.confId', 'ID / Código')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                  <code
                    data-tooltip={`openmun.app/conf/${creacionExitosa.id}`}
                    data-tooltip-align="left"
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: '700',
                      color: 'var(--accent-color)',
                      cursor: 'help'
                    }}
                  >
                    {creacionExitosa.id}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(creacionExitosa.id, 'id')}
                    data-tooltip={
                      copiedKey === 'id'
                        ? t('common.copied', '¡Copiado!')
                        : t('conferences.copyIdTooltip', 'Copiar ID de la conferencia al portapapeles')
                    }
                    aria-label={t('conferences.copyIdTooltip', 'Copiar ID de la conferencia al portapapeles')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted-text)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                  >
                    {copiedKey === 'id' ? <Check size={14} style={{ color: 'var(--success-color)' }} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <span
                  data-tooltip={t(
                    'conferences.adminPinKeepSafeTooltip',
                    'Guarda este PIN en un lugar seguro: es necesario para administrar comités y secretaría.'
                  )}
                  data-tooltip-align="left"
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--muted-text)',
                    textTransform: 'uppercase',
                    cursor: 'help'
                  }}
                >
                  PIN Admin
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                  <code style={{ fontFamily: 'monospace', fontWeight: '700' }}>
                    {creacionExitosa.pin_admin}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(creacionExitosa.pin_admin, 'pin_admin')}
                    data-tooltip={
                      copiedKey === 'pin_admin'
                        ? t('common.copied', '¡Copiado!')
                        : t('conferences.copyPinTooltip', 'Copiar PIN de administración al portapapeles')
                    }
                    aria-label={t('conferences.copyPinTooltip', 'Copiar PIN de administración al portapapeles')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted-text)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                  >
                    {copiedKey === 'pin_admin' ? <Check size={14} style={{ color: 'var(--success-color)' }} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {creacionExitosa.pin_acceso && (
                <div
                  data-tooltip={t(
                    'conferences.accessPinShareTooltip',
                    'PIN general requerido para que los participantes puedan ver y entrar a los comités.'
                  )}
                  data-tooltip-align="left"
                  style={{ cursor: 'help' }}
                >
                  <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    PIN Acceso
                  </span>
                  <div style={{ marginTop: '0.15rem', fontFamily: 'monospace', fontWeight: '700' }}>
                    {creacionExitosa.pin_acceso}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleNavigateToConference('admin')}
                data-tooltip={t(
                  'conferences.goToAdminTooltip',
                  'Abrir el panel de Secretaría para crear comités y gestionar el evento'
                )}
                data-tooltip-align="left"
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  fontWeight: '650',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Shield size={15} />
                <span>{t('conferences.goToAdmin', 'Ir a Secretaría')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavigateToConference('explore')}
                data-tooltip={t(
                  'conferences.exploreCommitteesTooltip',
                  'Explorar la vista pública de comités de la conferencia'
                )}
                data-tooltip-align="left"
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-color)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Building2 size={15} />
                <span>{t('conferences.exploreCommittees', 'Ver Comités')}</span>
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  data-tooltip={t('conferences.backTooltip', 'Volver a la pantalla anterior')}
                  data-tooltip-align="left"
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--subborder-color)',
                    color: 'var(--muted-text)',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.backToApp', 'Volver')}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Formulario en 2 Columnas Compacto (Sin Scroll) */
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {errorMsg && (
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'var(--danger-soft)',
                  border: '1px solid var(--danger-color)',
                  color: 'var(--danger-color)',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="openmun-create-grid">
              {/* Columna 1: Datos de la Conferencia */}
              <div className="openmun-create-panel">
                <div>
                  <label
                    htmlFor="conf-name-input"
                    className="openmun-field-label"
                    data-tooltip={t(
                      'conferences.confNameTooltip',
                      'Nombre oficial completo del modelo o conferencia (ej. Harvard National MUN 2026).'
                    )}
                    data-tooltip-align="left"
                  >
                    <span>{t('conferences.confName', 'Nombre de la Conferencia')} *</span>
                    <HelpCircle size={13} className="openmun-field-label-icon" />
                  </label>
                  <div
                    data-tooltip={t(
                      'conferences.confNameInputTooltip',
                      'Escribe el nombre del evento; el código ID se sugerirá automáticamente.'
                    )}
                    data-tooltip-align="left"
                  >
                    <input
                      id="conf-name-input"
                      type="text"
                      required
                      value={nombre}
                      onChange={handleNombreChange}
                      placeholder={t('conferences.confNamePlaceholder', 'ej. Harvard National MUN 2026')}
                      className="openmun-input"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="conf-id-input"
                    className="openmun-field-label"
                    data-tooltip={t(
                      'conferences.confIdHelp',
                      'Identificador único y corto para que los delegados encuentren tu evento.'
                    )}
                    data-tooltip-align="left"
                  >
                    <span>{t('conferences.confId', 'Código / ID')} *</span>
                    <HelpCircle size={13} className="openmun-field-label-icon" />
                  </label>
                  <div
                    data-tooltip={t(
                      'conferences.confIdInputTooltip',
                      'Solo letras minúsculas, números, guiones (-) o guiones bajos (_), máx. 16 caracteres.'
                    )}
                    data-tooltip-align="left"
                  >
                    <input
                      id="conf-id-input"
                      type="text"
                      required
                      value={confId}
                      onChange={(e) =>
                        setConfId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                      }
                      placeholder={t('conferences.confIdPlaceholder', 'ej. hmun2026')}
                      className="openmun-input"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {confId && (
                    <span
                      data-tooltip={t(
                        'conferences.confIdUrlTooltip',
                        'Dirección e identificador rápido con el que se identificará tu conferencia.'
                      )}
                      data-tooltip-align="left"
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--muted-text)',
                        marginTop: '0.25rem',
                        display: 'inline-block',
                        fontFamily: 'monospace',
                        cursor: 'help'
                      }}
                    >
                      openmun.app/conf/{confId}
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="conf-email-input"
                    className="openmun-field-label"
                    data-tooltip={t(
                      'ui.receiveAutomaticBackupsAndAdministrativeNotifications',
                      'Recibe copias de seguridad automáticas (archive) y notificaciones administrativas de tu conferencia.'
                    )}
                    data-tooltip-align="left"
                  >
                    <span>{t('ui.secretariatEmailAddressOptional', 'Correo Electrónico de Secretaría (Opcional)')}</span>
                    <HelpCircle size={13} className="openmun-field-label-icon" />
                  </label>
                  <div
                    data-tooltip={t(
                      'conferences.emailInputTooltip',
                      'Opcional: correo donde recibirás el archivo de respaldo antes de que expire la conferencia.'
                    )}
                    data-tooltip-align="left"
                  >
                    <input
                      id="conf-email-input"
                      type="email"
                      value={emailAdmin}
                      onChange={(e) => setEmailAdmin(e.target.value)}
                      placeholder={t('ui.eGSecretariatHmunOrg', 'ej. secretaria@openmun.org')}
                      className="openmun-input"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.85rem',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Columna 2: Seguridad y PINs */}
              <div className="openmun-create-panel">
                <div>
                  <label
                    htmlFor="conf-admin-pin"
                    className="openmun-field-label"
                    data-tooltip={t(
                      'conferences.adminPinHelp',
                      'Clave maestra para acceder al panel de Secretaría, crear comités y publicar avisos globales.'
                    )}
                    data-tooltip-align="left"
                  >
                    <span>{t('conferences.adminPin', 'PIN de Organización (Admin)')} *</span>
                    <HelpCircle size={13} className="openmun-field-label-icon" />
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div
                      data-tooltip={t(
                        'conferences.adminPinInputTooltip',
                        'Define una contraseña o PIN seguro exclusivo para el equipo organizador (Secretaría).'
                      )}
                      data-tooltip-align="left"
                    >
                      <input
                        id="conf-admin-pin"
                        type={mostrarPinAdmin ? 'text' : 'password'}
                        required
                        value={pinAdmin}
                        onChange={(e) => setPinAdmin(e.target.value)}
                        placeholder={t('ui.eGSecret2026', 'ej. secret2026')}
                        className="openmun-input"
                        style={{
                          width: '100%',
                          padding: '0.55rem 2.4rem 0.55rem 0.75rem',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMostrarPinAdmin(!mostrarPinAdmin)}
                      aria-label={mostrarPinAdmin ? t('ui.hidePin', 'Ocultar PIN') : t('ui.showPin', 'Mostrar PIN')}
                      data-tooltip={mostrarPinAdmin ? t('ui.hidePin', 'Ocultar PIN') : t('ui.showPin', 'Mostrar PIN')}
                      data-tooltip-align="right"
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted-text)',
                        cursor: 'pointer',
                        padding: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        zIndex: 2
                      }}
                    >
                      {mostrarPinAdmin ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '0.25rem', display: 'block' }}>
                    {t('conferences.adminPinHelp', 'Clave para acceder a secretaría y crear comités.')}
                  </span>
                </div>

                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}
                >
                  <label
                    data-tooltip={t(
                      'conferences.accessPinHelp',
                      'Si se activa, los participantes necesitarán este PIN para ver la lista de comités. Si se deja desactivado, será pública.'
                    )}
                    data-tooltip-align="left"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      color: 'var(--text-color)',
                      userSelect: 'none'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={requierePinAcceso}
                      onChange={(e) => setRequierePinAcceso(e.target.checked)}
                      style={{ accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                    />
                    <span>{t('conferences.requireAccessPin', 'Proteger acceso general con PIN')}</span>
                    <HelpCircle size={13} className="openmun-field-label-icon" />
                  </label>

                  {requierePinAcceso && (
                    <div style={{ position: 'relative' }}>
                      <div
                        data-tooltip={t(
                          'conferences.accessPinInputTooltip',
                          'PIN compartido con los delegados y observadores para entrar a la conferencia.'
                        )}
                        data-tooltip-align="left"
                      >
                        <input
                          type={mostrarPinAcceso ? 'text' : 'password'}
                          value={pinAcceso}
                          onChange={(e) => setPinAcceso(e.target.value)}
                          placeholder={t('ui.eGMun2026', 'PIN para delegados')}
                          className="openmun-input"
                          style={{
                            width: '100%',
                            padding: '0.45rem 2.2rem 0.45rem 0.65rem',
                            fontSize: '0.82rem',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setMostrarPinAcceso(!mostrarPinAcceso)}
                        aria-label={mostrarPinAcceso ? t('ui.hideAccessPin', 'Ocultar PIN') : t('ui.showAccessPin', 'Mostrar PIN')}
                        data-tooltip={mostrarPinAcceso ? t('ui.hideAccessPin', 'Ocultar PIN') : t('ui.showAccessPin', 'Mostrar PIN')}
                        data-tooltip-align="right"
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted-text)',
                          cursor: 'pointer',
                          padding: '0.2rem',
                          display: 'flex',
                          alignItems: 'center',
                          zIndex: 2
                        }}
                      >
                        {mostrarPinAcceso ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    marginTop: 'auto',
                    paddingTop: '0.25rem'
                  }}
                >
                  <span
                    data-tooltip={t(
                      'conferences.retentionTooltip',
                      'La conferencia se elimina automáticamente tras 1 año sin actividad. Los avisos y mensajes se borran al mes de su envío.'
                    )}
                    data-tooltip-align="left"
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--muted-text)',
                      lineHeight: '1.4',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'help'
                    }}
                  >
                    <Clock size={13} style={{ flexShrink: 0 }} />
                    <span>{t('conferences.expiresShort', 'Expira tras 1 año sin actividad.')}</span>
                  </span>

                  <a
                    href="https://buymeacoffee.com/openmun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="openmun-donate-btn"
                    data-tooltip={t(
                      'conferences.donateTooltip',
                      'Mantener conferencias sincronizadas en tiempo real consume recursos del servidor. ¡Apoya a OpenMUN con una donación!'
                    )}
                    data-tooltip-align="right"
                  >
                    <Coffee size={13} style={{ color: 'var(--accent-color)', flexShrink: 0 }} />
                    <span>{t('conferences.donateBtnShort', 'Donar')}</span>
                    <ExternalLink size={11} style={{ opacity: 0.75, flexShrink: 0 }} />
                  </a>
                </div>
              </div>
            </div>

            {/* Barra de Acciones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                data-tooltip={t(
                  'conferences.createBtnTooltip',
                  'Registrar la conferencia en el servidor y obtener las credenciales de acceso'
                )}
                data-tooltip-align="left"
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: '650',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                <Building2 size={16} />
                <span>
                  {isSubmitting
                    ? t('ui.creatingConference', 'Creando...')
                    : t('conferences.createBtn', 'Crear Conferencia')}
                </span>
              </button>

              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  data-tooltip={t(
                    'conferences.cancelBtnTooltip',
                    'Cancelar la creación de la conferencia y volver atrás'
                  )}
                  data-tooltip-align="left"
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {t('common.cancel', 'Cancelar')}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default CreateConferenceView;
