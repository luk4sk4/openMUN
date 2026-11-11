import React, { useEffect } from 'react';
import { X, Sliders, Info, Zap, Hand, Lock, Mail, FileText, Vote, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';

/**
 * SecretariatSettingsModal
 * Modal de ajustes y permisos de sala para Secretaría,
 * alineado con el sistema de diseño de OpenMUN (openmun-design).
 */
const SecretariatSettingsModal = ({
  isOpen,
  onClose,
  roomSettings: propSettings,
  updateRoomSettings: propUpdate
}) => {
  const { t } = useTranslation();
  const p2p = useP2P();

  const roomSettings = propSettings || p2p.roomSettings || {};
  const updateRoomSettings = propUpdate || p2p.updateRoomSettings;

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const requestModeOptions = [
    { value: 'direct', label: t('liveSession.requestModeDirect', 'Directas'), icon: Zap },
    { value: 'approval', label: t('liveSession.requestModeApproval', 'Con Aprobación'), icon: Hand },
    { value: 'disabled', label: t('liveSession.requestModeDisabled', 'Deshabilitadas'), icon: Lock }
  ];

  const permissionsList = [
    {
      key: 'allowDelegateNotes',
      label: t('liveSession.allowDelegateNotes', 'Notas entre delegados'),
      desc: t('liveSession.allowDelegateNotesDesc', 'Permite el intercambio de notas entre delegaciones'),
      icon: Mail
    },
    {
      key: 'requireStaffNoteApproval',
      label: t('ui.requireStaffApprovalForDelegateNotes', 'Aprobación de pajes para notas'),
      desc: t('ui.staffMustApproveEachNoteBeforeDeliveryWithoutStaffNotes', 'Los pajes/secretaría deben aprobar cada nota antes de su entrega'),
      icon: ShieldCheck
    },
    {
      key: 'allowChairNotes',
      label: t('liveSession.allowChairNotes', 'Notas a la Mesa'),
      desc: t('liveSession.allowChairNotesDesc', 'Permite mensajes directos a la Mesa'),
      icon: Mail
    },
    {
      key: 'allowMotions',
      label: t('liveSession.allowMotions', 'Proponer mociones'),
      desc: t('liveSession.allowMotionsDesc', 'Permite a los delegados proponer mociones'),
      icon: FileText
    },
    {
      key: 'allowLiveVoting',
      label: t('liveSession.allowLiveVoting', 'Votación en vivo'),
      desc: t('liveSession.allowLiveVotingDesc', 'Permite votar desde el dispositivo'),
      icon: Vote
    }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="secretariat-settings-modal-title"
        style={{
          backgroundColor: 'var(--panel-color, #363636)',
          border: '1px solid var(--border-color, #4b4b4b)',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45)',
          color: 'var(--text-color, #f7f2eb)',
          fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderBottom: '1px solid var(--subborder-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card-header-bg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Sliders size={17} style={{ color: 'var(--accent-color)' }} />
            <h3
              id="secretariat-settings-modal-title"
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 650,
                color: 'var(--text-color)'
              }}
            >
              {t('views.secretariat.settingsPermissions', 'Ajustes y Permisos')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Cerrar')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--border-radius, 6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s ease, color 0.15s ease'
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
            <X size={16} />
          </button>
        </div>

        {/* Contenido / Cuerpo */}
        <div
          style={{
            padding: '1.15rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* Aviso informativo de sincronización */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.75rem 0.9rem',
              backgroundColor: 'var(--accent-soft)',
              border: '1px solid var(--subborder-color)',
              borderRadius: 'var(--border-radius, 6px)'
            }}
          >
            <Info size={16} style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-color)', lineHeight: 1.4 }}>
              {t('ui.changesMadeByTheSecretariatSyncImmediatelyWithTheChair', 'Los cambios realizados por la Secretaría se sincronizan inmediatamente con la Mesa.')}
            </span>
          </div>

          {/* Solicitudes de Oradores: GSL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-color)' }}>
              {t('liveSession.gslRequestMode', 'Modo de Solicitudes a la Lista de Oradores (GSL)')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', marginBottom: '0.2rem' }}>
              {t('liveSession.gslRequestModeDesc', 'Define cómo se procesan las peticiones de los delegados para incorporarse a la Lista General de Oradores.')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {requestModeOptions.map(({ value, label, icon: Icon }) => {
                const isSelected = (roomSettings.speakerRequestMode || 'direct') === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateRoomSettings?.({ speakerRequestMode: value })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 0.5rem',
                      borderRadius: 'var(--border-radius, 6px)',
                      border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                      color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                      fontWeight: isSelected ? 650 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Solicitudes de Oradores: Caucus / Debate */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-color)' }}>
              {t('liveSession.caucusRequestMode', 'Modo de Solicitudes a Debate')}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', marginBottom: '0.2rem' }}>
              {t('ui.controlHowDelegatesJoinTheListDuringAModeratedDebate', 'Controla cómo se incorporan los delegados a la lista durante un debate')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {requestModeOptions.map(({ value, label, icon: Icon }) => {
                const isSelected = (roomSettings.caucusRequestMode || 'direct') === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateRoomSettings?.({ caucusRequestMode: value })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 0.5rem',
                      borderRadius: 'var(--border-radius, 6px)',
                      border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                      backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                      color: isSelected ? 'var(--accent-color)' : 'var(--text-color)',
                      fontWeight: isSelected ? 650 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permisos y Capacidades de Delegados */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-color)' }}>
              {t('liveSession.delegatePermissions', 'Permisos de Delegados')}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {permissionsList.map(({ key, label, desc, icon: Icon }) => {
                const checked = Boolean(roomSettings[key]);
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.85rem',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: checked ? 'var(--card-hover)' : 'transparent',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: 'var(--border-radius, 6px)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <Icon size={15} style={{ color: checked ? 'var(--accent-color)' : 'var(--muted-text)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-color)' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)', marginTop: '1px' }}>
                          {desc}
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => updateRoomSettings?.({ [key]: e.target.checked })}
                      style={{
                        width: '17px',
                        height: '17px',
                        cursor: 'pointer',
                        accentColor: 'var(--accent-color)',
                        flexShrink: 0
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pie del modal */}
        <div
          style={{
            padding: '0.85rem 1.15rem',
            borderTop: '1px solid var(--subborder-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            background: 'var(--card-header-bg)'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--btn-bg)',
              color: 'var(--btn-text, #ffffff)',
              border: 'none',
              borderRadius: 'var(--border-radius, 6px)',
              padding: '0.5rem 1.15rem',
              fontSize: '0.82rem',
              fontWeight: 650,
              cursor: 'pointer',
              transition: 'opacity 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {t('common.done', 'Listo')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecretariatSettingsModal;
