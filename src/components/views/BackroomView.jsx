import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Send, 
  AlertTriangle, 
  MessageSquare, 
  LogOut, 
  Radio, 
  FileText, 
  Users, 
  Clock,
  Sparkles,
  Zap,
  Building2,
  Bell,
  Shield,
  CheckCircle2,
  Sliders,
  Tv,
  Flame,
  Key,
  Volume2,
  Download,
  Trash2,
  Check,
  Eye,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import peerService from '../../services/peerService';
import GestorCrisis from '../widgets/GestorCrisis';
import TeleNoticiasCrisis from '../widgets/TeleNoticiasCrisis';
import { playBreakingNewsAlert, playEmergencyPulse } from '../../utils/audioAlerts';
import { getFlagEmoji } from '../../utils/flags';

const BackroomView = ({ isLight: propIsLight, onExit }) => {
  const { t } = useTranslation();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const {
    roomId,
    notes,
    sendNote,
    remoteSessionState,
    leaveRoom,
    backroomPassword,
    setBackroomPassword,
    roomSettings,
    updateRoomSettings
  } = useP2P();

  const [activeTab, setActiveTab] = useState('CRISIS'); // 'CRISIS' | 'TV_PREVIEW' | 'DELEGADOS' | 'CHAIR' | 'AJUSTES'
  const [destinatario, setDestinatario] = useState('TODOS');
  const [mensajeTexto, setMensajeTexto] = useState('');
  
  // Ajustes de Backroom
  const [nuevaPassBackroom, setNuevaPassBackroom] = useState(backroomPassword || 'crisis123');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [feedbackAjustes, setFeedbackAjustes] = useState(null);

  const state = remoteSessionState || {};
  const nombreComite = state.comision || state.nombreComite || 'Comité de Crisis / Gabinete';
  const paises = state.paises || [];

  // Filtrar notas relevantes para el Backroom
  const notasBackroom = notes.filter(n => 
    n.to === 'BACKROOM' || 
    n.fromRole === 'backroom' ||
    n.from?.toUpperCase() === 'BACKROOM' ||
    n.type === 'crisis'
  );

  const showToast = (msg) => {
    setFeedbackAjustes(msg);
    setTimeout(() => setFeedbackAjustes(null), 2500);
  };

  const handleEnviarNota = (e) => {
    e.preventDefault();
    if (!mensajeTexto.trim()) return;

    const destino = activeTab === 'CHAIR' ? 'CHAIR' : destinatario;
    sendNote(destino, mensajeTexto.trim(), 'backroom');
    setMensajeTexto('');
  };

  const handleGuardarPassBackroom = (e) => {
    e.preventDefault();
    if (!nuevaPassBackroom.trim()) return;
    if (setBackroomPassword) {
      setBackroomPassword(nuevaPassBackroom.trim());
    }
    localStorage.setItem('openmun_backroom_pass', nuevaPassBackroom.trim());
    showToast('Contraseña de Backroom actualizada');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <AccessibilityModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      {/* ── Header de Backroom ── */}
      <header style={{
        padding: '0.85rem 1.5rem',
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--subborder-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <OpenMunLogo height={32} isLight={isLight} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <span style={{ fontWeight: '800', fontSize: '1.05rem', letterSpacing: '-0.01em', color: '#f97316' }}>
                Consola de Backroom y Crisis
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                backgroundColor: 'rgba(249, 115, 22, 0.15)',
                color: '#f97316',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f97316' }} />
                Sala: {roomId}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)' }}>
              {nombreComite} · Comando de incidentes, directivas de emergencia e inteligencia
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Botón Accesibilidad y Tema */}
          <button
            onClick={() => setIsAccessModalOpen(true)}
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '8px',
              color: 'var(--text-color)',
              padding: '0.45rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title={t('accessibility.title', "Accesibilidad y Tema")}
          >
            <Eye size={14} /> {t('accessibility.title', 'Accesibilidad')}
          </button>

          {/* Botón Rápido Modo Claro / Oscuro */}
          <button
            onClick={toggleThemeMode}
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '8px',
              color: 'var(--text-color)',
              padding: '0.45rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title={isLight ? t('header.darkMode', "Cambiar a Modo Oscuro") : t('header.lightMode', "Cambiar a Modo Claro")}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <LanguageSelector showIcon={false} />

          <button
            onClick={() => {
              if (confirm('¿Deseas desconectarte del Backroom?')) {
                leaveRoom();
                if (onExit) onExit();
              }
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              color: '#ef4444',
              padding: '0.45rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <LogOut size={14} /> {t('common.exit', 'Salir')}
          </button>
        </div>
      </header>

      {/* ── Sub-navegación ── */}
      <div style={{
        backgroundColor: 'var(--subnav-bg)',
        borderBottom: '1px solid var(--subborder-color)',
        padding: '0.4rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('CRISIS')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'CRISIS' ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
            color: activeTab === 'CRISIS' ? '#f97316' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Flame size={15} color={activeTab === 'CRISIS' ? '#f97316' : 'var(--muted-text)'} /> Gestor de Crisis
        </button>

        <button
          onClick={() => setActiveTab('TV_PREVIEW')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'TV_PREVIEW' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            color: activeTab === 'TV_PREVIEW' ? '#60a5fa' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Tv size={15} color={activeTab === 'TV_PREVIEW' ? '#60a5fa' : 'var(--muted-text)'} /> Monitor TV Noticiero
        </button>

        <button
          onClick={() => setActiveTab('DELEGADOS')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'DELEGADOS' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'DELEGADOS' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <MessageSquare size={15} /> Mensajería y Filtraciones ({notasBackroom.length})
        </button>

        <button
          onClick={() => setActiveTab('CHAIR')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'CHAIR' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'CHAIR' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Building2 size={15} /> Canal Directo con la Mesa
        </button>

        <button
          onClick={() => setActiveTab('AJUSTES')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'AJUSTES' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'AJUSTES' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Sliders size={15} /> Ajustes de Backroom
        </button>
      </div>

      {/* Toast Feedback */}
      {feedbackAjustes && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '20px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '0.82rem',
          zIndex: 9999,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <CheckCircle2 size={14} />
          {feedbackAjustes}
        </div>
      )}

      {/* ── Contenido Principal ── */}
      <main style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {/* PESTAÑA: GESTOR DE CRISIS COMPLETO */}
        {activeTab === 'CRISIS' && (
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            height: 'calc(100vh - 160px)',
            backgroundColor: 'var(--panel-color)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0,0,0,0.35)'
          }}>
            <GestorCrisis />
          </div>
        )}

        {/* PESTAÑA: MONITOR TV NOTICIERO */}
        {activeTab === 'TV_PREVIEW' && (
          <div style={{
            maxWidth: '900px',
            margin: '0 auto',
            height: 'calc(100vh - 180px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tv size={16} /> Vista Previa del Noticiero en Directo (Pantalla Principal)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
                Lo que emitas desde el Gestor de Crisis se proyecta automáticamente aquí
              </div>
            </div>
            <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <TeleNoticiasCrisis />
            </div>
          </div>
        )}

        {/* PESTAÑA: AJUSTES DE BACKROOM */}
        {activeTab === 'AJUSTES' && (
          <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.2rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#f97316', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={18} /> Ajustes de Seguridad y Control de Backroom
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                  Configuración de claves de acceso y permisos de difusión para el equipo de crisis.
                </p>
              </div>

              {/* Contraseña de Backroom */}
              <form onSubmit={handleGuardarPassBackroom} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                  Contraseña de Acceso al Backroom
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0 10px'
                  }}>
                    <Key size={15} color="var(--muted-text)" />
                    <input
                      type={mostrarPass ? "text" : "password"}
                      value={nuevaPassBackroom}
                      onChange={e => setNuevaPassBackroom(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-color)',
                        padding: '0.65rem',
                        fontSize: '0.85rem',
                        outline: 'none',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPass(!mostrarPass)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--muted-text)', cursor: 'pointer' }}
                    >
                      {mostrarPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: '#f97316',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0 16px',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Guardar Clave
                  </button>
                </div>
              </form>

              {/* Prueba de Sonido de Alarma */}
              <div style={{
                backgroundColor: 'var(--card-header-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-color)' }}>
                    Probar Alerta Auditiva de Crisis
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
                    Verifica el volumen de la sirena de emergencia antes de emitir a la sala
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => playBreakingNewsAlert(0.45)}
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Volume2 size={13} /> Tono Noticiero
                  </button>
                  <button
                    type="button"
                    onClick={() => playEmergencyPulse(0.45)}
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.2)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Volume2 size={13} /> Sirena Táctica
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: MENSAJERÍA / DELEGADOS / CHAIR */}
        {(activeTab === 'DELEGADOS' || activeTab === 'CHAIR') && (
          <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Formulario de envío */}
            <form onSubmit={handleEnviarNota} style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>
                  {activeTab === 'CHAIR' ? 'Comunicación Confidencial con la Mesa' : 'Filtración o Nota Clasificada'}
                </div>
                {activeTab !== 'CHAIR' && (
                  <select
                    value={destinatario}
                    onChange={e => setDestinatario(e.target.value)}
                    style={{
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.45rem 0.75rem',
                      color: 'var(--text-color)',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    <option value="TODOS" style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}>
                      📢 Todas las Delegaciones
                    </option>
                    {paises.map(p => (
                      <option 
                        key={p.id || p.nombre} 
                        value={p.nombre}
                        style={{ backgroundColor: 'var(--panel-color)', color: 'var(--text-color)' }}
                      >
                        {getFlagEmoji(p.bandera, p.nombre)} {p.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                  Contenido
                </label>
                <textarea
                  rows={3}
                  placeholder={activeTab === 'CHAIR' ? 'Escribe instrucciones secretas para la Mesa...' : 'Escribe información clasificada o filtración...'}
                  value={mensajeTexto}
                  onChange={e => setMensajeTexto(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.35rem',
                    backgroundColor: 'var(--card-header-bg)',
                    border: '1px solid var(--subborder-color)',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={!mensajeTexto.trim()}
                style={{
                  backgroundColor: 'var(--btn-bg)',
                  color: 'var(--btn-text)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: mensajeTexto.trim() ? 'pointer' : 'not-allowed',
                  opacity: mensajeTexto.trim() ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                <Send size={14} /> Despachar
              </button>
            </form>

            {/* Feed de notas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>
                Historial de Mensajes ({notasBackroom.length})
              </div>

              {notasBackroom.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                  No hay mensajes registrados.
                </div>
              ) : (
                notasBackroom.map(n => (
                  <div
                    key={n.id}
                    style={{
                      backgroundColor: 'var(--panel-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: '800', color: '#f97316' }}>
                        {n.from} → {n.to}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                        {new Date(n.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                      {n.text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BackroomView;
