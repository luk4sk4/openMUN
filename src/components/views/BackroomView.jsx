import i18n from '../../languages/index.js';
import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Send, 
  AlertTriangle, 
  MessageSquare, 
  Radio, 
  FileText, 
  Users, 
  Clock,

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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useToast } from '../../context/ToastContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import ConsoleNavbar from '../dashboard/ConsoleNavbar';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import peerService from '../../services/peerService';
import GestorCrisis from '../widgets/GestorCrisis';
import TeleNoticiasCrisis from '../widgets/TeleNoticiasCrisis';
import MensajeriaComite from '../messaging/MensajeriaComite';
import { playBreakingNewsAlert, playEmergencyPulse } from '../../utils/audioAlerts';
import { getFlagEmoji } from '../../utils/flags';

const BackroomView = ({ isLight: propIsLight, onExit }) => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  const {
    roomId,
    connectedPeers,
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
  
  // Ajustes de Backroom
  const [nuevaPassBackroom, setNuevaPassBackroom] = useState(backroomPassword || 'crisis123');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [feedbackAjustes, setFeedbackAjustes] = useState(null);

  const state = remoteSessionState || {};
  const nombreComite = state.comision || state.nombreComite || i18n.t('ui.crisisCommitteeCabinet');
  const paises = state.paises || [];

  // Filtrar notas relevantes para el Backroom
  const notasBackroom = notes.filter(n => 
    n.to === 'BACKROOM' || 
    n.fromRole === 'backroom' ||
    n.from?.toUpperCase() === 'BACKROOM' ||
    n.type === 'crisis'
  );

  const showToast = (msg) => {
    addToast({ title: t('views.backroom.badge'), message: msg, type: 'success' });
  };



  const handleGuardarPassBackroom = (e) => {
    e.preventDefault();
    if (!nuevaPassBackroom.trim()) return;
    if (setBackroomPassword) {
      setBackroomPassword(nuevaPassBackroom.trim());
    }
    localStorage.setItem('openmun_backroom_pass', nuevaPassBackroom.trim());
    showToast(t('ui.backroomPasswordUpdated'));
  };

  const backroomTabs = [
    { id: 'CRISIS', label: t('views.backroom.tabCrisis', 'Gestor de Crisis'), icon: Flame },
    { id: 'TV_PREVIEW', label: t('views.backroom.tabTvPreview', 'Monitor TV Noticiero'), icon: Tv },
    { id: 'DELEGADOS', label: t('views.backroom.tabDelegates', 'Mensajería y Filtraciones'), icon: MessageSquare, badge: notasBackroom.length },
    { id: 'CHAIR', label: t('views.backroom.tabChair', 'Canal Directo Mesa'), icon: Building2 },
    { id: 'AJUSTES', label: t('views.backroom.tabSettings', 'Ajustes'), icon: Sliders }
  ];

  return (
    <div className="dashboard-shell" style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-color)',
      color: 'var(--text-color)',
      fontFamily: 'var(--font-family, Inter, system-ui, sans-serif)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <AccessibilityModal isOpen={isAccessModalOpen} onClose={() => setIsAccessModalOpen(false)} />

      <ConsoleNavbar
        title={t('views.backroom.title', 'Consola de Backroom y Crisis')}
        roleBadge={t('views.backroom.badge', 'Backroom')}
        roomId={roomId || 'Local'}
        connectedPeersCount={connectedPeers?.length || 0}
        nombreComite={nombreComite}
        agendaSesion={t('views.backroom.subtitle', 'Comando de incidentes, directivas de emergencia e inteligencia')}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tabs={backroomTabs}
        isLight={isLight}
        toggleThemeMode={toggleThemeMode}
        setIsAccessOpen={setIsAccessModalOpen}
        onExit={() => {
          leaveRoom();
          if (onExit) onExit();
        }}
        exitConfirmMessage={t('views.backroom.confirmExit', '¿Deseas desconectarte del Backroom?')}
      />

{/* ── Contenido Principal ── */}
      <main className="openmun-main-content" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
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
                <Tv size={16} /> {t('ui.liveNewsPreviewMainScreen')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted-text)' }}>
                {t('ui.eventsIssuedFromTheCrisisManagerAreAutomaticallyProjectedHere')}
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
                  <Sliders size={18} /> {t('ui.backroomSecurityAndControlSettings')}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                  {t('ui.configureAccessKeysAndBroadcastingPermissionsForTheCrisisTeam')}
                </p>
              </div>

              {/* Contraseña de Backroom */}
              <form onSubmit={handleGuardarPassBackroom} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.76rem', fontWeight: '700', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                  {t('ui.backroomAccessPassword')}
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
                    {t('ui.savePassword')}
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
                    {t('ui.testCrisisAudioAlert')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>
                    {t('ui.checkTheEmergencySirenVolumeBeforeBroadcastingToTheRoom')}
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
                    <Volume2 size={13} /> {t('ui.newsTone')}
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
                    <Volume2 size={13} /> {t('ui.tacticalSiren')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: MENSAJERÍA / DELEGADOS / CHAIR */}
        {(activeTab === 'DELEGADOS' || activeTab === 'CHAIR') && (
          <MensajeriaComite
            currentRole="backroom"
            defaultType="crisis"
            defaultDestination={activeTab === 'CHAIR' ? 'CHAIR' : 'TODOS'}
            currentComiteId={roomId}
            currentComiteNombre={nombreComite}
            paises={paises}
            layout="split"
            showHeader={false}
          />
        )}
      </main>
    </div>
  );
};

export default BackroomView;
