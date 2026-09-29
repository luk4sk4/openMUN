import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Layers, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  LogOut, 
  Users, 
  Clock, 
  MessageSquare, 
  Eye, 
  RefreshCw,
  Send,
  Building2,
  Sliders,
  CheckCircle2,
  Check,
  X,
  UserX,
  Shield,
  Zap,
  Vote,
  FileText,
  AlertCircle,
  FileSpreadsheet,
  BarChart3,
  Calendar,
  UserPlus,
  Hand,
  Lock,
  Mail,
  Landmark,
  Flame,
  Tv,
  Map,
  Globe,
  Dices,
  Sparkles,
  Sun,
  Moon,
  SkipForward,
  Megaphone,
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import CountryFlag from '../common/CountryFlag';
import { getFlagEmoji } from '../../utils/flags';
import { useP2P } from '../../context/P2PContext';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import ConferenceBanner from '../common/ConferenceBanner';
import conferenceService from '../../services/conferenceService';
import useTopBarOverflow from '../../hooks/useTopBarOverflow';
import { formatearMensajeAviso, correspondeAviso, obtenerEtiquetaDestino, ignorarAviso, obtenerAvisosIgnorados } from '../../utils/announcementHelpers';
import MatrizPaises from '../widgets/MatrizPaises';
import HistoricoDelegaciones from '../widgets/HistoricoDelegaciones';
import EstablecerAgenda from '../widgets/EstablecerAgenda';
import ImportarPaises from '../widgets/ImportarPaises';
import GestorCrisis from '../widgets/GestorCrisis';
import VotacionOficial from '../widgets/VotacionOficial';
import MapaVotacion from '../widgets/MapaVotacion';
import AnadirPaises from '../widgets/AnadirPaises';
import PizarraMociones from '../widgets/PizarraMociones';
import SelectorAleatorio from '../widgets/SelectorAleatorio';
import MensajeriaComite from '../messaging/MensajeriaComite';
import MensajeriaConferencia from '../messaging/MensajeriaConferencia';

const SecretariatView = ({ isLight: propIsLight, onExit }) => {
  const { t } = useTranslation();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  // Hook para detectar overflow en la barra de secretaría y compactar el logo automáticamente
  const { containerRef: headerRef, isLogoCompact, isExtraCompact } = useTopBarOverflow();

  const {
    paises: sessionPaises,
    oradoresCola: sessionOradoresCola,
    oradoresCaucus: sessionOradoresCaucus,
    caucusActivo: sessionCaucusActivo,
    agendaSesion: sessionAgendaSesion,
    nombreComite: sessionNombreComite,
    tipoSesion,
    cambiarTipoSesion,
    removerOrador,
    removerOradorCaucus,
    avanzarOradorCaucus,
    ejecutarAccion,
    aplicarEstadoExterno,
    agregarEnmiendaResolucion
  } = useSession();

  const {
    roomId,
    notes,
    setNotes,
    connectedPeers,
    remoteSessionState,
    leaveRoom,
    sendNote,
    roomSettings,
    updateRoomSettings,
    speakingRequests,
    enmiendasPropuestas = [],
    eliminarEnmiendaPropuesta,
    approveSpeakingRequest,
    rejectSpeakingRequest,
    respondToPointWithNote,
    kickPeer,
    registerSessionHandlers,
    announcements = [],
    broadcastAnnouncement,
    deleteAnnouncement
  } = useP2P();

  const [respuestasPuntos, setRespuestasPuntos] = useState({});

  // Registrar sincronización bidireccional inmediata con el motor P2P / Host
  useEffect(() => {
    registerSessionHandlers({
      onSyncState: (state) => aplicarEstadoExterno(state),
      onSessionAction: (accion, payload) => ejecutarAccion(accion, payload)
    });
  }, [registerSessionHandlers, aplicarEstadoExterno, ejecutarAccion]);

  const [activeTab, setActiveTab] = useState('NOTAS'); // 'NOTAS' | 'AVISOS' | 'SOLICITUDES' | 'DEBATE' | 'VOTACION' | 'INFO' | 'CRISIS' | 'AJUSTES' | 'CONEXIONES'
  const [subTabNotas, setSubTabNotas] = useState('COMITE'); // 'COMITE' | 'CONFERENCIA'
  const [subTabInfo, setSubTabInfo] = useState('MATRIZ'); // 'MATRIZ' | 'ANADIR' | 'HISTORICO' | 'AGENDA' | 'IMPORTAR' | 'MOCIONES' | 'RULETA'
  const [subTabVotacion, setSubTabVotacion] = useState('OFICIAL'); // 'OFICIAL' | 'MAPA'
  const [subTabDebate, setSubTabDebate] = useState('MONITOR'); // 'MONITOR' | 'ANADIR'

  // Estados para Emisión de Avisos desde Secretaría
  const [tituloAvisoSec, setTituloAvisoSec] = useState('');
  const [textoAvisoSec, setTextoAvisoSec] = useState('');
  const [prioridadAvisoSec, setPrioridadAvisoSec] = useState('general');
  const [feedbackAvisoSec, setFeedbackAvisoSec] = useState(null);

  // Avisos de Conferencia (Base de Datos)
  const [avisosDB, setAvisosDB] = useState([]);
  const [comitesConf, setComitesConf] = useState([]);
  const confActiva = conferenceService.obtenerSesionActiva();
  const currentComiteId = roomId || (typeof window !== 'undefined' ? localStorage.getItem('openmun_current_comite_id') : null) || null;

  const [descartadosAnnouncements, setDescartadosAnnouncements] = useState(() => obtenerAvisosIgnorados());

  useEffect(() => {
    const handleSessionCleared = () => {
      setDescartadosAnnouncements(obtenerAvisosIgnorados());
      setAvisosDB([]);
    };
    window.addEventListener('openmun_session_cleared', handleSessionCleared);
    return () => window.removeEventListener('openmun_session_cleared', handleSessionCleared);
  }, []);

  useEffect(() => {
    const handleIgnorado = (e) => {
      if (e.detail?.id) {
        setDescartadosAnnouncements(prev => [...new Set([...prev, String(e.detail.id)])]);
      }
    };
    const handleRestaurado = (e) => {
      if (e.detail?.id) {
        setDescartadosAnnouncements(prev => prev.filter(id => String(id) !== String(e.detail.id)));
      }
    };
    window.addEventListener('openmun_aviso_ignorado', handleIgnorado);
    window.addEventListener('openmun_aviso_restaurado', handleRestaurado);
    return () => {
      window.removeEventListener('openmun_aviso_ignorado', handleIgnorado);
      window.removeEventListener('openmun_aviso_restaurado', handleRestaurado);
    };
  }, []);

  const visibleAnnouncements = (announcements || []).filter(ann => !descartadosAnnouncements.map(String).includes(String(ann.id)));

  const handleIgnorarAnnouncement = (id) => {
    ignorarAviso(id);
    setDescartadosAnnouncements(prev => [...new Set([...prev, String(id)])]);
  };

  // Cargar comités de la conferencia si está vinculada
  useEffect(() => {
    if (confActiva?.id) {
      conferenceService.obtenerResumen(confActiva.id).then(res => {
        if (res?.comites && Array.isArray(res.comites)) {
          setComitesConf(res.comites);
        }
      }).catch(() => {});
    }
  }, [confActiva?.id]);

  useEffect(() => {
    if (!confActiva?.id) return;
    const fetchAvisos = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        const res = await conferenceService.obtenerAvisos(confActiva.id, currentComiteId, 'secretariat', nombreComite);
        if (res && Array.isArray(res.avisos)) {
          const filtrados = res.avisos.filter(a => correspondeAviso(a, {
            role: 'secretariat',
            currentComiteId,
            currentComiteNombre: nombreComite,
            comites: comitesConf
          }));
          setAvisosDB(filtrados);
        }
      } catch (e) {}
    };
    fetchAvisos();
    const interval = setInterval(fetchAvisos, 20000);
    const handleVis = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchAvisos();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVis);
    }

    const handleNuevo = (e) => {
      if (e.detail) {
        setAvisosDB(prev => [e.detail, ...prev.filter(a => a.id !== e.detail.id)]);
      }
    };
    const handleDesactivado = (e) => {
      if (e.detail?.id) {
        setAvisosDB(prev => prev.filter(a => String(a.id) !== String(e.detail.id)));
      }
    };
    window.addEventListener('openmun_nuevo_aviso', handleNuevo);
    window.addEventListener('openmun_aviso_desactivado', handleDesactivado);

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVis);
      }
      window.removeEventListener('openmun_nuevo_aviso', handleNuevo);
      window.removeEventListener('openmun_aviso_desactivado', handleDesactivado);
    };
  }, [confActiva?.id, currentComiteId]);

  const state = remoteSessionState || {};
  const nombreComite = sessionNombreComite || state.comision || state.nombreComite || 'Comité en Vivo';
  const temaActual = sessionAgendaSesion?.temaActual || sessionCaucusActivo?.tema || state.agendaSesion?.temaActual || state.caucusActivo?.tema || 'En Discusión';
  const oradoresGSL = sessionOradoresCola?.length > 0 ? sessionOradoresCola : (state.oradoresCola || []);
  const oradoresCaucus = sessionOradoresCaucus?.length > 0 ? sessionOradoresCaucus : (state.oradoresCaucus || []);
  const caucusActivo = (sessionCaucusActivo && sessionCaucusActivo.activo !== undefined) ? sessionCaucusActivo : (state.caucusActivo || {});
  const oradorActual = caucusActivo.activo ? (oradoresCaucus[0]?.nombre || 'Sin orador') : (oradoresGSL[0]?.nombre || 'Sin orador');
  const paises = sessionPaises?.length > 0 ? sessionPaises : (state.paises || []);

  const handleExportarNotasCSV = () => {
    let csv = 'ID,Fecha,De,Rol,Para,Tipo,Mensaje\n';
    notes.forEach(n => {
      const fecha = new Date(n.timestamp || Date.now()).toLocaleTimeString();
      const msg = `"${(n.text || '').replace(/"/g, '""')}"`;
      csv += `${n.id || ''},${fecha},${n.from || ''},${n.fromRole || ''},${n.to || ''},${n.type || ''},${msg}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registro_notas_${roomId || 'openmun'}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      {/* ── Topbar de Secretaría ── */}
      <header
        ref={headerRef}
        style={{
          padding: isExtraCompact ? '0.5rem 1rem' : '0.85rem 1.5rem',
          backgroundColor: 'var(--header-bg)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          maxWidth: '100vw',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isLogoCompact ? '0.5rem' : '0.9rem', minWidth: 0, flexShrink: 1 }}>
          <OpenMunLogo height={32} isLight={isLight} showText={!isLogoCompact} />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'nowrap' }}>
              <span style={{ fontWeight: '800', fontSize: isExtraCompact ? '0.9rem' : '1.05rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('views.secretariat.consoleTitle', 'Consola de Secretaría y Pajes')}
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                flexShrink: 0
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#60a5fa' }} />
                {t('liveSession.roomCode', 'Sala')}: {roomId || 'Local'}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nombreComite}</span>
              <span>•</span>
              <span style={{ color: 'var(--text-color)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('header.agenda', 'Tema')}: {temaActual}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Selector de Estado de Sesión en Vivo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px'
          }}>
            {[
              { id: 'formal', label: 'Formal', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.18)' },
              { id: 'informal', label: 'Informal', color: '#eab308', bg: 'rgba(234, 179, 8, 0.18)' },
              { id: 'receso', label: 'Receso', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.18)' },
              { id: 'votacion', label: 'Votando', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)' }
            ].map(s => {
              const isActivo = (tipoSesion || state.tipoSesion || 'formal') === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => cambiarTipoSesion(s.id)}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: isActivo ? `1px solid ${s.color}` : '1px solid transparent',
                    backgroundColor: isActivo ? (isLight ? '#ffffff' : s.bg) : 'transparent',
                    color: isActivo ? s.color : 'var(--muted-text)',
                    fontWeight: isActivo ? '800' : '600',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: isActivo ? `0 0 8px ${s.color}33` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title={`Cambiar estado del comité a ${s.label}`}
                >
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: s.color,
                    boxShadow: isActivo ? `0 0 6px ${s.color}` : 'none'
                  }} />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Botón Accesibilidad y Tema */}
          <button
            onClick={() => setIsAccessModalOpen(true)}
            style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-color)',
              padding: '0.45rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title="Accesibilidad y Tema (Dislexia, Tamaño de Letra, Daltonismo)"
          >
            <Eye size={14} /> {t('header.accessibility', 'Accesibilidad')}
          </button>

          {/* Botón Rápido Modo Claro / Oscuro */}
          <button
            onClick={toggleThemeMode}
            style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
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
            title={isLight ? "Cambiar a Modo Oscuro" : "Cambiar a Modo Claro"}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <LanguageSelector showIcon={false} />

          <button
            onClick={handleExportarNotasCSV}
            style={{
              backgroundColor: 'var(--card-header-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-color)',
              padding: '0.45rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title="Exportar archivo de notas en CSV para Excel"
          >
            <Download size={14} /> {t('views.secretariat.exportCsv', 'Exportar CSV')}
          </button>

          <button
            onClick={() => {
              if (confirm('¿Deseas salir del panel de Secretaría?')) {
                leaveRoom();
                if (onExit) onExit();
              }
            }}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              color: '#ef4444',
              padding: '0.45rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: '700',
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

      {/* Banner de Avisos Oficiales */}
      <ConferenceBanner isLight={isLight} role="secretariat" comiteId={currentComiteId} comiteNombre={nombreComite} comites={comitesConf} />

      {/* ── Sub-navegación por Pestañas ── */}
      <div style={{
        backgroundColor: 'var(--subnav-bg)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.45rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('NOTAS')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'NOTAS' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'NOTAS' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <MessageSquare size={15} /> {t('views.delegate.inbox', 'Bandeja de Notas')} ({notes.length})
        </button>

        <button
          onClick={() => setActiveTab('AVISOS')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'AVISOS' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'AVISOS' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Megaphone size={15} /> Avisos Oficiales ({visibleAnnouncements.length})
        </button>

        <button
          onClick={() => setActiveTab('SOLICITUDES')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'SOLICITUDES' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'SOLICITUDES' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            position: 'relative',
            transition: 'all 0.15s ease'
          }}
        >
          <Zap size={15} /> {t('liveSession.requests', 'Solicitudes')} ({speakingRequests.length + enmiendasPropuestas.length})
          {(speakingRequests.length + enmiendasPropuestas.length) > 0 && (
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
              boxShadow: '0 0 8px #ef4444'
            }} />
          )}
        </button>

        <button
          onClick={() => setActiveTab('DEBATE')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'DEBATE' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'DEBATE' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Clock size={15} /> Monitor de Debate & Oradores
        </button>

        <button
          onClick={() => setActiveTab('VOTACION')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'VOTACION' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'VOTACION' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Vote size={15} /> Votaciones & Mapa
        </button>

        <button
          onClick={() => setActiveTab('INFO')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'INFO' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'INFO' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <BarChart3 size={15} /> Gestión de Comité & Widgets
        </button>

        <button
          onClick={() => setActiveTab('CRISIS')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'CRISIS' ? '#ef4444' : 'transparent',
            color: activeTab === 'CRISIS' ? '#ffffff' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Flame size={15} color={activeTab === 'CRISIS' ? '#ffffff' : '#ef4444'} /> Gabinete de Crisis & Noticiero
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
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Sliders size={15} /> Ajustes y Permisos
        </button>

        <button
          onClick={() => setActiveTab('CONEXIONES')}
          style={{
            padding: '0.5rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'CONEXIONES' ? 'var(--btn-bg)' : 'transparent',
            color: activeTab === 'CONEXIONES' ? 'var(--btn-text)' : 'var(--muted-text)',
            fontWeight: '700',
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            transition: 'all 0.15s ease'
          }}
        >
          <Users size={15} /> Conexiones ({connectedPeers.length})
        </button>
      </div>

      {/* ── Contenido Principal de Secretaría ── */}
      <main style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA: CRISIS & NOTICIERO                             */}
        {/* ═══════════════════════════════════════════════════════ */}
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

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA: AVISOS OFICIALES (SECRETARÍA)                 */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'AVISOS' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Formulario de Emisión de Aviso */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Megaphone size={20} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  {t('views.staff.emitAnnouncement', 'Emitir Aviso a Delegaciones')}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: '1.4' }}>
                Los comunicados emitidos desde Secretaría se proyectan inmediatamente en la cabecera y buzón de avisos de todos los delegados.
              </p>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (!tituloAvisoSec.trim() && !textoAvisoSec.trim()) return;
                broadcastAnnouncement({
                  title: tituloAvisoSec.trim() || 'Aviso de Secretaría',
                  text: textoAvisoSec.trim(),
                  priority: prioridadAvisoSec,
                  senderRole: 'secretariat',
                  senderName: 'Secretaría'
                });
                setTituloAvisoSec('');
                setTextoAvisoSec('');
                setFeedbackAvisoSec('Aviso emitido con éxito a toda la sala');
                setTimeout(() => setFeedbackAvisoSec(null), 3500);
              }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.announcementTitle', 'Título del Aviso')}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Inicio de Votación / Entrega de Cláusulas"
                    value={tituloAvisoSec}
                    onChange={e => setTituloAvisoSec(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.88rem',
                      fontWeight: '700'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.announcementPriority', 'Categoría / Prioridad')}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem', marginTop: '0.35rem' }}>
                    {[
                      { id: 'general', label: t('views.staff.priorityGeneral', 'General'), color: '#fbbf24' },
                      { id: 'urgente', label: t('views.staff.priorityUrgent', 'Urgente / Importante'), color: '#ef4444' },
                      { id: 'logistica', label: t('views.staff.priorityLogistics', 'Logística de Sala'), color: '#60a5fa' },
                      { id: 'receso', label: t('views.staff.priorityRecess', 'Receso / Coffee Break'), color: '#34d399' },
                      { id: 'documento', label: t('views.staff.priorityDoc', 'Entrega Documentos'), color: '#c084fc' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPrioridadAvisoSec(cat.id)}
                        style={{
                          backgroundColor: prioridadAvisoSec === cat.id ? 'rgba(245, 158, 11, 0.15)' : 'var(--card-header-bg)',
                          border: `1.5px solid ${prioridadAvisoSec === cat.id ? '#f59e0b' : 'var(--subborder-color)'}`,
                          borderRadius: '8px',
                          padding: '0.5rem 0.4rem',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          color: prioridadAvisoSec === cat.id ? 'var(--text-color)' : 'var(--muted-text)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.announcementMsg', 'Mensaje o Instrucción')}
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Instrucción oficial de la Secretaría para los delegados..."
                    value={textoAvisoSec}
                    onChange={e => setTextoAvisoSec(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '0.35rem',
                      backgroundColor: 'var(--card-header-bg)',
                      border: '1px solid var(--subborder-color)',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      color: 'var(--text-color)',
                      fontSize: '0.84rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {feedbackAvisoSec && (
                  <div style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.12)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    color: '#22c55e',
                    borderRadius: '8px',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <Check size={14} /> {feedbackAvisoSec}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!tituloAvisoSec.trim() && !textoAvisoSec.trim()}
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: (tituloAvisoSec.trim() || textoAvisoSec.trim()) ? 'pointer' : 'not-allowed',
                    opacity: (tituloAvisoSec.trim() || textoAvisoSec.trim()) ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={16} /> {t('views.staff.sendAnnouncementBtn', 'Emitir Aviso Oficial')}
                </button>
              </form>
            </div>

            {/* Listado de Avisos Activos */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <Megaphone size={20} color="#f59e0b" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                    {t('views.staff.activeAnnouncements', 'Avisos Activos en Sala')} ({visibleAnnouncements.length})
                  </h3>
                </div>
              </div>

              {visibleAnnouncements.length === 0 ? (
                <div style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  color: 'var(--muted-text)',
                  border: '1px dashed var(--subborder-color)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <Megaphone size={36} style={{ opacity: 0.3 }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                    {t('views.staff.noAnnouncements', 'No hay avisos emitidos en este momento.')}
                  </div>
                  <div style={{ fontSize: '0.78rem' }}>
                    Usa el formulario lateral para emitir un aviso prioritario a todas las delegaciones.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {visibleAnnouncements.map((ann) => {
                    const isUrgent = ann.priority === 'urgente';
                    return (
                      <div
                        key={ann.id}
                        style={{
                          backgroundColor: 'var(--card-header-bg)',
                          border: `1px solid ${isUrgent ? 'rgba(239, 68, 68, 0.4)' : 'var(--subborder-color)'}`,
                          borderLeft: `4px solid ${isUrgent ? '#ef4444' : '#f59e0b'}`,
                          borderRadius: '12px',
                          padding: '1.1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem',
                          position: 'relative'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: isUrgent ? 'rgba(239, 68, 68, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                              color: isUrgent ? '#ef4444' : '#f59e0b',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              letterSpacing: '0.04em'
                            }}>
                              {(ann.priority || 'general').toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                              De: <strong style={{ color: 'var(--text-color)' }}>{ann.senderName || 'Secretaría / Staff'}</strong>
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                              • {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              onClick={() => {
                                if (window.confirm(t('avisos.deleteNoticeConfirm', '¿Seguro que deseas eliminar este aviso?'))) {
                                  deleteAnnouncement(ann.id);
                                }
                              }}
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                transition: 'all 0.15s ease'
                              }}
                              title={t('avisos.deleteNoticeTooltip', 'Eliminar aviso para toda la sala')}
                              aria-label={t('avisos.deleteNotice', 'Eliminar')}
                            >
                              <Trash2 size={13} color="#ef4444" /> {t('avisos.deleteNotice', 'Eliminar')}
                            </button>
                            <button
                              onClick={() => handleIgnorarAnnouncement(ann.id)}
                              style={{
                                background: 'transparent',
                                border: '1px solid var(--subborder-color)',
                                color: 'var(--muted-text)',
                                cursor: 'pointer',
                                padding: '3px 8px',
                                borderRadius: '5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                                transition: 'all 0.15s ease'
                              }}
                              title={t('avisos.dismissTooltip', 'Descartar este aviso (ocultarlo de tu vista)')}
                            >
                              <EyeOff size={13} /> {t('avisos.dismiss', 'Descartar')}
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--text-color)' }}>
                          {ann.title}
                        </div>

                        {ann.text && (
                          <div style={{ fontSize: '0.84rem', color: 'var(--muted-text)', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                            {ann.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA 1: BANDEJA DE NOTAS / PAJES                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA 1: MENSAJERÍA Y NOTAS (COMITÉ Y CONFERENCIA)     */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'NOTAS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {/* Sub-pestañas: Comité vs Conferencia */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '0.45rem 0.75rem',
              flexWrap: 'wrap',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSubTabNotas('COMITE')}
                  style={{
                    backgroundColor: subTabNotas === 'COMITE' ? 'var(--btn-bg)' : 'transparent',
                    color: subTabNotas === 'COMITE' ? 'var(--btn-text)' : 'var(--muted-text)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 0.95rem',
                    fontSize: '0.84rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <MessageSquare size={15} />
                  <span>Notas del Comité</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px',
                    backgroundColor: subTabNotas === 'COMITE' ? 'rgba(255,255,255,0.22)' : 'var(--card-header-bg)',
                    color: subTabNotas === 'COMITE' ? '#ffffff' : 'var(--text-color)',
                    fontWeight: '800'
                  }}>
                    {notes.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubTabNotas('CONFERENCIA')}
                  style={{
                    backgroundColor: subTabNotas === 'CONFERENCIA' ? '#3b82f6' : 'transparent',
                    color: subTabNotas === 'CONFERENCIA' ? '#ffffff' : 'var(--muted-text)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem 0.95rem',
                    fontSize: '0.84rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Globe size={15} />
                  <span>Avisos de Conferencia</span>
                  {avisosDB.length > 0 && (
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      backgroundColor: subTabNotas === 'CONFERENCIA' ? 'rgba(255,255,255,0.25)' : 'rgba(59, 130, 246, 0.15)',
                      color: subTabNotas === 'CONFERENCIA' ? '#ffffff' : '#60a5fa',
                      fontWeight: '800'
                    }}>
                      {avisosDB.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {subTabNotas === 'COMITE' ? (
              <MensajeriaComite
                currentRole="secretariat"
                currentComiteId={currentComiteId}
                currentComiteNombre={nombreComite}
                paises={paises}
                layout="split"
                showHeader={false}
              />
            ) : (
              <MensajeriaConferencia
                currentRole="secretariat"
                conferenciaId={confActiva?.id || (typeof window !== 'undefined' ? localStorage.getItem('openmun_current_conf_id') : null)}
                currentComiteId={currentComiteId}
                currentComiteNombre={nombreComite}
                comites={comitesConf}
                initialAvisos={avisosDB}
                layout="split"
                showHeader={false}
              />
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'SOLICITUDES' && (() => {
          const puntosParlamentarios = speakingRequests.filter(r => r.speechType === 'POINT');
          const otrasSolicitudes = speakingRequests.filter(r => r.speechType !== 'POINT');

          return (
            <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* ── SECCIÓN PRIORITARIA: AVISOS ESPECIALES / PUNTOS PARLAMENTARIOS ── */}
              {puntosParlamentarios.length > 0 && (
                <div style={{
                  backgroundColor: 'rgba(234, 179, 8, 0.08)',
                  border: '1.5px solid rgba(234, 179, 8, 0.45)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 8px 24px rgba(234, 179, 8, 0.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <div style={{
                        backgroundColor: '#eab308',
                        color: '#000000',
                        padding: '0.35rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <HelpCircle size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#facc15' }}>
                          Avisos Especiales: Puntos Parlamentarios ({puntosParlamentarios.length})
                        </h3>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                          Puntos de Privilegio, Orden, Duda o Información. Puedes responder inmediatamente al delegado por nota oficial con un clic.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {puntosParlamentarios.map(point => {
                      const inputVal = respuestasPuntos[point.id] || '';

                      return (
                        <div
                          key={point.id}
                          style={{
                            backgroundColor: 'var(--panel-color)',
                            border: '1px solid rgba(234, 179, 8, 0.35)',
                            borderRadius: '12px',
                            padding: '1.1rem 1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <CountryFlag nombre={point.country} size="sm" />
                              <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-color)' }}>
                                {point.country}
                              </span>
                              <span style={{
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(234, 179, 8, 0.18)',
                                color: '#facc15',
                                border: '1px solid rgba(234, 179, 8, 0.35)'
                              }}>
                                {point.details?.tipo || 'Punto Parlamentario'}
                              </span>
                            </div>

                            <button
                              onClick={() => rejectSpeakingRequest(point.id)}
                              style={{
                                backgroundColor: 'transparent',
                                border: '1px solid var(--subborder-color)',
                                color: 'var(--muted-text)',
                                borderRadius: '6px',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                              title="Descartar este punto parlamentario"
                            >
                              <X size={13} /> Descartar
                            </button>
                          </div>

                          {/* Motivo o detalle del punto */}
                          <div style={{
                            backgroundColor: 'var(--card-header-bg)',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid var(--subborder-color)',
                            fontSize: '0.86rem',
                            color: 'var(--text-color)',
                            lineHeight: '1.45'
                          }}>
                            <strong>Motivo:</strong> {point.details?.tema || point.details?.motivo || 'Sin detalles especificados'}
                          </div>

                          {/* Respuestas Rápidas por Nota (Chips) */}
                          <div>
                            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                              Respuesta Rápida por Nota Oficial (1 Clic):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {[
                                { label: 'Mesa toma nota', text: 'La Mesa Directiva toma nota de su observación.' },
                                { label: 'Ha lugar', text: 'Ha lugar a su punto parlamentario.' },
                                { label: 'No ha lugar', text: 'No ha lugar a su punto en este momento.' },
                                { label: 'Se procede a solucionar', text: 'Se procede a solucionar la situación expuesta a la brevedad.' }
                              ].map(chip => (
                                <button
                                  key={chip.label}
                                  onClick={() => respondToPointWithNote(point, chip.text)}
                                  style={{
                                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                                    border: '1px solid rgba(59, 130, 246, 0.35)',
                                    color: '#60a5fa',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  💬 {chip.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Respuesta personalizada por nota */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <input
                              type="text"
                              placeholder="O escribe una respuesta personalizada por nota..."
                              value={inputVal}
                              onChange={e => setRespuestasPuntos(prev => ({ ...prev, [point.id]: e.target.value }))}
                              style={{
                                flex: 1,
                                backgroundColor: 'var(--card-header-bg)',
                                border: '1px solid var(--subborder-color)',
                                borderRadius: '8px',
                                padding: '0.45rem 0.75rem',
                                color: 'var(--text-color)',
                                fontSize: '0.8rem'
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && inputVal.trim()) {
                                  respondToPointWithNote(point, inputVal.trim());
                                  setRespuestasPuntos(prev => ({ ...prev, [point.id]: '' }));
                                }
                              }}
                            />
                            <button
                              disabled={!inputVal.trim()}
                              onClick={() => {
                                if (!inputVal.trim()) return;
                                respondToPointWithNote(point, inputVal.trim());
                                setRespuestasPuntos(prev => ({ ...prev, [point.id]: '' }));
                              }}
                              style={{
                                backgroundColor: 'var(--btn-bg)',
                                color: 'var(--btn-text)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.78rem',
                                fontWeight: '800',
                                cursor: inputVal.trim() ? 'pointer' : 'not-allowed',
                                opacity: inputVal.trim() ? 1 : 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                            >
                              <Send size={13} /> Responder
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── SECCIÓN PRIORITARIA: SOLICITUDES DE ENMIENDAS DE DELEGACIONES ── */}
              {enmiendasPropuestas.length > 0 && (
                <div style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.08)',
                  border: '1.5px solid rgba(168, 85, 247, 0.45)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 8px 24px rgba(168, 85, 247, 0.12)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <div style={{
                        backgroundColor: '#a855f7',
                        color: '#ffffff',
                        padding: '0.35rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#c084fc' }}>
                          Solicitudes de Enmiendas de Delegaciones ({enmiendasPropuestas.length})
                        </h3>
                        <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: 'var(--muted-text)' }}>
                          Propuestas de enmienda enviadas en tiempo real. Puedes incorporarlas a la resolución o descartarlas.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {enmiendasPropuestas.map(prop => (
                      <div
                        key={prop.id}
                        style={{
                          backgroundColor: 'var(--panel-color)',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          borderRadius: '12px',
                          padding: '1.1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <CountryFlag nombre={prop.paisProponente} size="sm" />
                            <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-color)' }}>
                              {prop.paisProponente || 'Delegación'}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '6px',
                              backgroundColor: prop.tipo === 'supresion' ? 'rgba(239, 68, 68, 0.18)' : (prop.tipo === 'adicion' ? 'rgba(34, 197, 94, 0.18)' : 'rgba(59, 130, 246, 0.18)'),
                              color: prop.tipo === 'supresion' ? '#ef4444' : (prop.tipo === 'adicion' ? '#22c55e' : '#60a5fa'),
                              border: '1px solid currentColor'
                            }}>
                              {prop.tipo?.toUpperCase()} · {prop.articuloNumero || 'Cláusula'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                if (agregarEnmiendaResolucion) {
                                  agregarEnmiendaResolucion({
                                    tipo: prop.tipo || 'modificacion',
                                    articuloId: prop.articuloId || null,
                                    articuloNumero: prop.articuloNumero || 'Artículo',
                                    paisProponente: prop.paisProponente || 'Delegación',
                                    textoOriginal: prop.textoOriginal || '',
                                    textoPropuesto: prop.textoPropuesto || '',
                                    justificacion: prop.justificacion || ''
                                  });
                                }
                                if (eliminarEnmiendaPropuesta) {
                                  eliminarEnmiendaPropuesta(prop.id);
                                }
                              }}
                              style={{
                                backgroundColor: '#22c55e',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.45rem 0.95rem',
                                fontSize: '0.8rem',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                              }}
                            >
                              <Check size={14} /> Incorporar a Resolución
                            </button>

                            <button
                              onClick={() => {
                                if (eliminarEnmiendaPropuesta) {
                                  eliminarEnmiendaPropuesta(prop.id);
                                }
                              }}
                              style={{
                                backgroundColor: 'transparent',
                                border: '1px solid var(--subborder-color)',
                                color: 'var(--muted-text)',
                                borderRadius: '8px',
                                padding: '0.45rem 0.75rem',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}
                              title="Descartar esta propuesta de enmienda"
                            >
                              <X size={13} /> Descartar
                            </button>
                          </div>
                        </div>

                        {/* Texto Original vs Propuesto */}
                        <div style={{
                          backgroundColor: 'var(--card-header-bg)',
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: '1px solid var(--subborder-color)',
                          fontSize: '0.86rem',
                          lineHeight: '1.45',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}>
                          {prop.textoOriginal && (
                            <div style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.9 }}>
                              <strong>Texto original:</strong> {prop.textoOriginal}
                            </div>
                          )}
                          {prop.textoPropuesto && (
                            <div style={{ color: '#22c55e', fontWeight: '600' }}>
                              <strong>Texto propuesto:</strong> {prop.textoPropuesto}
                            </div>
                          )}
                          {prop.justificacion && (
                            <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                              Motivación: {prop.justificacion}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SECCIÓN GENERAL: COLA DE ORADORES Y MOCIONES ── */}
              <div style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                    Cola de Solicitudes de Oradores y Mociones
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--muted-text)' }}>
                    Como Secretaría, puedes aprobar o denegar en vivo los turnos y mociones solicitados por las delegaciones.
                  </p>
                </div>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: otrasSolicitudes.length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                  color: otrasSolicitudes.length > 0 ? '#60a5fa' : '#22c55e',
                  border: `1px solid ${otrasSolicitudes.length > 0 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                }}>
                  {otrasSolicitudes.length} Turnos Pendientes
                </span>
              </div>

              {otrasSolicitudes.length === 0 ? (
                <div style={{
                  padding: '3rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--panel-color)',
                  borderRadius: '14px',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--muted-text)'
                }}>
                  <Zap size={36} style={{ opacity: 0.35, marginBottom: '0.6rem' }} />
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>No hay solicitudes de turno pendientes</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                    Cuando un delegado solicite turno GSL, Caucus o Moción en modo con aprobación, aparecerá aquí instantáneamente.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {otrasSolicitudes.map(req => (
                    <div
                      key={req.id}
                      style={{
                        backgroundColor: 'var(--panel-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1.1rem 1.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <CountryFlag nombre={req.country} size="sm" />
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            backgroundColor: req.speechType === 'GSL' ? 'rgba(59, 130, 246, 0.18)' : (req.speechType === 'CAUCUS' ? 'rgba(168, 85, 247, 0.18)' : 'rgba(234, 179, 8, 0.18)'),
                            color: req.speechType === 'GSL' ? '#60a5fa' : (req.speechType === 'CAUCUS' ? '#c084fc' : '#facc15'),
                            border: `1px solid ${req.speechType === 'GSL' ? '#3b82f644' : (req.speechType === 'CAUCUS' ? '#a855f744' : '#eab30844')}`
                          }}>
                            {req.speechType === 'GSL' ? 'Lista GSL' : (req.speechType === 'CAUCUS' ? 'Debate' : (req.details?.tipo === 'Caucus Moderado' ? 'Debate' : (req.details?.tipo || 'Moción')))}
                          </span>
                          <span style={{ fontWeight: '800', fontSize: '1.05rem' }}>
                            {req.country}
                          </span>
                        </div>

                        {req.details?.tema && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--muted-text)', marginTop: '4px' }}>
                            Tema: <strong style={{ color: 'var(--text-color)' }}>{req.details.tema}</strong>
                            {req.details.tiempoTotal ? ` • ${Math.round(req.details.tiempoTotal / 60)} min` : ''}
                            {req.details.tiempoOrador ? ` • ${req.details.tiempoOrador}s / orador` : ''}
                            {req.details.posicionProponente ? ` • Posición: ${req.details.posicionProponente}` : ''}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <button
                          onClick={() => approveSpeakingRequest(req)}
                          style={{
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.55rem 1.2rem',
                            fontSize: '0.85rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: '0 2px 10px rgba(34, 197, 94, 0.35)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Check size={16} /> Aprobar
                        </button>

                        <button
                          onClick={() => rejectSpeakingRequest(req.id)}
                          style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#ef4444',
                            borderRadius: '8px',
                            padding: '0.55rem 1rem',
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA: VOTACIONES (OFICIAL & MAPA MUNDIAL)            */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'VOTACION' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Sub-selector de Votación */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.75rem',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => setSubTabVotacion('OFICIAL')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabVotacion === 'OFICIAL' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabVotacion === 'OFICIAL' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Vote size={15} /> Sistema de Votación Oficial (Roll Call / Mayorías)
              </button>

              <button
                onClick={() => setSubTabVotacion('MAPA')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabVotacion === 'MAPA' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabVotacion === 'MAPA' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Map size={15} /> Mapa Mundial de Votación (Geopolítico)
              </button>
            </div>

            {/* Renderizado de Votación */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              overflow: 'hidden',
              minHeight: '580px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              {subTabVotacion === 'OFICIAL' && <VotacionOficial />}
              {subTabVotacion === 'MAPA' && <MapaVotacion />}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA: INFO Y GESTIÓN DE COMITÉ & WIDGETS             */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'INFO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Sub-selector de Widgets de Información y Gestión */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.75rem',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => setSubTabInfo('MATRIZ')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabInfo === 'MATRIZ' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabInfo === 'MATRIZ' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Globe size={15} /> Matriz de Asistencia & Quórum
              </button>

              <button
                onClick={() => setSubTabInfo('ANADIR')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabInfo === 'ANADIR' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabInfo === 'ANADIR' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <UserPlus size={15} /> Añadir Países a Oradores
              </button>

              <button
                onClick={() => setSubTabInfo('HISTORICO')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabInfo === 'HISTORICO' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabInfo === 'HISTORICO' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <BarChart3 size={15} /> Histórico de Delegaciones
              </button>

              <button
                onClick={() => setSubTabInfo('AGENDA')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabInfo === 'AGENDA' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabInfo === 'AGENDA' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Calendar size={15} /> Establecer Agenda y Temas
              </button>

              <button
                onClick={() => setSubTabInfo('IMPORTAR')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabInfo === 'IMPORTAR' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabInfo === 'IMPORTAR' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Users size={15} /> Importar Delegaciones
              </button>

              <button
                onClick={() => setSubTabInfo('MOCIONES')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabInfo === 'MOCIONES' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabInfo === 'MOCIONES' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <FileText size={15} /> Pizarra de Mociones
              </button>

              <button
                onClick={() => setSubTabInfo('RULETA')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabInfo === 'RULETA' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabInfo === 'RULETA' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <Dices size={15} /> Ruleta / Selector
              </button>
            </div>

            {/* Renderizado dinámico del Widget Activo */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              overflow: 'hidden',
              minHeight: '540px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              {subTabInfo === 'MATRIZ' && <MatrizPaises />}
              {subTabInfo === 'ANADIR' && <AnadirPaises />}
              {subTabInfo === 'HISTORICO' && <HistoricoDelegaciones />}
              {subTabInfo === 'AGENDA' && <EstablecerAgenda />}
              {subTabInfo === 'IMPORTAR' && <ImportarPaises />}
              {subTabInfo === 'MOCIONES' && <PizarraMociones />}
              {subTabInfo === 'RULETA' && <SelectorAleatorio />}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA 4: AJUSTES Y PERMISOS DE SALA                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'AJUSTES' && (
          <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                  Ajustes de Sala y Permisos de Delegados
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--muted-text)' }}>
                  Las modificaciones efectuadas por Secretaría se sincronizan de inmediato con el Chair y todas las delegaciones.
                </p>
              </div>
            </div>

            {/* Sección 1: Modo de Solicitud de Oradores (GSL y Caucus) */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '800', fontSize: '0.95rem' }}>
                  <Zap size={18} color="#3b82f6" /> Modo de Solicitudes a la Lista de Oradores (GSL)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                  Define cómo se procesan las peticiones de los delegados para incorporarse a la Lista General de Oradores.
                </div>
              </div>

              {/* 3 opciones selector en tarjetas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {/* Opción 1: Directas */}
                <div
                  onClick={() => updateRoomSettings({ speakerRequestMode: 'direct' })}
                  style={{
                    border: `1.5px solid ${roomSettings.speakerRequestMode === 'direct' ? '#22c55e' : 'var(--border-color)'}`,
                    backgroundColor: roomSettings.speakerRequestMode === 'direct' ? 'rgba(34, 197, 94, 0.12)' : 'var(--card-header-bg)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: roomSettings.speakerRequestMode === 'direct' ? '#22c55e' : 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Zap size={14} /> Directas
                    </span>
                    {roomSettings.speakerRequestMode === 'direct' && <CheckCircle2 size={16} color="#22c55e" />}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', lineHeight: '1.3' }}>
                    El delegado entra a la lista automáticamente sin confirmación de la Mesa.
                  </span>
                </div>

                {/* Opción 2: Requiere Aprobación */}
                <div
                  onClick={() => updateRoomSettings({ speakerRequestMode: 'approval' })}
                  style={{
                    border: `1.5px solid ${roomSettings.speakerRequestMode === 'approval' ? '#eab308' : 'var(--border-color)'}`,
                    backgroundColor: roomSettings.speakerRequestMode === 'approval' ? 'rgba(234, 179, 8, 0.12)' : 'var(--card-header-bg)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: roomSettings.speakerRequestMode === 'approval' ? '#eab308' : 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Hand size={14} /> Con Aprobación
                    </span>
                    {roomSettings.speakerRequestMode === 'approval' && <CheckCircle2 size={16} color="#eab308" />}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', lineHeight: '1.3' }}>
                    Requiere validación de la Mesa o de Secretaría.
                  </span>
                </div>

                {/* Opción 3: Deshabilitadas */}
                <div
                  onClick={() => updateRoomSettings({ speakerRequestMode: 'disabled' })}
                  style={{
                    border: `1.5px solid ${roomSettings.speakerRequestMode === 'disabled' ? '#ef4444' : 'var(--border-color)'}`,
                    backgroundColor: roomSettings.speakerRequestMode === 'disabled' ? 'rgba(239, 68, 68, 0.12)' : 'var(--card-header-bg)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: roomSettings.speakerRequestMode === 'disabled' ? '#ef4444' : 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Lock size={14} /> Deshabilitadas
                    </span>
                    {roomSettings.speakerRequestMode === 'disabled' && <CheckCircle2 size={16} color="#ef4444" />}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', lineHeight: '1.3' }}>
                    Bloquea solicitudes de turno desde la vista de delegado.
                  </span>
                </div>
              </div>
            </div>

            {/* Sección 2: Solicitudes de Caucus Moderado */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '800', fontSize: '0.95rem' }}>
                  <Clock size={18} color="#a855f7" /> Modo de Solicitudes a Caucus Moderado
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                  Control de incorporación de delegados a la lista durante un debate moderado.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {/* Opción 1: Directas */}
                <div
                  onClick={() => updateRoomSettings({ caucusRequestMode: 'direct' })}
                  style={{
                    border: `1.5px solid ${roomSettings.caucusRequestMode === 'direct' ? '#22c55e' : 'var(--border-color)'}`,
                    backgroundColor: roomSettings.caucusRequestMode === 'direct' ? 'rgba(34, 197, 94, 0.12)' : 'var(--card-header-bg)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: roomSettings.caucusRequestMode === 'direct' ? '#22c55e' : 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Zap size={14} /> Directas
                    </span>
                    {roomSettings.caucusRequestMode === 'direct' && <CheckCircle2 size={16} color="#22c55e" />}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', lineHeight: '1.3' }}>
                    Ingreso automático a la lista de Caucus.
                  </span>
                </div>

                {/* Opción 2: Requiere Aprobación */}
                <div
                  onClick={() => updateRoomSettings({ caucusRequestMode: 'approval' })}
                  style={{
                    border: `1.5px solid ${roomSettings.caucusRequestMode === 'approval' ? '#eab308' : 'var(--border-color)'}`,
                    backgroundColor: roomSettings.caucusRequestMode === 'approval' ? 'rgba(234, 179, 8, 0.12)' : 'var(--card-header-bg)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: roomSettings.caucusRequestMode === 'approval' ? '#eab308' : 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Hand size={14} /> Con Aprobación
                    </span>
                    {roomSettings.caucusRequestMode === 'approval' && <CheckCircle2 size={16} color="#eab308" />}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', lineHeight: '1.3' }}>
                    La Mesa o Secretaría autoriza cada turno.
                  </span>
                </div>

                {/* Opción 3: Deshabilitadas */}
                <div
                  onClick={() => updateRoomSettings({ caucusRequestMode: 'disabled' })}
                  style={{
                    border: `1.5px solid ${roomSettings.caucusRequestMode === 'disabled' ? '#ef4444' : 'var(--border-color)'}`,
                    backgroundColor: roomSettings.caucusRequestMode === 'disabled' ? 'rgba(239, 68, 68, 0.12)' : 'var(--card-header-bg)',
                    borderRadius: '10px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '800', color: roomSettings.caucusRequestMode === 'disabled' ? '#ef4444' : 'var(--text-color)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Lock size={14} /> Deshabilitadas
                    </span>
                    {roomSettings.caucusRequestMode === 'disabled' && <CheckCircle2 size={16} color="#ef4444" />}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted-text)', lineHeight: '1.3' }}>
                    Peticiones bloqueadas durante el Caucus.
                  </span>
                </div>
              </div>
            </div>

            {/* Sección 3: Permisos y Capacidades de Delegados */}
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '800', fontSize: '0.95rem' }}>
                <Shield size={18} color="#10b981" /> Permisos y Capacidades de Delegados
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                {/* Toggle Notas entre Delegados */}
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Mail size={15} /> Notas entre Delegaciones
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>Permite pajes privados entre delegados</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowDelegateNotes}
                    onChange={e => updateRoomSettings({ allowDelegateNotes: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#22c55e' }}
                  />
                </div>

                {/* Toggle Notas a la Mesa */}
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Landmark size={15} /> Notas a la Mesa (Chair)
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>Permite mensajes directos a la Mesa</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowChairNotes}
                    onChange={e => updateRoomSettings({ allowChairNotes: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#22c55e' }}
                  />
                </div>

                {/* Toggle Proponer Mociones */}
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileText size={15} /> Proponer Mociones y Puntos
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>Permite formular mociones desde su panel</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowMotions}
                    onChange={e => updateRoomSettings({ allowMotions: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#22c55e' }}
                  />
                </div>

                {/* Toggle Votación en Vivo */}
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Vote size={15} /> Votación Telemática en Vivo
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted-text)' }}>Permite emitir voto en votaciones activas</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={roomSettings.allowLiveVoting}
                    onChange={e => updateRoomSettings({ allowLiveVoting: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#22c55e' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA 5: GESTIÓN DE CONEXIONES                        */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'CONEXIONES' && (
          <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                  Dispositivos y Delegaciones Conectadas ({connectedPeers.length})
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--muted-text)' }}>
                  Monitor de conexiones en vivo en tiempo real con capacidad de expulsión.
                </p>
              </div>
            </div>

            {connectedPeers.length === 0 ? (
              <div style={{
                padding: '4rem 1.5rem',
                textAlign: 'center',
                backgroundColor: 'var(--panel-color)',
                borderRadius: '14px',
                border: '1px dashed var(--border-color)',
                color: 'var(--muted-text)'
              }}>
                <Users size={36} style={{ opacity: 0.35, marginBottom: '0.6rem' }} />
                <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>No hay dispositivos conectados</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {connectedPeers.map(peer => (
                  <div
                    key={peer.peerId}
                    style={{
                      backgroundColor: 'var(--panel-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '0.9rem 1.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        boxShadow: '0 0 8px #22c55e'
                      }} />
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>
                          {peer.country || 'Sin Identificador'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)' }}>
                          ID: {peer.peerId.substring(0, 10)}... • Rol: {peer.role}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        backgroundColor: peer.role === 'secretariat' ? 'rgba(59, 130, 246, 0.15)' : (peer.role === 'backroom' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(34, 197, 94, 0.15)'),
                        color: peer.role === 'secretariat' ? '#60a5fa' : (peer.role === 'backroom' ? '#fb923c' : '#4ade80')
                      }}>
                        {peer.role?.toUpperCase()}
                      </span>

                      <button
                        onClick={() => {
                          if (confirm(`¿Deseas expulsar de la sesión a ${peer.country || peer.peerId}?`)) {
                            kickPeer(peer.peerId);
                          }
                        }}
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#ef4444',
                          borderRadius: '6px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <UserX size={14} /> Expulsar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* PESTAÑA: MONITOR DE DEBATE & AÑADIR PAÍSES              */}
        {/* ═══════════════════════════════════════════════════════ */}
        {activeTab === 'DEBATE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Sub-selector de Debate */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.75rem',
              overflowX: 'auto'
            }}>
              <button
                onClick={() => setSubTabDebate('MONITOR')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabDebate === 'MONITOR' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabDebate === 'MONITOR' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Users size={15} /> Monitor de Colas (GSL & Caucus)
              </button>

              <button
                onClick={() => setSubTabDebate('ANADIR')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: subTabDebate === 'ANADIR' ? 'var(--btn-bg)' : 'var(--card-header-bg)',
                  color: subTabDebate === 'ANADIR' ? 'var(--btn-text)' : 'var(--muted-text)',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <UserPlus size={15} /> Añadir Países a Colas
              </button>
            </div>

            {/* Contenido según subtab */}
            {subTabDebate === 'ANADIR' ? (
              <div style={{
                backgroundColor: 'var(--panel-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                overflow: 'hidden',
                minHeight: '540px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}>
                <AnadirPaises />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Tarjeta Lista General GSL */}
                <div style={{
                  backgroundColor: 'var(--panel-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Users size={16} color="#c084fc" /> Lista General de Oradores ({oradoresGSL.length})
                    </div>
                    <button
                      onClick={() => setSubTabDebate('ANADIR')}
                      style={{
                        backgroundColor: 'rgba(168, 85, 247, 0.15)',
                        border: '1px solid rgba(168, 85, 247, 0.35)',
                        color: '#c084fc',
                        borderRadius: '6px',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <UserPlus size={12} /> Añadir Oradores
                    </button>
                  </div>

                  {oradoresGSL.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                      Lista GSL vacía
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {oradoresGSL.map((o, idx) => (
                        <div
                          key={o.id || idx}
                          style={{
                            backgroundColor: idx === 0 ? 'rgba(34, 197, 94, 0.12)' : 'var(--card-header-bg)',
                            border: `1px solid ${idx === 0 ? 'rgba(34, 197, 94, 0.35)' : 'var(--border-color)'}`,
                            borderRadius: '8px',
                            padding: '0.6rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: idx === 0 ? '#22c55e' : 'rgba(255,255,255,0.08)',
                              color: idx === 0 ? '#ffffff' : 'var(--muted-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: '800'
                            }}>
                              {idx + 1}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <CountryFlag bandera={o.bandera} nombre={o.nombre} size="sm" />
                              <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{o.nombre}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {idx === 0 && (
                              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#22c55e' }}>
                                EN TURNO
                              </span>
                            )}
                            <button
                              onClick={() => removerOrador(o.id || o.nombre)}
                              title="Remover de la lista"
                              aria-label="Remover de la lista"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--muted-text)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: '4px'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tarjeta Caucus Moderado */}
                <div style={{
                  backgroundColor: 'var(--panel-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ fontWeight: '800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Clock size={16} color="#fb923c" /> Caucus Moderado ({oradoresCaucus.length})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {oradoresCaucus.length > 0 && (
                        <button
                          onClick={avanzarOradorCaucus}
                          style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.35)',
                            color: '#22c55e',
                            borderRadius: '6px',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <SkipForward size={12} /> Avanzar
                        </button>
                      )}
                      <button
                        onClick={() => setSubTabDebate('ANADIR')}
                        style={{
                          backgroundColor: 'rgba(249, 115, 22, 0.15)',
                          border: '1px solid rgba(249, 115, 22, 0.35)',
                          color: '#fb923c',
                          borderRadius: '6px',
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <UserPlus size={12} /> Añadir Oradores
                      </button>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '800',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: caucusActivo.activo ? 'rgba(34, 197, 94, 0.15)' : 'rgba(113, 113, 122, 0.15)',
                        color: caucusActivo.activo ? '#22c55e' : '#a1a1aa'
                      }}>
                        {caucusActivo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  {caucusActivo.activo && caucusActivo.tema && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-text)' }}>
                      Tema: <strong>{caucusActivo.tema}</strong>
                    </div>
                  )}

                  {oradoresCaucus.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted-text)', fontSize: '0.82rem' }}>
                      No hay oradores en Caucus
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {oradoresCaucus.map((o, idx) => (
                        <div
                          key={o.id || idx}
                          style={{
                            backgroundColor: idx === 0 ? 'rgba(168, 85, 247, 0.12)' : 'var(--card-header-bg)',
                            border: `1px solid ${idx === 0 ? 'rgba(168, 85, 247, 0.35)' : 'var(--border-color)'}`,
                            borderRadius: '8px',
                            padding: '0.6rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: idx === 0 ? '#a855f7' : 'rgba(255,255,255,0.08)',
                              color: idx === 0 ? '#ffffff' : 'var(--muted-text)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.72rem',
                              fontWeight: '800'
                            }}>
                              {idx + 1}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <CountryFlag bandera={o.bandera} nombre={o.nombre} size="sm" />
                              <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{o.nombre}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {idx === 0 && (
                              <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c084fc' }}>
                                EN TURNO
                              </span>
                            )}
                            <button
                              onClick={() => removerOradorCaucus(o.id || o.nombre)}
                              title="Remover del caucus"
                              aria-label="Remover del caucus"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--muted-text)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: '4px'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SecretariatView;
