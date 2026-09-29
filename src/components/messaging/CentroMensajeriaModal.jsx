import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Globe,
  X,
  Radio,
  Sparkles,
  Layers,
  Shield,
  Users,
  Bell
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';
import MensajeriaComite from './MensajeriaComite';
import MensajeriaConferencia from './MensajeriaConferencia';

const CentroMensajeriaModal = ({
  isOpen,
  onClose,
  isLight,
  initialTab = 'COMITE', // 'COMITE' | 'CONFERENCIA'
  currentRole = 'chair',
  currentComiteId,
  currentComiteNombre,
  conferenciaId,
  comites = []
}) => {
  const { t } = useTranslation();
  const p2p = useP2P();

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sincronizar tab inicial cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Listener para cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLiveActive = p2p.connectionStatus === 'host_active';
  const effectiveRole = currentRole || p2p.role || 'chair';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.78)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'var(--panel-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '18px',
        width: '1100px',
        maxWidth: '96vw',
        height: '88vh',
        maxHeight: '920px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,0.65)',
        color: 'var(--text-color)',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden'
      }}>
        {/* Cabecera del Centro de Mensajería */}
        <div style={{
          padding: '1.15rem 1.5rem',
          borderBottom: '1px solid var(--subborder-color)',
          backgroundColor: 'var(--card-header-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: activeTab === 'COMITE' ? 'rgba(59, 130, 246, 0.16)' : 'rgba(139, 92, 246, 0.16)',
              border: `1px solid ${activeTab === 'COMITE' ? '#3b82f644' : '#8b5cf644'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeTab === 'COMITE' ? '#3b82f6' : '#8b5cf6',
              transition: 'all 0.2s ease'
            }}>
              {activeTab === 'COMITE' ? <MessageSquare size={22} /> : <Globe size={22} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                  Centro Unificado de Mensajería & Avisos
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '100px',
                  backgroundColor: isLiveActive ? 'rgba(34, 197, 94, 0.18)' : 'rgba(113, 113, 122, 0.2)',
                  color: isLiveActive ? '#22c55e' : '#a1a1aa',
                  border: `1px solid ${isLiveActive ? '#22c55e44' : '#71717a44'}`
                }}>
                  {isLiveActive ? `Sala ${p2p.roomId}` : 'Local / Offline'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                Comunicaciones internas de sala (P2P / WebSockets) y tablón oficial de la conferencia
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted-text)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            title="Cerrar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Barra de Navegación de Pestañas Principales */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--subborder-color)',
          backgroundColor: 'var(--subnav-bg)',
          padding: '0.4rem 1.25rem',
          gap: '0.5rem'
        }}>
          <button
            onClick={() => setActiveTab('COMITE')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'COMITE' ? 'var(--btn-bg)' : 'transparent',
              color: activeTab === 'COMITE' ? 'var(--btn-text)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={16} />
            <span>Mensajería de Comité (Notas & Pajes)</span>
            {p2p.unreadNotesCount > 0 && (
              <span style={{
                backgroundColor: activeTab === 'COMITE' ? '#ffffff' : '#ef4444',
                color: activeTab === 'COMITE' ? '#3b82f6' : '#ffffff',
                fontSize: '0.66rem',
                fontWeight: '800',
                padding: '0.1rem 0.45rem',
                borderRadius: '100px',
                marginLeft: '4px'
              }}>
                {p2p.unreadNotesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('CONFERENCIA')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeTab === 'CONFERENCIA' ? 'var(--btn-bg)' : 'transparent',
              color: activeTab === 'CONFERENCIA' ? 'var(--btn-text)' : 'var(--muted-text)',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease'
            }}
          >
            <Globe size={16} />
            <span>Avisos de Conferencia (Red Global)</span>
          </button>
        </div>

        {/* Cuerpo del Modal con scroll autónomo */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {activeTab === 'COMITE' ? (
            <MensajeriaComite
              currentRole={effectiveRole}
              currentComiteId={currentComiteId}
              currentComiteNombre={currentComiteNombre}
              layout="split"
              showHeader={false}
            />
          ) : (
            <MensajeriaConferencia
              currentRole={effectiveRole}
              conferenciaId={conferenciaId}
              currentComiteId={currentComiteId}
              currentComiteNombre={currentComiteNombre}
              comites={comites}
              layout="split"
              showHeader={false}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CentroMensajeriaModal;
