import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  ArrowLeft, 
  Key, 
  ShieldCheck, 
  User, 
  Lock, 
  Globe, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Eye, 
  EyeOff, 
  Building2, 
  ShieldAlert, 
  CheckCircle2,
  Sun,
  Moon,
  Megaphone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';

const JoinSessionView = ({ isLight: propIsLight, onBackToChair }) => {
  const { t } = useTranslation();
  const { joinRoom, connectionStatus, error, roomId: defaultRoomId } = useP2P();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const [roomIdInput, setRoomIdInput] = useState('');
  const [selectedRole, setSelectedRole] = useState('delegate'); // 'delegate' | 'secretariat' | 'staff' | 'backroom'
  const [passwordInput, setPasswordInput] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Si viene en la URL ?room=MUN-XXXX
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      const urlRole = params.get('role');
      if (urlRoom) setRoomIdInput(urlRoom.toUpperCase());
      else if (defaultRoomId) setRoomIdInput(defaultRoomId);

      if (urlRole && ['delegate', 'secretariat', 'backroom'].includes(urlRole)) {
        setSelectedRole(urlRole);
      }
    }
  }, [defaultRoomId]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!roomIdInput.trim()) {
      alert('Por favor introduce el código de la sala');
      return;
    }

    setIsSubmitting(true);
    const success = await joinRoom({
      targetRoomId: roomIdInput.trim().toUpperCase(),
      targetRole: selectedRole,
      password: passwordInput,
      country: ''
    });
    setIsSubmitting(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
      position: 'relative'
    }}>
      <AccessibilityModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      {/* Botón Volver a la Mesa Principal */}
      <button
        onClick={onBackToChair}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          background: 'transparent',
          border: '1px solid var(--subborder-color)',
          borderRadius: '10px',
          color: 'var(--muted-text)',
          padding: '0.55rem 0.95rem',
          fontSize: '0.82rem',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          transition: 'all 0.15s ease'
        }}
      >
        <ArrowLeft size={16} /> {t('views.join.backToHome', 'Volver a Modo Mesa (Chair)')}
      </button>

      {/* Controles de Accesibilidad y Tema en esquina superior derecha */}
      <div style={{
        position: 'absolute',
        top: '24px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <button
          onClick={() => setIsAccessModalOpen(true)}
          style={{
            background: 'transparent',
            border: '1px solid var(--subborder-color)',
            borderRadius: '10px',
            color: 'var(--text-color)',
            padding: '0.55rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease'
          }}
          title={t('accessibility.title', "Accesibilidad y Tema")}
        >
          <Eye size={15} /> {t('accessibility.title', 'Accesibilidad')}
        </button>
        <button
          onClick={toggleThemeMode}
          style={{
            background: 'transparent',
            border: '1px solid var(--subborder-color)',
            borderRadius: '10px',
            color: 'var(--text-color)',
            padding: '0.55rem 0.7rem',
            fontSize: '0.82rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease'
          }}
          title={isLight ? t('header.darkMode', "Cambiar a Modo Oscuro") : t('header.lightMode', "Cambiar a Modo Claro")}
        >
          {isLight ? <Moon size={15} /> : <Sun size={15} />}
        </button>
        <LanguageSelector showIcon={false} />
      </div>

      <div style={{
        backgroundColor: 'var(--panel-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '20px',
        padding: '2.5rem 2.2rem',
        maxWidth: '520px',
        width: '100%',
        boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {/* Encabezado y Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.85rem' }}>
          <OpenMunLogo height={46} isLight={isLight} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              {t('views.join.title', 'Unirse a Sala en Vivo')}
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--muted-text)' }}>
              {t('views.join.subtitle', 'Conéctate a la sesión activa en tiempo real')}
            </p>
          </div>
        </div>

        {/* Mensaje de Error si ocurrió alguno */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            color: '#f87171',
            fontSize: '0.82rem'
          }}>
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Código de Sala */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Código de Sala (Room ID)
            </label>
            <div style={{ position: 'relative', marginTop: '0.4rem' }}>
              <input
                type="text"
                placeholder="Ej: MUN-4921"
                value={roomIdInput}
                onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  color: 'var(--text-color)',
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  fontSize: '1.15rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}
              />
              <Radio size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-text)' }} />
            </div>
          </div>

          {/* Selector de Rol en Tarjetas */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tipo de Acceso / Rol
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.4rem' }}>
              {/* Delegado */}
              <div
                onClick={() => setSelectedRole('delegate')}
                style={{
                  border: `1.5px solid ${selectedRole === 'delegate' ? '#22c55e' : 'var(--subborder-color)'}`,
                  backgroundColor: selectedRole === 'delegate' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.3rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <User size={18} color={selectedRole === 'delegate' ? '#22c55e' : 'var(--muted-text)'} />
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: selectedRole === 'delegate' ? '#22c55e' : 'var(--text-color)' }}>
                  Delegado
                </span>
              </div>

              {/* Secretaría */}
              <div
                onClick={() => setSelectedRole('secretariat')}
                style={{
                  border: `1.5px solid ${selectedRole === 'secretariat' ? '#3b82f6' : 'var(--subborder-color)'}`,
                  backgroundColor: selectedRole === 'secretariat' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.3rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Layers size={18} color={selectedRole === 'secretariat' ? '#3b82f6' : 'var(--muted-text)'} />
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: selectedRole === 'secretariat' ? '#3b82f6' : 'var(--text-color)' }}>
                  Secretaría
                </span>
              </div>

              {/* Staff */}
              <div
                onClick={() => setSelectedRole('staff')}
                style={{
                  border: `1.5px solid ${selectedRole === 'staff' ? '#10b981' : 'var(--subborder-color)'}`,
                  backgroundColor: selectedRole === 'staff' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.3rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Megaphone size={18} color={selectedRole === 'staff' ? '#10b981' : 'var(--muted-text)'} />
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: selectedRole === 'staff' ? '#10b981' : 'var(--text-color)' }}>
                  Staff
                </span>
              </div>

              {/* Backroom */}
              <div
                onClick={() => setSelectedRole('backroom')}
                style={{
                  border: `1.5px solid ${selectedRole === 'backroom' ? '#f97316' : 'var(--subborder-color)'}`,
                  backgroundColor: selectedRole === 'backroom' ? 'rgba(249, 115, 22, 0.12)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.3rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldAlert size={18} color={selectedRole === 'backroom' ? '#f97316' : 'var(--muted-text)'} />
                <span style={{ fontSize: '0.76rem', fontWeight: '800', color: selectedRole === 'backroom' ? '#f97316' : 'var(--text-color)' }}>
                  Backroom
                </span>
              </div>
            </div>
          </div>

          {/* Formulario según el Rol seleccionado */}
          {selectedRole === 'delegate' ? (
            <div style={{
              backgroundColor: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem'
            }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#22c55e',
                flexShrink: 0
              }}>
                <Globe size={20} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-color)' }}>
                  Acceso de Delegaciones Oficiales
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', lineHeight: '1.35' }}>
                  Al conectar, recibirás la lista oficial de países configurada en la sesión para que elijas tu delegación asignada.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Contraseña de Acceso ({selectedRole === 'secretariat' ? 'Secretaría' : selectedRole === 'staff' ? 'Staff' : 'Backroom'})
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  placeholder="Introduce la contraseña proporcionada por el Chair"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '10px',
                    padding: '0.75rem 2.5rem 0.75rem 1rem',
                    color: 'var(--text-color)',
                    fontSize: '0.88rem'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted-text)',
                    cursor: 'pointer'
                  }}
                >
                  {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Botón de Enviar */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              backgroundColor: 'var(--btn-bg)',
              color: 'var(--btn-text)',
              border: 'none',
              borderRadius: '10px',
              padding: '0.85rem',
              fontWeight: '800',
              fontSize: '0.92rem',
              cursor: isSubmitting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <Radio size={17} /> {isSubmitting ? 'Conectando...' : 'Entrar a la Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinSessionView;
