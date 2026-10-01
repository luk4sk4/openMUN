import React, { useState, useEffect, useRef } from 'react';
import { 
  Megaphone, 
  Send, 
  AlertCircle, 
  MessageSquare, 
  LogOut, 
  Radio, 
  FileText, 
  Users, 
  Clock, 
  CheckCircle2, 
  Sliders, 
  Key, 
  Volume2, 
  Download, 
  Trash2, 
  Check, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Bell, 
  CheckSquare, 
  Square, 
  Coffee, 
  Printer, 
  BatteryCharging, 
  ShieldCheck, 
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Building2,
  LayoutDashboard,
  Filter,
  Info,
  AlertTriangle,
  Plus,
  Globe,
  Mic,
  Search,
  X,
  ListOrdered,
  LayoutGrid,
  SkipForward,
  Timer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useP2P } from '../../context/P2PContext';
import { useSession } from '../../context/SessionContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import AccessibilityModal from '../modals/AccessibilityModal';
import OpenMunLogo from '../common/OpenMunLogo';
import LanguageSelector from '../common/LanguageSelector';
import CountryFlag from '../common/CountryFlag';
import EmptyState from '../common/EmptyState';
import MatrizPaises from '../widgets/MatrizPaises';
import { playEmergencyPulse, playChimeAlert } from '../../utils/audioAlerts';
import conferenceService from '../../services/conferenceService';
import ConferenceBanner from '../common/ConferenceBanner';
import useTopBarOverflow from '../../hooks/useTopBarOverflow';
import {
  formatearMensajeAviso,
  correspondeAviso,
  obtenerOpcionesDestino,
  obtenerEtiquetaDestino,
  ignorarAviso,
  obtenerAvisosIgnorados,
  puedeBorrarAviso
} from '../../utils/announcementHelpers';
import MensajeriaComite from '../messaging/MensajeriaComite';
import MensajeriaConferencia from '../messaging/MensajeriaConferencia';

const StaffView = ({ isLight: propIsLight, onExit }) => {
  const { t } = useTranslation();
  const { isLight: contextIsLight, toggleThemeMode } = useAccessibility();
  const isLight = propIsLight !== undefined ? propIsLight : contextIsLight;
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);

  // Hook para detectar overflow en la cabecera de Staff y compactar logo si es necesario
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
    agregarOrador,
    removerOrador,
    vaciarOradoresGSL,
    agregarOradorCaucus,
    removerOradorCaucus,
    avanzarOradorCaucus,
    vaciarOradoresDebate,
    ejecutarAccion,
    aplicarEstadoExterno
  } = useSession();

  const {
    roomId,
    notes,
    sendNote,
    remoteSessionState,
    leaveRoom,
    announcements,
    broadcastAnnouncement,
    deleteAnnouncement,
    connectedPeers,
    registerSessionHandlers,
    setViewMode
  } = useP2P();

  // Estados y gestión de retorno / volver atrás
  const [volverMenuOpen, setVolverMenuOpen] = useState(false);
  const volverMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (volverMenuRef.current && !volverMenuRef.current.contains(e.target)) {
        setVolverMenuOpen(false);
      }
    };
    if (volverMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [volverMenuOpen]);

  const confIdActiva = typeof window !== 'undefined' ? localStorage.getItem('openmun_current_conf_id') : null;
  const isLocalTab = typeof window !== 'undefined' && (new URLSearchParams(window.location.search).get('local') === 'true' || Boolean(window.opener));
  const hasMultipleDestinations = Boolean(confIdActiva) || isLocalTab;

  const handleNavigateBack = (destination) => {
    setVolverMenuOpen(false);
    // Limpiar parámetros de modo en URL para evitar quedar atrapado en staff
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      let changed = false;
      ['mode', 'local'].forEach(p => {
        if (url.searchParams.has(p)) {
          url.searchParams.delete(p);
          changed = true;
        }
      });
      if (changed) {
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);
      }
    }

    if (destination === 'close') {
      if (typeof window !== 'undefined') {
        window.close();
      }
      return;
    }

    if (leaveRoom) {
      leaveRoom();
    }

    if (destination === 'conference') {
      if (confIdActiva) {
        window.dispatchEvent(new CustomEvent('openmun_navigate_view', {
          detail: { view: 'conference', confId: confIdActiva, mode: 'explore' }
        }));
      }
      if (setViewMode) setViewMode('conference');
      return;
    }

    if (onExit) {
      onExit();
    } else if (setViewMode) {
      setViewMode('chair');
    }
  };

  const handleClickVolver = () => {
    if (hasMultipleDestinations) {
      setVolverMenuOpen(prev => !prev);
    } else {
      handleNavigateBack('chair');
    }
  };

  // Sincronización bidireccional inmediata con motor P2P / Host
  useEffect(() => {
    if (registerSessionHandlers) {
      registerSessionHandlers({
        onSyncState: (state) => aplicarEstadoExterno?.(state),
        onSessionAction: (accion, payload) => ejecutarAccion?.(accion, payload)
      });
    }
  }, [registerSessionHandlers, aplicarEstadoExterno, ejecutarAccion]);

  const [activeTab, setActiveTab] = useState('AVISOS_COMITE'); // 'AVISOS_COMITE' | 'MENSAJERIA_COMITE' | 'COMUNICACION_CONF' | 'MONITOR_SALA'

  // Sub-pestaña dentro de Monitor de Sala: 'GSL' | 'CAUCUS' | 'MATRIZ' | 'AMBAS'
  const [monitorSubTab, setMonitorSubTab] = useState('GSL');
  const [busquedaGSL, setBusquedaGSL] = useState('');
  const [busquedaCaucus, setBusquedaCaucus] = useState('');

  // Formulario de emisión de avisos de comité (WebSockets)
  const [tituloAviso, setTituloAviso] = useState('');
  const [textoAviso, setTextoAviso] = useState('');
  const [prioridadAviso, setPrioridadAviso] = useState('general'); // 'general' | 'urgente' | 'logistica' | 'receso' | 'documento'
  const [destinoAviso, setDestinoAviso] = useState('ALL');

  // Formulario de comunicación con conferencia (Base de Datos)
  const [tituloAvisoConf, setTituloAvisoConf] = useState('');
  const [textoAvisoConf, setTextoAvisoConf] = useState('');
  const [prioridadAvisoConf, setPrioridadAvisoConf] = useState('info');
  const [destinoAvisoConf, setDestinoAvisoConf] = useState('STAFF_ALL'); // 'STAFF_ALL' | 'SECRETARIA' | 'GLOBAL'
  const [enviandoConf, setEnviandoConf] = useState(false);

  // Formulario de mensajería (notas de sala)
  const [destinatarioNota, setDestinatarioNota] = useState('CHAIR');
  const [textoNota, setTextoNota] = useState('');
  const [tipoNota, setTipoNota] = useState('paje'); // 'paje' | 'logistica' | 'urgente' | 'general'
  const [filtroNotas, setFiltroNotas] = useState('TODAS'); // 'TODAS' | 'RECIBIDAS' | 'ENVIADAS'
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Avisos de Conferencia (Base de Datos)
  const [avisosDB, setAvisosDB] = useState([]);
  const [comitesConf, setComitesConf] = useState([]);
  const confActiva = conferenceService.obtenerSesionActiva();
  const [comiteAsignado, setComiteAsignado] = useState(() => (roomId && roomId !== 'TODOS') ? roomId : ((typeof window !== 'undefined' ? localStorage.getItem('openmun_current_comite_id') : null) || 'TODOS'));
  const currentComiteId = comiteAsignado === 'TODOS' ? null : comiteAsignado;
  const currentComiteNombre = currentComiteId ? (comitesConf.find(c => String(c.id).toLowerCase() === String(currentComiteId).toLowerCase())?.nombre || null) : null;
  const avisosDBFiltrados = avisosDB.filter(av => correspondeAviso(av, { role: 'staff', currentComiteId, currentComiteNombre, comites: comitesConf }));

  const [descartadosAnnouncements, setDescartadosAnnouncements] = useState(() => obtenerAvisosIgnorados());

  useEffect(() => {
    if (roomId && roomId !== 'TODOS') {
      setComiteAsignado(roomId);
    }
  }, [roomId]);

  useEffect(() => {
    const handleSessionCleared = () => {
      setComiteAsignado(roomId || 'TODOS');
      setDescartadosAnnouncements(obtenerAvisosIgnorados());
      setAvisosDB([]);
    };
    window.addEventListener('openmun_session_cleared', handleSessionCleared);
    return () => window.removeEventListener('openmun_session_cleared', handleSessionCleared);
  }, [roomId]);

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

  // Cargar comités de la conferencia para selector completo de destinos
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
        const res = await conferenceService.obtenerAvisos(confActiva.id, currentComiteId, 'staff', currentComiteNombre);
        if (res && Array.isArray(res.avisos)) {
          setAvisosDB(res.avisos);
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
  }, [confActiva?.id]);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const state = remoteSessionState || {};
  const comisionNombre = sessionNombreComite || state.comision || state.nombreComite || 'Comité MUN';
  const oradoresGSL = (sessionOradoresCola && sessionOradoresCola.length > 0) ? sessionOradoresCola : (state.oradoresCola || []);
  const oradoresCaucus = (sessionOradoresCaucus && sessionOradoresCaucus.length > 0) ? sessionOradoresCaucus : (state.oradoresCaucus || []);
  const caucusActivo = (sessionCaucusActivo && sessionCaucusActivo.activo !== undefined) ? sessionCaucusActivo : (state.caucusActivo || {});
  const oradorActual = caucusActivo.activo
    ? (oradoresCaucus.length > 0 ? oradoresCaucus[0] : null)
    : (oradoresGSL.length > 0 ? oradoresGSL[0] : null);
  const paises = (sessionPaises && sessionPaises.length > 0) ? sessionPaises : (state.paises || []);
  const agendaSesion = sessionAgendaSesion || state.agendaSesion || {};

  // Estadísticas rápidas de quórum para monitor de sala
  const totalPaises = paises.length;
  const presentesCount = paises.filter(p => p.estatus === 'Presente' || p.estatus === 'Presente y Votando').length;

  // Filtrar notas relevantes para el staff (incluye notas a la Mesa / Chair y comunicados de sala)
  const notasStaff = notes.filter(n => {
    if (!n || !n.text) return false;
    const dest = (n.to || '').toUpperCase().trim();
    return (
      dest === 'STAFF' ||
      dest === 'CHAIR' ||
      dest === 'MESA' ||
      dest === 'MESA DE PRESIDENCIA' ||
      dest === 'TODOS' ||
      dest === 'ALL' ||
      n.fromRole === 'staff' ||
      n.fromRole === 'chair' ||
      n.from === 'Staff' ||
      n.from === 'Mesa de Presidencia' ||
      n.type === 'logistica' ||
      n.type === 'paje'
    );
  });

  const notasFiltradas = notasStaff.filter(n => {
    if (filtroNotas === 'RECIBIDAS') return !n.isOutgoing && n.fromRole !== 'staff';
    if (filtroNotas === 'ENVIADAS') return n.isOutgoing || n.fromRole === 'staff';
    return true;
  });

  const handleCambiarEstado = (nuevoTipo) => {
    cambiarTipoSesion(nuevoTipo);
    if (confActiva?.id && roomId) {
      conferenceService.actualizarEstadoComite(confActiva.id, roomId, { tipo_sesion: nuevoTipo });
    }
    showToast(`Estado del comité cambiado a ${nuevoTipo.toUpperCase()}`);
  };

  const handleEmitirAviso = (e) => {
    e.preventDefault();
    if (!tituloAviso.trim() && !textoAviso.trim()) return;

    broadcastAnnouncement({
      title: tituloAviso.trim() || 'Aviso Oficial de Staff',
      text: textoAviso.trim(),
      priority: prioridadAviso,
      target: destinoAviso,
      senderRole: 'staff',
      senderName: `Staff (${comisionNombre})`
    });

    setTituloAviso('');
    setTextoAviso('');
    showToast('Aviso emitido en tiempo real a las delegaciones del comité');
  };

  const handleEnviarAvisoConferencia = async (e) => {
    e.preventDefault();
    if (!textoAvisoConf.trim()) return;
    if (!confActiva?.id) {
      showToast('No hay conferencia activa vinculada');
      return;
    }
    setEnviandoConf(true);
    try {
      const mensajeCompleto = tituloAvisoConf.trim()
        ? `${tituloAvisoConf.trim()}: ${textoAvisoConf.trim()}`
        : textoAvisoConf.trim();

      await conferenceService.crearAviso(confActiva.id, {
        comite_id: destinoAvisoConf === 'GLOBAL' ? '' : destinoAvisoConf,
        emisor: `Staff (${comisionNombre})`,
        tipo: prioridadAvisoConf === 'urgente' ? 'urgente' : 'alerta',
        mensaje: mensajeCompleto
      });

      const res = await conferenceService.obtenerAvisos(confActiva.id);
      if (res?.avisos) setAvisosDB(res.avisos);

      setTituloAvisoConf('');
      setTextoAvisoConf('');
      showToast('Mensaje transmitido a la Base de Datos de la conferencia');
    } catch (err) {
      showToast('Error al enviar comunicado a la conferencia');
    } finally {
      setEnviandoConf(false);
    }
  };

  const handleEnviarNota = (e) => {
    e.preventDefault();
    if (!textoNota.trim()) return;

    sendNote(destinatarioNota, textoNota.trim(), tipoNota);
    setTextoNota('');
    showToast(`Nota enviada a ${destinatarioNota}`);
  };

  const paisesDisponiblesGSL = paises.filter(p =>
    p.nombre?.toLowerCase().includes(busquedaGSL.toLowerCase()) &&
    !oradoresGSL.some(o => (typeof o === 'string' ? o : o.nombre)?.toLowerCase() === p.nombre?.toLowerCase())
  );

  const paisesDisponiblesCaucus = paises.filter(p =>
    p.nombre?.toLowerCase().includes(busquedaCaucus.toLowerCase()) &&
    !oradoresCaucus.some(o => (typeof o === 'string' ? o : o.nombre)?.toLowerCase() === p.nombre?.toLowerCase())
  );

  const handleAñadirOradorGSL = (p) => {
    agregarOrador(p);
    setBusquedaGSL('');
    showToast(`${p.nombre} añadido a la cola GSL`);
  };

  const handleRemoverOradorGSL = (idOrName, e) => {
    if (e) e.stopPropagation();
    removerOrador(idOrName);
    showToast('Delegación removida de la cola GSL');
  };

  const handleVaciarGSL = () => {
    if (oradoresGSL.length === 0) return;
    vaciarOradoresGSL();
    showToast('Cola GSL vaciada');
  };

  const handleAñadirOradorCaucus = (p) => {
    agregarOradorCaucus(p);
    setBusquedaCaucus('');
    showToast(`${p.nombre} añadido a la cola del Caucus`);
  };

  const handleRemoverOradorCaucus = (idOrName, e) => {
    if (e) e.stopPropagation();
    removerOradorCaucus(idOrName);
    showToast('Delegación removida de la cola del Caucus');
  };

  const handleAvanzarCaucus = () => {
    if (oradoresCaucus.length === 0) return;
    avanzarOradorCaucus();
    showToast('Turno de caucus avanzado al siguiente orador');
  };

  const handleVaciarCaucus = () => {
    if (oradoresCaucus.length === 0) return;
    vaciarOradoresDebate();
    showToast('Cola del Caucus vaciada');
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgente':
        return { bg: 'rgba(239, 68, 68, 0.18)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', label: 'URGENTE' };
      case 'logistica':
        return { bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.4)', text: '#60a5fa', label: 'LOGÍSTICA' };
      case 'receso':
        return { bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)', text: '#34d399', label: 'RECESO' };
      case 'documento':
        return { bg: 'rgba(168, 85, 247, 0.18)', border: 'rgba(168, 85, 247, 0.4)', text: '#c084fc', label: 'DOCUMENTACIÓN' };
      case 'general':
      default:
        return { bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)', text: '#fbbf24', label: 'GENERAL' };
    }
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

      {/* ── Cabecera de Staff ── */}
      <header
        ref={headerRef}
        className="openmun-topbar"
        style={{
          padding: isExtraCompact ? '0.5rem 1rem' : '0.85rem 1.5rem',
          backgroundColor: 'var(--header-bg)',
          borderBottom: '1px solid var(--subborder-color)',
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
          {/* Botón Volver Atrás con soporte de destinos múltiples */}
          <div style={{ position: 'relative', flexShrink: 0 }} ref={volverMenuRef}>
            <button
              onClick={handleClickVolver}
              className="openmun-topbar-btn"
              style={{
                backgroundColor: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--subborder-color)',
                borderRadius: '8px',
                color: 'var(--text-color)',
                padding: isExtraCompact ? '0.35rem 0.6rem' : '0.45rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
              title={t('views.staff.back', 'Volver atrás')}
            >
              <ArrowLeft size={16} />
              {!isExtraCompact && <span className="btn-text">{t('common.back', 'Volver')}</span>}
              {hasMultipleDestinations && <ChevronDown size={13} style={{ opacity: 0.7 }} />}
            </button>

            {volverMenuOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                width: '230px',
                backgroundColor: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(22, 27, 39, 0.96)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid var(--subborder-color)',
                borderRadius: '10px',
                boxShadow: isLight ? '0 10px 30px rgba(0,0,0,0.12)' : '0 16px 36px rgba(0,0,0,0.5)',
                padding: '0.4rem',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                {confIdActiva && (
                  <button
                    onClick={() => handleNavigateBack('conference')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '7px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--text-color)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = isLight ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Building2 size={15} color="#8b5cf6" />
                    <span>{t('views.staff.backToConference', 'Volver a Conferencia')}</span>
                  </button>
                )}
                <button
                  onClick={() => handleNavigateBack('chair')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--text-color)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = isLight ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <LayoutDashboard size={15} color="#3b82f6" />
                  <span>{t('views.staff.backToDashboard', 'Volver a Modo Mesa (Chair)')}</span>
                </button>
                {isLocalTab && (
                  <button
                    onClick={() => handleNavigateBack('close')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '7px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = isLight ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <X size={15} color="#ef4444" />
                    <span>{t('views.staff.closeTab', 'Cerrar esta pestaña')}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <OpenMunLogo height={32} isLight={isLight} showText={!isLogoCompact} />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'nowrap' }}>
              <span style={{ fontWeight: '800', fontSize: isExtraCompact ? '0.9rem' : '1.05rem', letterSpacing: '-0.01em', color: '#10b981', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t('views.staff.title', 'Consola de Staff y Logística')}
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                Sala: {roomId}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--muted-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {comisionNombre} · {t('views.staff.subtitle', 'Gestión de sala, avisos oficiales, pajes y asistencia operativa')}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Selector de Estado de Sesión en Vivo para Staff */}
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
                  onClick={() => handleCambiarEstado(s.id)}
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

          <button
            onClick={() => setIsAccessModalOpen(true)}
            className="openmun-topbar-btn"
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '8px',
              color: 'var(--text-color)',
              padding: '0.45rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Eye size={14} /> <span className="btn-text">{t('accessibility.title', 'Accesibilidad')}</span>
          </button>

          <button
            onClick={toggleThemeMode}
            className="openmun-topbar-btn"
            style={{
              background: 'transparent',
              border: '1px solid var(--subborder-color)',
              borderRadius: '8px',
              color: 'var(--text-color)',
              padding: '0.45rem 0.65rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={isLight ? t('header.darkMode', "Modo Oscuro") : t('header.lightMode', "Modo Claro")}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <LanguageSelector showIcon={false} />

          <button
            onClick={() => {
              if (confirm(t('views.staff.confirmExit', '¿Deseas salir de la Consola de Staff?'))) {
                handleNavigateBack(confIdActiva ? 'conference' : 'chair');
              }
            }}
            className="openmun-topbar-btn"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '0.45rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title={t('common.exit', 'Salir')}
          >
            <LogOut size={14} /> <span className="btn-text">{t('common.exit', 'Salir')}</span>
          </button>
        </div>
      </header>

      {/* Banner de Avisos Oficiales de la Conferencia y Sala */}
      <ConferenceBanner isLight={isLight} role="staff" comiteId={currentComiteId} comiteNombre={currentComiteNombre} comites={comitesConf} />

      {/* ── Barra de Pestañas de Navegación (4 Secciones) ── */}
      <nav className="openmun-nav-tabs-container openmun-nav-tabs-list" style={{
        display: 'flex',
        gap: '0.4rem',
        padding: '0.65rem 1.5rem',
        backgroundColor: 'var(--card-header-bg)',
        borderBottom: '1px solid var(--subborder-color)',
        overflowX: 'auto'
      }}>
        {[
          { id: 'AVISOS_COMITE', icon: Megaphone, label: 'Avisos Comité', badge: visibleAnnouncements.length },
          { id: 'MENSAJERIA_COMITE', icon: MessageSquare, label: 'Mensajería Comité', badge: notasStaff.length },
          { id: 'COMUNICACION_CONF', icon: Globe, label: 'Comunicación Conferencia', badge: avisosDBFiltrados.length },
          { id: 'MONITOR_SALA', icon: Radio, label: 'Monitor Sala' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="openmun-nav-tab-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.05rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? 'var(--btn-bg)' : 'transparent',
                color: isActive ? 'var(--btn-text)' : 'var(--muted-text)',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : 'var(--subborder-color)',
                  color: isActive ? '#ffffff' : 'var(--text-color)',
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Toast de Feedback ── */}
      {feedbackToast && (
        <div style={{
          position: 'fixed',
          top: '70px',
          right: '24px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '0.65rem 1.15rem',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '0.85rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <Check size={16} /> {feedbackToast}
        </div>
      )}

      {/* ── Contenido Principal según Pestaña ── */}
      <main className="openmun-main-content" style={{ flex: 1, padding: '1.5rem', maxWidth: '1300px', width: '100%', margin: '0 auto' }}>

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 1: AVISOS COMITÉ (EMISIÓN & GESTIÓN WEBSOCKETS)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'AVISOS_COMITE' && (
          <div className="openmun-grid-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: '1.5rem' }}>
            {/* Formulario de Emisión de Aviso Local a la Sala */}
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
                <Megaphone size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  {t('views.staff.emitAnnouncement', 'Emitir Aviso a Delegaciones')}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted-text)', lineHeight: '1.4' }}>
                Los avisos emitidos aparecerán de inmediato en el titular y holder prioritario de todas las delegaciones conectadas a la sala.
              </p>

              <form onSubmit={handleEmitirAviso} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase' }}>
                    {t('views.staff.announcementTitle', 'Título del Aviso')}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Receso de 15 minutos / Entrega de Enmiendas"
                    value={tituloAviso}
                    onChange={e => setTituloAviso(e.target.value)}
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
                        onClick={() => setPrioridadAviso(cat.id)}
                        style={{
                          backgroundColor: prioridadAviso === cat.id ? 'rgba(16, 185, 129, 0.15)' : 'var(--card-header-bg)',
                          border: `1.5px solid ${prioridadAviso === cat.id ? '#10b981' : 'var(--subborder-color)'}`,
                          borderRadius: '8px',
                          padding: '0.5rem 0.4rem',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          color: prioridadAviso === cat.id ? 'var(--text-color)' : 'var(--muted-text)',
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
                    placeholder="Detalles sobre el aviso, hora límite, ubicación o instrucción de sala..."
                    value={textoAviso}
                    onChange={e => setTextoAviso(e.target.value)}
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

                <button
                  type="submit"
                  disabled={!tituloAviso.trim() && !textoAviso.trim()}
                  style={{
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    cursor: (tituloAviso.trim() || textoAviso.trim()) ? 'pointer' : 'not-allowed',
                    opacity: (tituloAviso.trim() || textoAviso.trim()) ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Send size={16} /> {t('views.staff.sendAnnouncementBtn', 'Emitir Aviso Oficial')}
                </button>
              </form>
            </div>

            {/* Listado de Avisos Activos en Sala (WebSockets) */}
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
                <Bell size={20} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                  Avisos Activos en Sala ({visibleAnnouncements.length})
                </h3>
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
                    Usa el formulario lateral para emitir un aviso en tiempo real a las delegaciones del comité.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {visibleAnnouncements.map((ann) => {
                    const badge = getPriorityBadge(ann.priority);
                    const esPropio = puedeBorrarAviso(ann, 'staff');
                    return (
                      <div
                        key={`ws_${ann.id}`}
                        style={{
                          backgroundColor: 'var(--card-header-bg)',
                          border: `1px solid ${badge.border}`,
                          borderLeft: `4px solid ${badge.text}`,
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
                              backgroundColor: 'rgba(16, 185, 129, 0.18)',
                              color: '#10b981',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              padding: '0.12rem 0.45rem',
                              borderRadius: '4px'
                            }}>
                              ⚡ Sala Local
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              backgroundColor: badge.bg,
                              color: badge.text,
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                              letterSpacing: '0.04em'
                            }}>
                              {badge.label}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                              De: <strong style={{ color: 'var(--text-color)' }}>{ann.senderName || 'Staff'}</strong>
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--muted-text)' }}>
                              • {new Date(ann.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            {esPropio && (
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
                              >
                                <Trash2 size={13} /> {t('avisos.deleteNotice', 'Eliminar')}
                              </button>
                            )}
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
                            {formatearMensajeAviso(ann.text)}
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

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 2: MENSAJERÍA COMITÉ (NOTAS & PAJES)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'MENSAJERIA_COMITE' && (
          <MensajeriaComite
            currentRole="staff"
            currentComiteId={currentComiteId}
            currentComiteNombre={currentComiteNombre}
            paises={paises}
            layout="split"
            showHeader={false}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 3: COMUNICACIÓN CONFERENCIA (BASE DE DATOS)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'COMUNICACION_CONF' && (
          <MensajeriaConferencia
            currentRole="staff"
            conferenciaId={confActiva?.id || (typeof window !== 'undefined' ? localStorage.getItem('openmun_current_conf_id') : null)}
            currentComiteId={currentComiteId}
            currentComiteNombre={currentComiteNombre}
            comites={comitesConf}
            initialAvisos={avisosDBFiltrados}
            layout="split"
            showHeader={false}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════
            PESTAÑA 4: MONITOR DE SALA (GSL, CAUCUS & MATRIZ DE PAÍSES)
           ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'MONITOR_SALA' && (() => {
          const renderGslQueue = (isCompact = false) => (
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              {/* Cabecera de la Cola GSL */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3b82f6',
                    flexShrink: 0
                  }}>
                    <Mic size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                      {t('timers.gslSpeakersList', 'Cola de la Lista de Oradores (GSL)')}
                    </h3>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                      {oradoresGSL.length} {oradoresGSL.length === 1 ? 'delegación en turno' : 'delegaciones en turno'}
                    </span>
                  </div>
                </div>

                {oradoresGSL.length > 0 && (
                  <button
                    type="button"
                    onClick={handleVaciarGSL}
                    style={{
                      background: 'none',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      borderRadius: '7px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease'
                    }}
                    title="Vaciar lista GSL"
                  >
                    <Trash2 size={13} /> {t('common.clearAll', 'Vaciar lista')}
                  </button>
                )}
              </div>

              {/* Buscador Rápido para Añadir País a GSL */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '9px',
                  padding: '0.45rem 0.8rem',
                  gap: '0.5rem'
                }}>
                  <Search size={15} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder={t('views.staff.addCountryGsl', 'Buscar delegación para añadir a la cola GSL...')}
                    value={busquedaGSL}
                    onChange={e => setBusquedaGSL(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-color)',
                      outline: 'none',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      width: '100%'
                    }}
                  />
                  {busquedaGSL && (
                    <button
                      type="button"
                      onClick={() => setBusquedaGSL('')}
                      style={{ background: 'none', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown sugerencias GSL */}
                {busquedaGSL.trim().length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '9px',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    zIndex: 40,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                  }}>
                    {paisesDisponiblesGSL.length === 0 ? (
                      <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--muted-text)', textAlign: 'center' }}>
                        {t('countries.noMatchingResults', 'Sin países coincidentes')}
                      </div>
                    ) : (
                      paisesDisponiblesGSL.slice(0, 8).map(p => (
                        <div
                          key={p.id || p.nombre}
                          onClick={() => handleAñadirOradorGSL(p)}
                          style={{
                            padding: '0.55rem 0.85rem',
                            fontSize: '0.86rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--subborder-color)',
                            color: 'var(--text-color)',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--card-header-bg)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <CountryFlag bandera={p.bandera} nombre={p.nombre} size="sm" />
                            <span style={{ fontWeight: '700' }}>{p.nombre}</span>
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: '800',
                            color: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            <Plus size={13} /> Añadir
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Lista Vertical de Oradores GSL */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                maxHeight: isCompact ? '480px' : '620px',
                overflowY: 'auto',
                paddingRight: '3px'
              }}>
                {oradoresGSL.length === 0 ? (
                  <EmptyState
                    icon={Mic}
                    title={t('views.staff.emptyGsl', 'Cola GSL vacía')}
                    description={t('views.staff.emptyGslDesc', 'No hay delegaciones en la Lista General de Oradores actualmente.')}
                    compact={true}
                  />
                ) : (
                  oradoresGSL.map((orador, index) => {
                    const esActual = index === 0;
                    const esSiguiente = index === 1;
                    const nombre = typeof orador === 'string' ? orador : orador.nombre;
                    const bandera = typeof orador === 'object' ? orador.bandera : null;
                    const id = (typeof orador === 'object' && orador.id) ? orador.id : nombre;

                    return (
                      <div
                        key={id || index}
                        style={{
                          backgroundColor: esActual
                            ? 'rgba(16, 185, 129, 0.08)'
                            : (esSiguiente ? 'rgba(59, 130, 246, 0.06)' : 'var(--card-header-bg)'),
                          border: `1px solid ${
                            esActual
                              ? 'rgba(16, 185, 129, 0.4)'
                              : (esSiguiente ? 'rgba(59, 130, 246, 0.35)' : 'var(--subborder-color)')
                          }`,
                          borderRadius: '12px',
                          padding: esActual ? '0.9rem 1.1rem' : '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.85rem',
                          boxShadow: esActual ? '0 4px 14px rgba(16, 185, 129, 0.12)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                          {/* Badge de posición */}
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: esActual
                              ? '#10b981'
                              : (esSiguiente ? '#3b82f6' : 'var(--subborder-color)'),
                            color: esActual || esSiguiente ? '#ffffff' : 'var(--muted-text)',
                            flexShrink: 0
                          }}>
                            #{index + 1}
                          </span>

                          <CountryFlag bandera={bandera} nombre={nombre} size={esActual ? 'md' : 'sm'} />

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{
                              fontWeight: esActual ? '800' : '700',
                              fontSize: esActual ? '1.05rem' : '0.92rem',
                              color: 'var(--text-color)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {nombre}
                            </div>
                            {esActual && (
                              <div style={{
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                color: '#10b981',
                                letterSpacing: '0.04em',
                                marginTop: '1px'
                              }}>
                                🎙️ EN TRIBUNA (ORADOR ACTUAL)
                              </div>
                            )}
                            {esSiguiente && (
                              <div style={{
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                color: '#3b82f6',
                                letterSpacing: '0.04em',
                                marginTop: '1px'
                              }}>
                                SIGUIENTE ORADOR
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleRemoverOradorGSL(id, e)}
                          title="Eliminar de la cola GSL"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--muted-text)',
                            cursor: 'pointer',
                            padding: '0.35rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.65,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.opacity = '0.65'; }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );

          const renderCaucusQueue = (isCompact = false) => (
            <div style={{
              backgroundColor: 'var(--panel-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.4rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.15rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}>
              {/* Cabecera de la Cola Caucus */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f59e0b',
                    flexShrink: 0
                  }}>
                    <Timer size={18} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800' }}>
                      {t('views.staff.caucusQueue', 'Cola de Oradores del Caucus')}
                    </h3>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted-text)', fontWeight: '600' }}>
                      {oradoresCaucus.length} {oradoresCaucus.length === 1 ? 'orador en lista' : 'oradores en lista'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {oradoresCaucus.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleAvanzarCaucus}
                        style={{
                          background: 'none',
                          border: '1px solid rgba(59, 130, 246, 0.35)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          borderRadius: '7px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                        title="Avanzar al siguiente orador del caucus"
                      >
                        <SkipForward size={13} /> {t('views.staff.nextSpeaker', 'Sig. Orador')}
                      </button>
                      <button
                        type="button"
                        onClick={handleVaciarCaucus}
                        style={{
                          background: 'none',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          color: '#ef4444',
                          borderRadius: '7px',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                        title="Vaciar cola de caucus"
                      >
                        <Trash2 size={13} /> {t('common.clearAll', 'Vaciar')}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Banner de Estado del Caucus */}
              {caucusActivo.activo ? (
                <div style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  borderRadius: '10px',
                  padding: '0.75rem 0.95rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '5px',
                      backgroundColor: '#f59e0b',
                      color: '#ffffff',
                      letterSpacing: '0.04em'
                    }}>
                      CAUCUS MODERADO ACTIVO
                    </span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted-text)', fontWeight: '700' }}>
                      {caucusActivo.tiempoTotal ? `${Math.round(caucusActivo.tiempoTotal / 60)} min total` : ''}
                      {caucusActivo.tiempoOrador ? ` • ${caucusActivo.tiempoOrador}s / orador` : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-color)', marginTop: '2px' }}>
                    Tema: {caucusActivo.tema || 'Sin tema especificado'}
                  </div>
                  {caucusActivo.proponente && (
                    <div style={{ fontSize: '0.76rem', color: 'var(--muted-text)' }}>
                      Proponente: <strong style={{ color: 'var(--text-color)' }}>{caucusActivo.proponente}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.9rem',
                  fontSize: '0.78rem',
                  color: 'var(--muted-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Info size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
                  <span>{t('views.staff.noCaucusActive', 'No hay un Caucus Moderado abierto en el comité actualmente.')}</span>
                </div>
              )}

              {/* Buscador Rápido para Añadir al Caucus */}
              <div style={{ position: 'relative' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--card-header-bg)',
                  border: '1px solid var(--subborder-color)',
                  borderRadius: '9px',
                  padding: '0.45rem 0.8rem',
                  gap: '0.5rem'
                }}>
                  <Search size={15} style={{ color: 'var(--muted-text)', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder={t('views.staff.addCountryCaucus', 'Buscar delegación para añadir a la cola del Caucus...')}
                    value={busquedaCaucus}
                    onChange={e => setBusquedaCaucus(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-color)',
                      outline: 'none',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      width: '100%'
                    }}
                  />
                  {busquedaCaucus && (
                    <button
                      type="button"
                      onClick={() => setBusquedaCaucus('')}
                      style={{ background: 'none', border: 'none', color: 'var(--muted-text)', cursor: 'pointer', padding: '2px' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Dropdown sugerencias Caucus */}
                {busquedaCaucus.trim().length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--panel-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '9px',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    zIndex: 40,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                  }}>
                    {paisesDisponiblesCaucus.length === 0 ? (
                      <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--muted-text)', textAlign: 'center' }}>
                        {t('countries.noMatchingResults', 'Sin países coincidentes')}
                      </div>
                    ) : (
                      paisesDisponiblesCaucus.slice(0, 8).map(p => (
                        <div
                          key={p.id || p.nombre}
                          onClick={() => handleAñadirOradorCaucus(p)}
                          style={{
                            padding: '0.55rem 0.85rem',
                            fontSize: '0.86rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid var(--subborder-color)',
                            color: 'var(--text-color)',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--card-header-bg)'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <CountryFlag bandera={p.bandera} nombre={p.nombre} size="sm" />
                            <span style={{ fontWeight: '700' }}>{p.nombre}</span>
                          </div>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: '800',
                            color: '#f59e0b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            <Plus size={13} /> Añadir
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Lista de Oradores del Caucus */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                maxHeight: isCompact ? '480px' : '620px',
                overflowY: 'auto',
                paddingRight: '3px'
              }}>
                {oradoresCaucus.length === 0 ? (
                  <EmptyState
                    icon={Timer}
                    title={t('views.staff.emptyCaucus', 'Cola del Caucus vacía')}
                    description={t('views.staff.emptyCaucusDesc', 'No hay delegaciones añadidas a la cola del debate moderado.')}
                    compact={true}
                  />
                ) : (
                  oradoresCaucus.map((orador, index) => {
                    const esActual = index === 0;
                    const esSiguiente = index === 1;
                    const nombre = typeof orador === 'string' ? orador : orador.nombre;
                    const bandera = typeof orador === 'object' ? orador.bandera : null;
                    const esProponente = typeof orador === 'object' && Boolean(orador.esProponenteUltimo || orador.proponente);
                    const id = (typeof orador === 'object' && orador.id) ? orador.id : nombre;

                    return (
                      <div
                        key={id || index}
                        style={{
                          backgroundColor: esActual
                            ? 'rgba(245, 158, 11, 0.08)'
                            : (esSiguiente ? 'rgba(245, 158, 11, 0.04)' : 'var(--card-header-bg)'),
                          border: `1px solid ${
                            esActual
                              ? 'rgba(245, 158, 11, 0.45)'
                              : (esSiguiente ? 'rgba(245, 158, 11, 0.3)' : 'var(--subborder-color)')
                          }`,
                          borderRadius: '12px',
                          padding: esActual ? '0.9rem 1.1rem' : '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.85rem',
                          boxShadow: esActual ? '0 4px 14px rgba(245, 158, 11, 0.12)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                          {/* Badge de posición */}
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: '900',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            backgroundColor: esActual
                              ? '#f59e0b'
                              : (esSiguiente ? 'rgba(245, 158, 11, 0.7)' : 'var(--subborder-color)'),
                            color: esActual || esSiguiente ? '#ffffff' : 'var(--muted-text)',
                            flexShrink: 0
                          }}>
                            #{index + 1}
                          </span>

                          <CountryFlag bandera={bandera} nombre={nombre} size={esActual ? 'md' : 'sm'} />

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <span style={{
                                fontWeight: esActual ? '800' : '700',
                                fontSize: esActual ? '1.05rem' : '0.92rem',
                                color: 'var(--text-color)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {nombre}
                              </span>
                              {esProponente && (
                                <span style={{
                                  fontSize: '0.64rem',
                                  fontWeight: '800',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(245, 158, 11, 0.18)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.35)'
                                }}>
                                  PROPONENTE
                                </span>
                              )}
                            </div>
                            {esActual && (
                              <div style={{
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                color: '#f59e0b',
                                letterSpacing: '0.04em',
                                marginTop: '1px'
                              }}>
                                🎙️ EN TURNO DE CAUCUS
                              </div>
                            )}
                            {esSiguiente && (
                              <div style={{
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                color: 'var(--muted-text)',
                                letterSpacing: '0.04em',
                                marginTop: '1px'
                              }}>
                                SIGUIENTE ORADOR
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleRemoverOradorCaucus(id, e)}
                          title="Eliminar de la cola del Caucus"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--muted-text)',
                            cursor: 'pointer',
                            padding: '0.35rem',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.65,
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.opacity = '1'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-text)'; e.currentTarget.style.opacity = '0.65'; }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              {/* ── 1. CABECERA RESUMEN DE SALA EN TIEMPO REAL ── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem'
              }}>
                {/* Card 1: Estado del Debate */}
                <div style={{
                  backgroundColor: 'var(--panel-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.15rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.08)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: caucusActivo.activo ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: caucusActivo.activo ? '#f59e0b' : '#3b82f6',
                    flexShrink: 0
                  }}>
                    {caucusActivo.activo ? <Timer size={24} /> : <Radio size={24} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('views.staff.debatePhase', 'Fase del Debate')}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-color)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {caucusActivo.activo ? 'Caucus Moderado' : 'Lista General (GSL)'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {caucusActivo.activo
                        ? (caucusActivo.tema ? `Tema: "${caucusActivo.tema}"` : 'Debate moderado activo')
                        : (agendaSesion?.temaActual || agendaSesion?.topico || comisionNombre || 'Sesión en curso')}
                    </div>
                  </div>
                </div>

                {/* Card 2: Orador Actual en Tribuna */}
                <div style={{
                  backgroundColor: 'var(--panel-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.15rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.08)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: oradorActual ? 'rgba(16, 185, 129, 0.15)' : 'var(--card-header-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: oradorActual ? '#10b981' : 'var(--muted-text)',
                    flexShrink: 0
                  }}>
                    <Mic size={24} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('views.staff.currentSpeaker', 'Orador Actual')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '2px' }}>
                      {oradorActual ? (
                        <>
                          <CountryFlag bandera={oradorActual.bandera} nombre={oradorActual.nombre || oradorActual} size="sm" />
                          <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {oradorActual.nombre || oradorActual}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                          {t('views.staff.noSpeakerInPodium', 'Sin orador en tribuna')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: oradorActual ? '#10b981' : 'var(--muted-text)', marginTop: '2px', fontWeight: '600' }}>
                      {oradorActual ? (caucusActivo.activo ? 'En uso de la palabra (Caucus)' : 'En uso de la palabra (GSL)') : 'Esperando asignación'}
                    </div>
                  </div>
                </div>

                {/* Card 3: Quórum & Conexiones */}
                <div style={{
                  backgroundColor: 'var(--panel-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '1.15rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.08)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8b5cf6',
                    flexShrink: 0
                  }}>
                    <Globe size={24} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t('views.staff.quorumAndRoom', 'Quórum & Conexiones')}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-color)', marginTop: '2px' }}>
                      {presentesCount} / {totalPaises} {t('common.present', 'Presentes')}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted-text)', marginTop: '2px' }}>
                      {connectedPeers.length} {t('views.staff.connectedDelegations', 'delegaciones conectadas')}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. BARRA DE NAVEGACIÓN DE SUB-PESTAÑAS DE MONITOR ── */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                backgroundColor: 'var(--card-header-bg)',
                padding: '0.5rem',
                borderRadius: '12px',
                border: '1px solid var(--subborder-color)'
              }}>
                {[
                  { id: 'GSL', label: 'Cola GSL', icon: Mic, badge: oradoresGSL.length, color: '#3b82f6' },
                  { id: 'CAUCUS', label: 'Cola Caucus', icon: Timer, badge: oradoresCaucus.length, color: '#f59e0b' },
                  { id: 'MATRIZ', label: 'Matriz de Países', icon: Globe, badge: paises.length, color: '#10b981' },
                  { id: 'AMBAS', label: 'Ambas Colas (GSL + Caucus)', icon: LayoutGrid, color: '#8b5cf6' }
                ].map(opt => {
                  const Icon = opt.icon;
                  const isSelected = monitorSubTab === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMonitorSubTab(opt.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.6rem 1.15rem',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isSelected ? 'var(--btn-bg)' : 'transparent',
                        color: isSelected ? 'var(--btn-text)' : 'var(--muted-text)',
                        fontWeight: isSelected ? '800' : '600',
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={16} />
                      <span>{opt.label}</span>
                      {opt.badge !== undefined && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '1px 7px',
                          borderRadius: '10px',
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--subborder-color)',
                          color: isSelected ? 'inherit' : 'var(--text-color)'
                        }}>
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ── 3. VISTAS SEGÚN SUB-PESTAÑA SELECCIONADA ── */}
              {monitorSubTab === 'GSL' && renderGslQueue(false)}

              {monitorSubTab === 'CAUCUS' && renderCaucusQueue(false)}

              {monitorSubTab === 'MATRIZ' && (
                <div style={{
                  backgroundColor: 'var(--panel-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                }}>
                  <MatrizPaises />
                </div>
              )}

              {monitorSubTab === 'AMBAS' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '1.5rem',
                  alignItems: 'start'
                }}>
                  {renderGslQueue(true)}
                  {renderCaucusQueue(true)}
                </div>
              )}
            </div>
          );
        })()}
      </main>
    </div>
  );
};

export default StaffView;
