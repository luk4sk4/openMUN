import React, { useState } from 'react';
import {
  Building2,
  Lock,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
  ExternalLink,
  Mail,
  Clock,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  ArrowRight
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
    // Sugerir ID automáticamente si no se ha escrito uno manual
    if (!confId || confId === slugify(nombre)) {
      setConfId(slugify(val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombre.trim()) {
      setErrorMsg(t('ui.conferenceNameIsRequired'));
      return;
    }
    if (!confId.trim()) {
      setErrorMsg(t('ui.conferenceCodeIdIsRequired'));
      return;
    }
    if (!pinAdmin.trim()) {
      setErrorMsg(t('ui.theSecretariatAdminPinIsRequiredToProtectTheEvent'));
      return;
    }
    if (requierePinAcceso && !pinAcceso.trim()) {
      setErrorMsg(t('ui.pleaseEnterTheGeneralAccessPinOrUncheckTheOption'));
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
      setErrorMsg(err.message || t('ui.errorCreatingTheConferenceOnTheServer'));
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
      className="openmun-create-conference-page"
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

      {/* Contenido Principal */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
          padding: '2.5rem 1rem 4rem 1rem',
          boxSizing: 'border-box'
        }}
      >
        <div
          className="openmun-create-conference-card"
          style={{
            backgroundColor: 'var(--panel-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius, 6px)',
            padding: '2rem',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}
        >
          {/* Cabecera del Documento / Formulario */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.9rem'
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--border-radius, 6px)',
                backgroundColor: 'var(--card-header-bg)',
                border: '1px solid var(--subborder-color)',
                color: 'var(--accent-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Building2 size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <h1
                style={{
                  fontSize: '1.35rem',
                  fontWeight: '700',
                  margin: '0 0 0.35rem 0',
                  color: 'var(--text-color)',
                  letterSpacing: '-0.01em'
                }}
              >
                {t('conferences.createTitle', 'Crear Nueva Conferencia')}
              </h1>
              <p
                style={{
                  fontSize: '0.86rem',
                  lineHeight: '1.45',
                  color: 'var(--muted-text)',
                  margin: 0
                }}
              >
                {t(
                  'conferences.createSubtitle',
                  'Genera el espacio central de tu evento para gestionar múltiples comités y sincronizarlos en vivo.'
                )}
              </p>
            </div>
          </div>

          {creacionExitosa ? (
            /* Vista de Éxito */
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                paddingTop: '0.5rem'
              }}
            >
              {/* Banner de confirmación */}
              <div
                style={{
                  backgroundColor: 'var(--success-soft)',
                  border: '1px solid var(--success-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem'
                }}
              >
                <CheckCircle2
                  size={24}
                  style={{ color: 'var(--success-color)', flexShrink: 0, marginTop: '2px' }}
                />
                <div>
                  <h2
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      margin: '0 0 0.25rem 0',
                      color: 'var(--text-color)'
                    }}
                  >
                    {t('conferences.createdSuccess', '¡Conferencia creada con éxito!')}
                  </h2>
                  <p
                    style={{
                      fontSize: '0.85rem',
                      lineHeight: '1.45',
                      color: 'var(--muted-text)',
                      margin: 0
                    }}
                  >
                    {t('ui.yourEventIsReadyOnTheServerShareTheCode')}
                  </p>
                </div>
              </div>

              {/* Ficha resumen de credenciales */}
              <div
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '1.15rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.88rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                    {t('conferences.confName', 'Conferencia')}:
                  </span>
                  <strong style={{ color: 'var(--text-color)' }}>{creacionExitosa.nombre}</strong>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--subborder-color)',
                    paddingTop: '0.6rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                    {t('conferences.confId', 'Código / Identificador (ID)')}:
                  </span>
                  <code
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      backgroundColor: 'var(--panel-color)',
                      border: '1px solid var(--border-color)',
                      fontWeight: '700',
                      fontFamily: 'monospace',
                      color: 'var(--accent-color)'
                    }}
                  >
                    {creacionExitosa.id}
                  </code>
                </div>

                <div
                  style={{
                    borderTop: '1px solid var(--subborder-color)',
                    paddingTop: '0.6rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                    {t('conferences.adminPin', 'PIN de Organización (Admin)')}:
                  </span>
                  <strong style={{ color: 'var(--text-color)', fontFamily: 'monospace' }}>
                    {creacionExitosa.pin_admin}
                  </strong>
                </div>

                {creacionExitosa.email_admin && (
                  <div
                    style={{
                      borderTop: '1px solid var(--subborder-color)',
                      paddingTop: '0.6rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                      {t('ui.secretariatEmailAddress')}
                    </span>
                    <strong style={{ color: 'var(--text-color)' }}>
                      {creacionExitosa.email_admin}
                    </strong>
                  </div>
                )}

                {creacionExitosa.pin_acceso && (
                  <div
                    style={{
                      borderTop: '1px solid var(--subborder-color)',
                      paddingTop: '0.6rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                      {t('conferences.accessPin', 'PIN de Acceso General')}:
                    </span>
                    <strong style={{ color: 'var(--text-color)', fontFamily: 'monospace' }}>
                      {creacionExitosa.pin_acceso}
                    </strong>
                  </div>
                )}
              </div>

              {/* Avisos operativos de retención y respaldo */}
              <div
                style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: 'var(--border-radius, 6px)',
                  padding: '1rem 1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.82rem',
                  lineHeight: '1.45'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <Clock
                    size={16}
                    style={{ color: 'var(--warning-color)', flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ color: 'var(--text-color)' }}>{t('ui.inactivity')}</strong>{' '}
                    <span style={{ color: 'var(--muted-text)' }}>
                      {t(
                        'conferences.inactivityNotice',
                        'Un mes de inactividad provocará el cierre y eliminación automática de la conferencia para optimizar recursos del servidor.'
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <Mail
                    size={16}
                    style={{ color: 'var(--info-color)', flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ color: 'var(--text-color)' }}>{t('ui.backupArchive')}</strong>{' '}
                    <span style={{ color: 'var(--muted-text)' }}>
                      {t(
                        'conferences.archiveEmailNotice',
                        'Puedes añadir un correo electrónico en la configuración para recibir el archive (copia de seguridad) de tu conferencia.'
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <AlertCircle
                    size={16}
                    style={{ color: 'var(--muted-text)', flexShrink: 0, marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ color: 'var(--text-color)' }}>{t('ui.announcementsAndMessages')}</strong>{' '}
                    <span style={{ color: 'var(--muted-text)' }}>
                      {t(
                        'conferences.announcementsNotice',
                        'Los avisos y mensajes emitidos en la conferencia se borran automáticamente a las 24 horas.'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción posterior a la creación */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  marginTop: '0.5rem'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleNavigateToConference('admin')}
                  style={{
                    flex: '1 1 200px',
                    padding: '0.75rem 1.15rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'var(--btn-bg)',
                    color: 'var(--btn-text)',
                    border: 'none',
                    fontWeight: '650',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'opacity 0.15s ease'
                  }}
                >
                  <Shield size={16} />
                  <span>{t('conferences.goToAdmin', 'Ir al Panel de Secretaría')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateToConference('explore')}
                  style={{
                    padding: '0.75rem 1.15rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-color)',
                    fontWeight: '600',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <Building2 size={16} />
                  <span>{t('conferences.exploreCommittees', 'Ver Comités')}</span>
                </button>

                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--border-radius, 6px)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--subborder-color)',
                      color: 'var(--muted-text)',
                      fontWeight: '500',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <ArrowLeft size={15} />
                    <span>{t('common.backToApp', 'Volver al Inicio')}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Formulario de Creación */
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
              }}
            >
              {/* Bloque Informativo de Infraestructura y Donaciones */}
              <div
                style={{
                  padding: '1rem 1.15rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.84rem',
                  lineHeight: '1.5',
                  color: 'var(--text-color)'
                }}
              >
                <p style={{ margin: 0, color: 'var(--text-color)' }}>
                  {t('ui.keepingAConferenceConnectedInRealTimeUsesOurServer2')}
                </p>

                <div>
                  <a
                    href="https://buymeacoffee.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--border-radius, 6px)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-color)',
                      fontWeight: '600',
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                      transition: 'background-color 0.15s ease, border-color 0.15s ease'
                    }}
                  >
                    <span>{t('liveSession.donateButton')}</span>
                    <ExternalLink size={13} style={{ color: 'var(--accent-color)' }} />
                  </a>
                </div>
              </div>

              {/* Mensaje de Error */}
              {errorMsg && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    backgroundColor: 'var(--danger-soft)',
                    border: '1px solid var(--danger-color)',
                    color: 'var(--danger-color)',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem'
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Campo: Nombre de la Conferencia */}
              <div>
                <label
                  htmlFor="conf-name-input"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    marginBottom: '0.35rem',
                    color: 'var(--text-color)'
                  }}
                >
                  {t('conferences.confName', 'Nombre de la Conferencia')}
                  <span style={{ color: 'var(--accent-color)', marginLeft: '0.2rem' }}>*</span>
                </label>
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
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-color)',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-family)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Campo: Código / Identificador (ID) */}
              <div>
                <label
                  htmlFor="conf-id-input"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    marginBottom: '0.35rem',
                    color: 'var(--text-color)'
                  }}
                >
                  {t('conferences.confId', 'Código / Identificador (ID)')}
                  <span style={{ color: 'var(--accent-color)', marginLeft: '0.2rem' }}>*</span>
                </label>
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
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-color)',
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box'
                  }}
                />
                <span
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--muted-text)',
                    marginTop: '0.3rem',
                    display: 'block'
                  }}
                >
                  {t(
                    'conferences.confIdHelp',
                    'Identificador único y corto para que los delegados encuentren tu evento.'
                  )}
                </span>
              </div>

              {/* Campo: Correo Electrónico de Secretaría (Opcional) */}
              <div>
                <label
                  htmlFor="conf-email-input"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    marginBottom: '0.35rem',
                    color: 'var(--text-color)'
                  }}
                >
                  {t('ui.secretariatEmailAddressOptional')}
                </label>
                <input
                  id="conf-email-input"
                  type="email"
                  value={emailAdmin}
                  onChange={(e) => setEmailAdmin(e.target.value)}
                  placeholder={t('ui.eGSecretariatHmunOrg')}
                  className="openmun-input"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--border-radius, 6px)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-color)',
                    fontSize: '0.88rem',
                    fontFamily: 'var(--font-family)',
                    boxSizing: 'border-box'
                  }}
                />
                <span
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--muted-text)',
                    marginTop: '0.3rem',
                    display: 'block'
                  }}
                >
                  {t('ui.receiveAutomaticBackupsAndAdministrativeNotifications')}
                </span>
              </div>

              {/* Campo: PIN de Organización (Admin) */}
              <div>
                <label
                  htmlFor="conf-admin-pin"
                  style={{
                    display: 'block',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    marginBottom: '0.35rem',
                    color: 'var(--text-color)'
                  }}
                >
                  {t('conferences.adminPin', 'PIN de Organización (Admin)')}
                  <span style={{ color: 'var(--accent-color)', marginLeft: '0.2rem' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="conf-admin-pin"
                    type={mostrarPinAdmin ? 'text' : 'password'}
                    required
                    value={pinAdmin}
                    onChange={(e) => setPinAdmin(e.target.value)}
                    placeholder={t('ui.eGSecret2026')}
                    className="openmun-input"
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.6rem 0.65rem 0.85rem',
                      borderRadius: 'var(--border-radius, 6px)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--input-bg)',
                      color: 'var(--text-color)',
                      fontSize: '0.88rem',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPinAdmin(!mostrarPinAdmin)}
                    aria-label={mostrarPinAdmin ? t('ui.hidePin') : t('ui.showPin')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--muted-text)',
                      cursor: 'pointer',
                      padding: '0.35rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {mostrarPinAdmin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--muted-text)',
                    marginTop: '0.3rem',
                    display: 'block'
                  }}
                >
                  {t(
                    'conferences.adminPinHelp',
                    'Clave para acceder al panel de control, emitir avisos y crear comités.'
                  )}
                </span>
              </div>

              {/* Opción: Proteger acceso general con PIN */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    fontWeight: '600',
                    color: 'var(--text-color)',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={requierePinAcceso}
                    onChange={(e) => setRequierePinAcceso(e.target.checked)}
                    style={{
                      accentColor: 'var(--accent-color)',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>{t('conferences.requireAccessPin', 'Proteger acceso general con PIN')}</span>
                </label>

                {requierePinAcceso && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={mostrarPinAcceso ? 'text' : 'password'}
                        value={pinAcceso}
                        onChange={(e) => setPinAcceso(e.target.value)}
                        placeholder={t('ui.eGMun2026')}
                        className="openmun-input"
                        style={{
                          width: '100%',
                          padding: '0.6rem 2.6rem 0.6rem 0.85rem',
                          borderRadius: 'var(--border-radius, 6px)',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--input-bg)',
                          color: 'var(--text-color)',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPinAcceso(!mostrarPinAcceso)}
                        aria-label={mostrarPinAcceso ? t('ui.hideAccessPin') : t('ui.showAccessPin')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--muted-text)',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {mostrarPinAcceso ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--muted-text)'
                      }}
                    >
                      {t(
                        'conferences.accessPinHelp',
                        'Si se deja vacío, la lista de comités será pública para cualquier participante.'
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Botón de envío principal */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--border-radius, 6px)',
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  fontSize: '0.92rem',
                  fontWeight: '650',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.55rem',
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: 'opacity 0.15s ease'
                }}
              >
                <Building2 size={18} />
                <span>
                  {isSubmitting
                    ? t('ui.creatingConference')
                    : t('conferences.createBtn', 'Crear Conferencia')}
                </span>
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateConferenceView;
