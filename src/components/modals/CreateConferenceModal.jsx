import React, { useState } from 'react';
import {
  X,
  Building2,
  Key,
  Lock,
  CheckCircle2,
  Layers,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  Mail,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import conferenceService from '../../services/conferenceService';

const CreateConferenceModal = ({ isOpen, onClose, isLight, onConferenceCreated }) => {
  const { t } = useTranslation();

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

  if (!isOpen) return null;

  const handleNombreChange = (e) => {
    const val = e.target.value;
    setNombre(val);
    // Sugerir ID automáticamente si no se ha escrito uno manual
    if (!confId || confId === slugify(nombre)) {
      setConfId(slugify(val));
    }
  };

  const slugify = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '')
      .substring(0, 16);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!nombre.trim()) {
      setErrorMsg('El nombre de la conferencia es obligatorio.');
      return;
    }
    if (!confId.trim()) {
      setErrorMsg('El código / ID de la conferencia es obligatorio.');
      return;
    }
    if (!pinAdmin.trim()) {
      setErrorMsg('El PIN de Secretaría (Admin) es obligatorio para proteger el evento.');
      return;
    }
    if (requierePinAcceso && !pinAcceso.trim()) {
      setErrorMsg('Por favor introduce el PIN de acceso general o desmarca la opción.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Crear la conferencia (sin comités base)
      const cleanEmail = emailAdmin.trim() || null;
      const res = await conferenceService.crearConferencia({
        id: confId.trim().toLowerCase(),
        nombre: nombre.trim(),
        pin_admin: pinAdmin.trim(),
        pin_acceso: requierePinAcceso ? pinAcceso.trim() : null,
        email_admin: cleanEmail
      });

      const confResult = {
        id: res.id,
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
      setErrorMsg(err.message || 'Error al crear la conferencia en el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bgModal = isLight ? '#ffffff' : 'var(--panel-color)';
  const borderCol = 'var(--border-color)';
  const textMuted = 'var(--muted-text)';
  const headerBg = isLight ? '#f8fafc' : 'var(--card-header-bg)';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: bgModal,
        border: `1px solid ${borderCol}`,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: `1px solid ${borderCol}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: headerBg
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: isLight ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Building2 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-color)' }}>
                {t('conferences.createTitle', 'Crear Nueva Conferencia')}
              </h2>
              <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0 }}>
                {t('conferences.createSubtitle', 'Configura tu evento central con comités sincronizados.')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: textMuted,
              padding: '0.35rem',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {creacionExitosa ? (
            <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: isLight ? '#dcfce7' : 'rgba(34, 197, 94, 0.2)',
                color: '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '0 0 0.4rem 0', color: 'var(--text-color)' }}>
                  {t('conferences.createdSuccess', '¡Conferencia creada con éxito!')}
                </h3>
                <p style={{ fontSize: '0.9rem', color: textMuted, margin: 0 }}>
                  Tu evento ya está listo en el servidor. Comparte el código con tus mesas y delegados.
                </p>
              </div>

              <div style={{
                backgroundColor: headerBg,
                border: `1px solid ${borderCol}`,
                borderRadius: '12px',
                padding: '1rem',
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                fontSize: '0.88rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textMuted }}>{t('conferences.confName', 'Conferencia')}:</span>
                  <strong style={{ color: 'var(--text-color)' }}>{creacionExitosa.nombre}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textMuted }}>{t('conferences.confId', 'Código ID')}:</span>
                  <code style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '6px',
                    backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)',
                    fontWeight: '800',
                    color: '#3b82f6'
                  }}>
                    {creacionExitosa.id}
                  </code>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: textMuted }}>{t('conferences.adminPin', 'PIN Secretaría')}:</span>
                  <strong style={{ color: 'var(--text-color)' }}>{creacionExitosa.pin_admin}</strong>
                </div>
                {creacionExitosa.email_admin && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: textMuted }}>Email Secretaría:</span>
                    <strong style={{ color: 'var(--text-color)' }}>{creacionExitosa.email_admin}</strong>
                  </div>
                )}
                {creacionExitosa.pin_acceso && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: textMuted }}>{t('conferences.accessPin', 'PIN Acceso General')}:</span>
                    <strong style={{ color: 'var(--text-color)' }}>{creacionExitosa.pin_acceso}</strong>
                  </div>
                )}
              </div>

              {/* Avisos importantes sobre inactividad, backup y avisos */}
              <div style={{
                backgroundColor: headerBg,
                border: `1px solid ${borderCol}`,
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                fontSize: '0.82rem',
                lineHeight: '1.4'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: isLight ? '#b45309' : '#f59e0b' }}>
                  <Clock size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-color)' }}>Inactividad:</strong> {t('conferences.inactivityNotice', 'Un mes de inactividad provocará el cierre y eliminación automática de la conferencia para optimizar recursos del servidor.')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: '#3b82f6' }}>
                  <Mail size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-color)' }}>Copia de seguridad (Archive):</strong> {t('conferences.archiveEmailNotice', 'Puedes añadir un correo electrónico en la configuración para recibir el archive (copia de seguridad) de tu conferencia.')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: 'var(--text-color)' }}>Avisos y mensajes:</strong> {t('conferences.announcementsNotice', 'Los avisos y mensajes emitidos en la conferencia se borran automáticamente a las 24 horas.')}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
                      detail: { view: 'conference', confId: creacionExitosa.id, mode: 'admin' }
                    }));
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Shield size={16} /> {t('conferences.goToAdmin', 'Ir al Panel de Secretaría')}
                </button>

                <button
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
                      detail: { view: 'conference', confId: creacionExitosa.id, mode: 'explore' }
                    }));
                  }}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${borderCol}`,
                    color: 'var(--text-color)',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {t('conferences.exploreCommittees', 'Ver Comités')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Bloque Informativo de Donaciones (Infraestructura y Apoyo) */}
              <div style={{
                padding: '1rem 1.15rem',
                borderRadius: '12px',
                background: isLight 
                  ? 'linear-gradient(135deg, rgba(254, 243, 199, 0.7) 0%, rgba(253, 230, 138, 0.4) 100%)' 
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(180, 83, 9, 0.05) 100%)',
                border: isLight 
                  ? '1px solid rgba(245, 158, 11, 0.3)' 
                  : '1px solid rgba(245, 158, 11, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                fontSize: '0.84rem',
                lineHeight: '1.45',
                color: 'var(--text-color)'
              }}>
                <p style={{ margin: 0 }}>
                  Mantener una conferencia conectada a tiempo real consume recursos de nuestros servidores y bases de datos. Recuerda eliminar la conferencia una vez acabado el evento para no tomar más de lo necesario. Si puedes donar, aporta a la comunidad para mantener las funcionalidades gratuitas para todos.
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '0.1rem 0 0 0' }}>
                  <a
                    href="https://buymeacoffee.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      backgroundColor: '#ffdd00',
                      color: '#000000',
                      fontWeight: '800',
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(255, 221, 0, 0.2)',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Invítanos a un café / Donar <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {errorMsg && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: isLight ? '#b91c1c' : '#fca5a5',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Nombre de la Conferencia */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  {t('conferences.confName', 'Nombre de la Conferencia')} *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={handleNombreChange}
                  placeholder={t('conferences.confNamePlaceholder', 'ej. Harvard National MUN 2026')}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: headerBg,
                    color: 'var(--text-color)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              {/* ID de la Conferencia */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  {t('conferences.confId', 'Código / Identificador (ID)')} *
                </label>
                <input
                  type="text"
                  required
                  value={confId}
                  onChange={(e) => setConfId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder={t('conferences.confIdPlaceholder', 'ej. hmun2026')}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: headerBg,
                    color: 'var(--text-color)',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.25rem', display: 'block' }}>
                  {t('conferences.confIdHelp', 'Identificador único y corto para que los delegados encuentren tu evento.')}
                </span>
              </div>

              {/* Correo Electrónico de Secretaría (Admin) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  Correo Electrónico de Secretaría (Opcional)
                </label>
                <input
                  type="email"
                  value={emailAdmin}
                  onChange={(e) => setEmailAdmin(e.target.value)}
                  placeholder="ej. secretaria@hmun.org"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    backgroundColor: headerBg,
                    color: 'var(--text-color)',
                    fontSize: '0.9rem'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.25rem', display: 'block' }}>
                  Permite recibir respaldos automáticos y notificaciones administrativas.
                </span>
              </div>

              {/* PIN Secretaría (Admin) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
                  {t('conferences.adminPin', 'PIN de Secretaría (Admin)')} *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={mostrarPinAdmin ? 'text' : 'password'}
                    required
                    value={pinAdmin}
                    onChange={(e) => setPinAdmin(e.target.value)}
                    placeholder="ej. secret2026"
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderCol}`,
                      backgroundColor: headerBg,
                      color: 'var(--text-color)',
                      fontSize: '0.9rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPinAdmin(!mostrarPinAdmin)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: textMuted,
                      cursor: 'pointer'
                    }}
                  >
                    {mostrarPinAdmin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.25rem', display: 'block' }}>
                  {t('conferences.adminPinHelp', 'Clave para acceder al panel de control, emitir avisos y crear comités.')}
                </span>
              </div>

              {/* Opción de PIN de Acceso General */}
              <div style={{
                padding: '0.85rem',
                borderRadius: '10px',
                backgroundColor: headerBg,
                border: `1px solid ${borderCol}`
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '600' }}>
                  <input
                    type="checkbox"
                    checked={requierePinAcceso}
                    onChange={(e) => setRequierePinAcceso(e.target.checked)}
                  />
                  {t('conferences.requireAccessPin', 'Proteger acceso general con PIN')}
                </label>

                {requierePinAcceso && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={mostrarPinAcceso ? 'text' : 'password'}
                        value={pinAcceso}
                        onChange={(e) => setPinAcceso(e.target.value)}
                        placeholder="ej. mun2026"
                        style={{
                          width: '100%',
                          padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                          borderRadius: '6px',
                          border: `1px solid ${borderCol}`,
                          backgroundColor: bgModal,
                          color: 'var(--text-color)',
                          fontSize: '0.85rem'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPinAcceso(!mostrarPinAcceso)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: textMuted,
                          cursor: 'pointer'
                        }}
                      >
                        {mostrarPinAcceso ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: textMuted, marginTop: '0.2rem', display: 'block' }}>
                      {t('conferences.accessPinHelp', 'Si se deja vacío, la lista de comités será pública para cualquier participante.')}
                    </span>
                  </div>
                )}
              </div>

              {/* Botón Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)'
                }}
              >
                <Sparkles size={18} />
                {isSubmitting ? 'Creando conferencia...' : t('conferences.createBtn', 'Crear Conferencia')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateConferenceModal;
